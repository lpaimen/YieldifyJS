function dut() {
    return yield "return";
}

var g = dut();
assert.equal(g.next(), "return");
assert.equal(g.send("something else"), "something else");
assert.throws(function() { g.next() }, /StopIteration/);

g = dut();
assert.equal(g.next(), "return");
assert.throws(function() { g.throw(new Error("do not")); }, /do not/);
assert.throws(function() { g.next(); }, /StopIteration/);

