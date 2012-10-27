function try_catch() {
    try {
        yield "try";
    } catch (e) {
        yield "catch";
    } finally {
        yield "finally";
    }
}

var dut = try_catch();
assert.equal(dut.next(), "try");
assert.equal(dut.next(), "finally");
assert.throws(function() { dut.next() }, /StopIteration/);
