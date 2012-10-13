var Process = require("./process"),
    Util = require("util"),
    ast_walker    = Process.ast_walker,
    ast_add_scope = Process.ast_add_scope,
    ast_lift_variables = Process.ast_lift_variables,
    MAP           = Process.MAP;

// Manual debug utilities
var debugging = 1;
function dump(obj) {
    return "\n" + Util.inspect(obj, false, null, true);
}
function debug(text, obj, showStack) {
    if (!debugging) return;
    console.log(text, dump(obj));
    if (showStack) {
        var stack = new Error("Stack print").stack
        console.log( stack )
    }
    return obj;
}

// Returns true if function body yields
function body_yields(body) {
    var yields = false;

    function skip() { return ["block"]};

    MAP(body, function(b) {
        var w = ast_walker(), walk = w.walk;
        w.with_walkers({
            "function": skip,
            "defun": skip,
            "yield": function() { yields = true; return this; },
            
        }, function(){
            return walk(["block", body]);
        });
    });

    return yields;
}


function Block(number) {
    this.number = number;
    this.stmts = [];
    this.stitchCallbacks = [];
}
Block.prototype.stmt = function (stmt) {
    this.stmts.push(stmt);
    return stmt;
}
Block.prototype.onStitch = function (cb) {
    this.stitchCallbacks.push(cb);
}
Block.prototype.stitch = function () {
    var func;
    while (func = this.stitchCallbacks.shift()) {
        func();
    }
}

function backport_unimplemented() {
    throw ("backport not implemented for " + this[0] + " structure");
}

function backport_yield_body(body) {
    var curBlock;
    var blocks = [];
    
    // Starts a new block and returns the current (not new) one.
    // New is then available on curBlock
    function newBlock() {
        curBlock = new Block(blocks.length);
        blocks.push(curBlock);
        return curBlock;
    }
    newBlock();
    
    var stmtContinue = ["continue", "yield_loop"];
    
    // buyo is used for jump / "Program Counter" management
    // buyo.set()   sets the jump target
    // buyo.jump()  executes jump (set PC & jump)
    // buyo.jump_implicit()
    //              sets PC but does not jump
    // buyo.jump_if(cond)
    //              jumps to target if cond is true.
    //              cond is expression AST.
    function buyo() {
        var cntSet = yc_counter();
        var target;
        var api = {
            set: function (block) {
                target = block || newBlock();
            },
            // Only sets jump target, assumes implicit jump (by next commands)
            jump_implicit: function() {
                curBlock.stmt(cntSet);
                curBlock.onStitch(function() {
                    cntSet.to(target.number);
                });
            },
            jump: function () {
                api.jump_implicit();
                curBlock.stmt(stmtContinue);
            },
            jump_if: function(cond) {
                curBlock.stmt(["if", cond, ["block", [cntSet, stmtContinue]]]);
                curBlock.onStitch(function() {
                    cntSet.to(target.number);
                });
            }
        };
        return api;
    }
    
    // Returns a jump structure pointing to <to>
    // <to> can be also set later by calling <returnvalue>.to(<newTo>)
    function yc_counter(to) {
        var goto = ["num", to];
        var ret = ["stat",
                   ["assign",
                    true,
                    ["name", "$yc_counter"],
                    goto]];
        ret.to = function(to) {
            goto[1] = to;
        }
        return ret;
    }
    
    function not(cond) {
        return ["unary-prefix", "!", cond];
    }
    
    function flatten(body) {
        MAP(body, function (bpart) {
            var w = ast_walker(), walk = w.walk;
            w.with_walkers({
                // TODO: This is nice todo list of unimplemented structures
                "try": backport_unimplemented,
                "throw": backport_unimplemented,
                "switch": backport_unimplemented,
                "break": backport_unimplemented,
                "continue": backport_unimplemented,
                "for-in": backport_unimplemented,
                "do": backport_unimplemented,
                "return": backport_unimplemented,
                "with": backport_unimplemented,
                
                "while": function (cond, block) {
                    var loop_start = buyo();
                    var loop_end = buyo();
                    loop_start.set();
                    cond = walk(cond);
                    loop_end.jump_if(not(cond));
                    block = walk(block);
                    loop_start.jump();
                    loop_end.set();
                    return [this[0], cond, block];
                },
                "for": function (init, cond, step, block) {
                    var loop_start = buyo();
                    var loop_end = buyo();
                    init = walk(init);
                    loop_start.set();
                    cond = walk(cond);
                    loop_end.jump_if(not(cond));
                    block = walk(block);
                    step = walk(step);
                    curBlock.stmt(step);
                    loop_start.jump();
                    loop_end.set();
                    return [this[0], init, cond, step, block];
                    
                },
                "yield": function (expr) {
                    var pastReturn = buyo();
                    expr = walk(expr);
                    pastReturn.jump_implicit();
                    curBlock.stmt(["return", expr]);
                    pastReturn.set();
                    return ["name", "$yc_value"];
                },
                "if": function (cond, t, e) {
                    var if_end = buyo();
                    var else_start = buyo();
                    cond = walk(cond);
                    else_start.jump_if(not(cond));
                    t = walk(t);
                    if_end.jump();
                    else_start.set();
                    e = walk(e);
                    if_end.set();
                    return [this[0], cond, t, e];
                },
                "stat": function (stat) {
                    stat = walk(stat);
                    curBlock.stmt(stat);
                    return [this[0], stat];
                }
            }, function () {
                return walk(bpart);
            });
        });
    };
    flatten(body);

    // Add end which always throws a StopIteration
    // The problem is that this needs a new global -- StopIteration
    // and we can't generally introduce new globals.
    curBlock.stmt(["throw", ["string", "StopIteration"]]);
    
    
    // Stitch to switch case
    var sc = [];
    var i;
    for (i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        block.stitch();
        var piece = [ ['num', i],
                      block.stmts ];
        sc.push(piece);
    }
    
    // In case of flatten logic bugs, add a emergency break (default case)
    // so program does not get into eternal loop.
    sc.push( [ null, [ [ "throw", ["string", "Emergency break"] ] ] ] );
    
    var switchcase =
         [ [ "switch",
             [ 'name', '$yc_counter' ],
             sc
           ] 
         ];
         
    var looper = [ [ 'label',
                     'yield_loop',
                     [ 'while',
                       [ 'name', 'true'],
                       [ 'block',
                         switchcase ] ] ] ];
    return looper;
}

