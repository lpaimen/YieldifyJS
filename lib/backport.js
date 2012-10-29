var Process = require("./process"),
    Util = require("util"),
    ast_walker    = Process.ast_walker,
    ast_add_scope = Process.ast_add_scope,
    ast_lift_variables = Process.ast_lift_variables,
    MAP           = Process.MAP,
    parse         = require("./parse-js").parse;

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



// Generates ast from code. Replaces names, expressions and statements
function ast_gen(code, names, expressions, statements) {

    // Replaces all keys with values from str
    // Note: does not behave well if value contains another key
    function str_replace(str, blocks) {
        for (var i in blocks) {
            str = str.replace(new RegExp(i, "g"), blocks[i]);
        }
        return str;
    }
    // Replaces regexps in ast with new ast
    function replace_ast_regexp(ast, expressions, statements) {
        var w = ast_walker(), walk = w.walk;
        return w.with_walkers( {
                "regexp": function(rx, mods){
                    if (expressions[rx]) {
                        return expressions[rx];
                    } else {
                        return this;
                    }
                },
                "stat": function(stat) {
                    if (stat[0] == "regexp" && statements[stat[1]]) {
                        return statements[stat[1]];
                    } else {
                        return [this[0], walk(stat)];
                    }
                }
            }, function() {
                return walk(ast);        
            });
    }
    if (names) {
        code = str_replace(code, names);
    }
    var ast = parse(code);
    ast = replace_ast_regexp(ast, expressions || {}, statements || {});
    return ast[1][0]; // pick first statement from toplevel
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

// Return send function body ast
function send_body() {
    var code1 = "var old_yc = $yc_value;";
    var code2 = "$yc_value = function() { return value; };";
    var code3 = "try { /return/; } finally { $yc_value = old_yc }";
    // Returning block 
    return [ ast_gen(code1),
             ast_gen(code2),
             ast_gen(code3,
                     null,
                     { "return": [ "return", ast_gen("this.next()") ] } ) ];    
}

// Return throw function body ast
function throw_body() {
    var code1 = "var old_yc = $yc_value";
    var code2 = "$yc_value = function() { throw value; }";
    var code3 = "try { /return/; } finally { $yc_value = old_yc }";
    return [ ast_gen(code1),
             ast_gen(code2),
             ast_gen(code3,
                     null,
                     { "return": [ "return", ast_gen("this.next()") ] } ) ];
}

// Constructor body ast
function ctor_body(vardefs, send_body, next_body, throw_body) {
    
    return  [ [ "var", vardefs ],
                 [ "return",
                   [ "object",
                     [ [ "send", 
                         [ "defun",
                          null,
                          ["value"],
                          send_body ] ],
                       [ "throw",
                         [ "defun",
                           null,
                           ["value"],
                           throw_body ] ],
                       [ "next",
                         [ "defun",
                           null,
                           [],
                           next_body ] ] ]
                   ]
                 ]
               ]
}

// Assign statement ast
function assign_stat(name, value) {
    return ast_gen("NAME = /value/", { NAME: name}, {value: value});
}

function stmt_continue() {
    return ["continue", "yield_loop"];
}

function guard_if() {
    var vars = {
        GUARD: "$y_guard",
        TMP_VAR: "$y_top",
        COUNTER: "$yc_counter",
        PCSTACK: "$y_pcstack" };
        
    var code = "if (GUARD.length) {"
             + "    var TMP_VAR = GUARD[GUARD.length - 1];"
             + "    if ((COUNTER < TMP_VAR[0] || COUNTER > TMP_VAR[1])) {"
             + "        PCSTACK.push(COUNTER);"
             + "        COUNTER = TMP_VAR[1];"
             + "    }"
             + "}";
    
    return ast_gen(code, vars, null, {continue_yield: stmt_continue() });
}

function array_push(name, value) {
    return ast_gen("ARRAY.push(/value/)", { ARRAY: name }, {value: value });
}
function array_pop(name) {
    return ast_gen("ARRAY.pop()", {ARRAY: name});
}

function rename_name(ast, from, to) {
    // todo: Should not rename if to is declared into scope
    return MAP(ast, function(b) {
        var w = ast_walker(), walk = w.walk;
        return w.with_walkers({
                "name": function (name) {
                    if (name == from) {
                        return [this[0], to];
                    } else {
                        return this;
                    }
                }
            }, function(){
                return walk(b);
            });
        });
}

function yield_body(body) {
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
                target.onStitch(function() {
                    cntSet.to(target.number);
                });
            },
            counter: cntSet,
            // Only sets jump target, assumes implicit jump (by next commands)
            jump_implicit: function() {
                curBlock.stmt(assign_stat("$yc_counter", cntSet));
            },
            jump: function () {
                api.jump_implicit();
                curBlock.stmt(stmt_continue());
            },
            jump_if: function(cond) {
                curBlock.stmt([ "if",
                                cond,
                                [ "block",
                                  [ assign_stat("$yc_counter", cntSet),
                                    stmt_continue() ]]]);
            }
        };
        return api;
    }
    
    // Returns ast structure pointing to <to>
    // <to> can be also set later by calling <returnvalue>.to(<newTo>)
    function yc_counter(to) {
        var goto = ["num", to];
        goto.to = function(to) {
            goto[1] = to;
        }
        return goto;
    }
    
    function not(cond) {
        return ["unary-prefix", "!", cond];
    }
    
    var final_state = buyo();
    var return_state = buyo();
    var throw_state = buyo();
    function flatten(body) {
        MAP(body, function (bpart) {
            var w = ast_walker(), walk = w.walk;
            w.with_walkers({
                // TODO: This is nice todo list of unimplemented structures
                "switch": backport_unimplemented,
                "break": backport_unimplemented,
                "continue": backport_unimplemented,
                "for-in": backport_unimplemented,
                "do": backport_unimplemented,
                "with": backport_unimplemented,
                "name": function (name) {
                    if (name == "eval") {
                        // Cherry-pick eval() function out
                        // todo: should check scope
                        backport_unimplemented.apply([name]);
                    }
                    return this;
                },
                
                "throw": function (expr) {
                    expr = walk(expr);
                    return curBlock.stmt([this[0], expr]);
                },
                "return": function (expr) {
                    expr = walk(expr);
                    curBlock.stmt(assign_stat("$y_return", expr));
                    return_state.jump();
                },
                "try": function (t, c, f) {
                    var try_start = buyo(),
                        catch_start = buyo(),
                        finally_start = buyo(),
                        finally_after = buyo();

                    var guard = [ try_start.counter,
                                  finally_start.counter,
                                  catch_start.counter ];
                                  
                    try_start.set();
                    curBlock.stmt(array_push("$y_guard", ["array", guard]));
                    t = MAP(t, walk);
                    finally_after.jump();

                    catch_start.set();
                    if (c != null) {
                        c[1] = rename_name(c[1], c[0], "$y_exception");
                        c = [c[0], MAP(c[1], walk) ];
                    } else {
                        // No catch block
                        throw_state.jump();
                    }
                    finally_after.jump();

                    finally_start.set();
                    curBlock.stmt(array_pop("$y_guard"));
                    f = (f != null ? MAP(f, walk) : null);
                    curBlock.stmt(ast_gen("$yc_counter = $y_pcstack.pop()"));
                    curBlock.stmt(stmt_continue());

                    finally_after.set();
                    return [this[0], t, c, f];
                },               
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
                    // ast_gen generates statement, [1] picks the expression
                    return ast_gen("$yc_value()")[1];
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
    final_state.set();
    curBlock.stmt(["throw", ["string", "StopIteration"]]);

    // "special" states.
    // Jumping to special enables guard to execute possible finally blocks

    // "special" return state, returns $y_return value
    return_state.set();
    final_state.jump_implicit();
    curBlock.stmt(["return", ["name", ["$y_return"]]]);
    
    // "special" throw state, throws $y_exception
    throw_state.set();
    final_state.jump_implicit();
    curBlock.stmt(["throw", ["name", ["$y_exception"]]]);
    
    
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
         [ "switch",
             [ 'name', '$yc_counter' ],
             sc ];
         
    var code = "yield_loop: do {"
             + "/guard_if/;"
             + "/switchcase/;"
             + "} while(true);";
    var looper = ast_gen(code,
                         null,
                         null,
                         { switchcase: switchcase,
                           guard_if: guard_if() });

    var code = "LABEL: do {"
             + "    try {"
             + "        /body/;"
             + "    } catch (EXCEPTION) {"
             + "        if (EXCEPTION !== 'StopIteration' && GUARD.length) {"
             + "            E_LAST = EXCEPTION;"
             + "            COUNTER = GUARD[GUARD.length - 1][2];"
             + "            continue LABEL;"
             + "        } else {"
             + "            COUNTER = /end/;"
             + "            throw EXCEPTION;"
             + "        }"
             + "    }"
             + "} while(true)";
    var vars = { LABEL: 'catcher',
                 YIELDING: '$y_yielding',
                 CAUGHT: '$y_caught',
                 EXCEPTION: '$y_e',
                 E_LAST: '$y_exception',
                 GUARD: '$y_guard',
                 PCSTACK: '$y_pcstack',
                 COUNTER: '$yc_counter'};
                 
    var catcher = ast_gen(code, vars,
                          { end: final_state.counter},
                          { body: looper });

    return catcher;
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
                body.unshift( assign_stat(def[0], def[1]) );
            }
            return [def[0], null];
        });
    }
    
    // Add and initialize "yield counter" variable
    vardefs.push([yc_name, ["num", 0]]);
    // And uninitialized last yield value
    vardefs.push(["$yc_value", ast_gen("function noop() {}")]);
    
    // Guard is array of [from, to, catch] items, where
    // from  is start of a guardable block
    // to    is end+1 of guardable block (finally clause or place to continue)
    // catch is start of catch block, which is inside the guarded area
    vardefs.push(["$y_guard", ["array", []]]);

    vardefs.push(["$y_pcstack", ["array", []]]);
    
    vardefs.push(["$y_return"]);
    
    // Exception contains the latest thrown exception
    vardefs.push(["$y_exception"]);

    var newbody = ctor_body(vardefs,
                            send_body(),
                            [ yield_body(body)],
                            throw_body() );

    return [this[0], name, args, newbody];
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

