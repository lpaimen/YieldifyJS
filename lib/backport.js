var Process = require("./process"),
    ast_walker    = Process.ast_walker,
    ast_add_scope = Process.ast_add_scope,
    MAP           = Process.MAP;

function backport_yield(ast) {
    return ast;
}


function backport(ast) {
    ast = backport_yield(ast);
    return ast;
}

exports.backport = backport;
exports.backport_yield = backport_yield;