function backport_yield_function(name, args, body) {
    var yc_name = "$yc_counter",
        vardefs = [],
        substitute_body;
    
    // Grab the vardefs from the top of the body
    // [1] undoes "toplevel"
    body = ast_lift_variables(["toplevel", body], true)[1]; 
    if (body[0][0] == "var") {
        // Replace lifted vardef with (possible) value assignments
        // while picking variable names to substitute function
        vardefs = MAP(body.shift()[1], function(def) {
            if (def[1]) {
                body.unshift([ "stat",
                               [ "assign",
                                 true,
                                 [ "name", def[0] ],
                                 def[1] ] ] );
            }
            return [def[0], null];
        });
    }
    
    // Add and initialize "yield counter" variable
    vardefs.push([yc_name, ["num", 0]]);
    // And uninitialized last yield value
    vardefs.push(["$yc_value", null]);

    var send_function = [ [ 'stat',
                            [ 'assign',
                              true,
                              [ 'name', '$yc_value' ],
                              [ 'name', 'value' ] ] ],
                          [ 'try',
                            [ [ 'return',
                                [ 'call',
                                  [ 'dot',
                                    [ 'name', 'this' ],
                                    'next' ],
                                  [] ] ] ],
                            null,
                            [ [ 'stat',
                                [ 'assign',
                                  true,
                                  [ 'name', '$yc_value' ],
                                  [ 'name', 'undefined' ] ] ]
                              ] ] ];


    substitute_body =  [ [ "var", vardefs ],
                         [ "return",
                           [ "object",
                             [ [ "send", 
                                 ["defun",
                                  null,
                                  ["value"],
                                  send_function ] ],
                               [ "next",
                                 [ "defun",
                                   null,
                                   [],
                                   backport_yield_body(body) ] ] ]
                           ]
                         ]
                       ];

    return [this[0], name, args, substitute_body];
};

// Backport yield command
function backport_yield(ast) {
    var w = ast_walker(),
        walk = w.walk;
    
    function check_yield(name, args, body) {
        var ret;
        if (body_yields(body)) {
            ret = backport_yield_function.apply(this, arguments);
        } else {
            ret = this;
        }
        return ret;
    }
    
    return w.with_walkers({
        "function": check_yield,
        "defun": check_yield
    }, function () {
        return walk(ast);
    });
    
    return ast;
}

// Generic backport
function backport(ast) {
    ast = backport_yield(ast);
    return ast;
}

exports.backport = backport;
exports.backport_yield = backport_yield;

