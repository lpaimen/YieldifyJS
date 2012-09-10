function simpleGenerator() {
    yield "first";
    yield "second";
    yield "third";
}

var g = simpleGenerator();
assert.equal(g.next(), "first");
assert.equal(g.next(), "second");
assert.equal(g.next(), "third");
assert.throws(function() { g.next() }, /StopIteration/);
assert.throws(function() { g.next() }, /StopIteration/);

