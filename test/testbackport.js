#! /usr/bin/env node

var uglify = require("../uglify-js"),
    jsp = uglify.parser,
    backport = uglify.backport.backport,
    gen_code = uglify.uglify.gen_code,
    assert = require("assert"),
    fs = require("fs");
    
var testDir = "backport";

var scripts = fs.readdirSync(testDir);
for (var i in scripts) {
    var file = scripts[i];
    runFile(file);
}

function runFile(test) {
    var code = fs.readFileSync(testDir + "/" + file, "utf8");
    var ast = jsp.parse(code);
    var ported = backport(ast);
    var portedCode = gen_code(ported, {beautify: true});
    // Throws in errors
    try {
        // Ugly :)
        eval(portedCode);
        console.log("Test " + test + " OK");
    } catch (e) {
        console.log("Test " + test + " failed.");
        console.log(e.toString());

    }
}


