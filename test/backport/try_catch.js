function try_catch(throws) {
    try {
        yield "try";
        if (throws) {
            throw throws;
        }
    } catch (e) {
        yield e;
    } finally {
        yield "finally";
    }
}

var dut = try_catch();
assert.equal(dut.next(), "try");
assert.equal(dut.next(), "finally");
assert.throws(function() { dut.next() }, /StopIteration/);

var dut = try_catch("throws");
assert.equal(dut.next(), "try");
assert.equal(dut.next(), "throws");
assert.equal(dut.next(), "finally");
assert.throws(function() { dut.next() }, /StopIteration/);

var dut = try_catch();
assert.equal(dut.next(), "try");
assert.equal(dut.throw("thrown"), "thrown");
assert.equal(dut.next(), "finally");
assert.throws(function() { dut.next() }, /StopIteration/);
