function dut() {
    var i = "initial";
    do {
        i = yield i;
    } while (i);
}

var g = dut();
assert.equal(g.next(), "initial");
assert.throws(function() { g.next(); }, /StopIteration/);

g = dut();
assert.equal(g.next(), "initial");
assert.equal(g.send("hello"), "hello");
assert.throws(function() { g.next(); }, /StopIteration/);

