function dut(a) {
    while (a) {
        a += yield a;
    }
}

var g = dut(1);
assert.equal(g.next(), 1);
assert.equal(g.send(1), 2);
assert.equal(g.send(1), 3);
assert.equal(g.send(7), 10);
assert.throws(function() {g.send(-10)}, /StopIteration/);
