function dut() {
    if ("then" == yield;) {
        yield "THEN";
    } else {
        yield "ELSE";
    }
}

var g = dut();
assert.equal(g.next(), undefined);
assert.equal(g.send("then"), "THEN");
assert.throws(function() { g.send(999); }, /StopIteration/);

g = dut();
assert.equal(g.next(), undefined);
assert.equal(g.send("else"), "ELSE");
assert.throws(function() { g.send(999); }, /StopIteration/);

g = dut();
assert.equal(g.next(), undefined);
assert.equal(g.next(), "ELSE");
assert.throws(function() { g.send(999); }, /StopIteration/);

function dut2() {
    if ("then" == yield;) {
        yield "THEN";
    }
}
g = dut2();
assert.equal(g.next(), undefined);
assert.equal(g.send("then"), "THEN");
assert.throws(function() { g.next() }, /StopIteration/);

g = dut2();
assert.equal(g.next(), undefined);
assert.throws(function() { g.send() }, /StopIteration/);
assert.throws(function() { g.next() }, /StopIteration/);

