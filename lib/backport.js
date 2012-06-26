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
    var ret,
        yc_name = "$yc_counter",
        vardefs,
        substitute_body,
        mangled_body;
    
    // Grab the vardefs from the top of the body
    // [1] undoes "toplevel"
    body = ast_lift_variables(["toplevel", body], true)[1]; 
    if (body[0][0] == "var") {
        vardefs = body.shift();
    } else {
        vardefs = ["var", []];
    }
    
    // Add and initialize "yield counter" variable
    vardefs[1].push([yc_name, ["num", 0]]);

    mangled_body = backport_yield_body(body);

    substitute_body = [ vardefs,
                         [ "return",
                           [ "object",
                             [ [ "next",
                                 [ "defun", null, [], mangled_body ] ] ]
                           ]
                         ]
                       ];

    ret = [this[0], name, args, substitute_body];

    return ret;
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
