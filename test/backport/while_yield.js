function dut() {
    var i = 0;
    while (i < 4) {
        yield i;
        i++;
    }
}

var g = dut();
assert.equal(g.next(), 0);
assert.equal(g.next(), 1);
assert.equal(g.next(), 2);
assert.equal(g.next(), 3);
assert.throws(function() { g.next(); }, /StopIteration/);

