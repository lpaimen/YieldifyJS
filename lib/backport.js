var Process = require("./process"),
    ast_walker    = Process.ast_walker,
    ast_add_scope = Process.ast_add_scope,
    ast_lift_variables = Process.ast_lift_variables,
    MAP           = Process.MAP;

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

function backport_yield_body(body) {
    return body;
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
            return def[0];
        });
    }
    
    // Add and initialize "yield counter" variable
    vardefs.push([yc_name, ["num", 0]]);

    substitute_body =  [ [ "var", vardefs ],
                         [ "return",
                           [ "object",
                             [ [ "next",
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
