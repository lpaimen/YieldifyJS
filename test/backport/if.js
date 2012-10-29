function dut() {
    var value = yield;
    if (value) {
        yield value;
    } else {
        yield "ELSE";
    }
}

var g = dut();
assert.equal(g.next(), undefined);
assert.equal(g.send("then"), "then");
assert.throws(function() { g.send(999); }, /StopIteration/);

g = dut();
assert.equal(g.next(), undefined);
assert.equal(g.send(false), "ELSE");
assert.throws(function() { g.send(999); }, /StopIteration/);

g = dut();
assert.equal(g.next(), undefined);
assert.equal(g.next(), "ELSE");
assert.throws(function() { g.send(999); }, /StopIteration/);

function dut2() {
    var value = yield;
    if (value) {
        yield value;
    }
}
g = dut2();
assert.equal(g.next(), undefined);
assert.equal(g.send("then"), "then");
assert.throws(function() { g.next() }, /StopIteration/);

g = dut2();
assert.equal(g.next(), undefined);
assert.throws(function() { g.send() }, /StopIteration/);
assert.throws(function() { g.next() }, /StopIteration/);

