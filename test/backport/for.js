function dut() {
    for (var i = 0; i < 3; i++) {
        yield i;
    }
}
var g = dut();
assert.equal(g.next(), 0);
assert.equal(g.next(), 1);
assert.equal(g.next(), 2);
assert.throws(function() { g.next() }, /StopIteration/);

