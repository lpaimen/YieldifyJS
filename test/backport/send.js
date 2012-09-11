function dut(value) {
    yield value + yield value;
}

var g = dut(1337);
assert.equal(g.next(), 1337);
assert.equal(g.send(42), 1337 + 42);
assert.throws(function() { g.send(52) }, /StopIteration/);
assert.throws(function() { g.next(52) }, /StopIteration/);
