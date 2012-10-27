function try_catch() {
    try {
        yield "try";
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

var dut = try_catch();
assert.equal(dut.next(), "try");
assert.equal(dut.throw("throw value"), "throw value");
assert.equal(dut.next(), "finally");
assert.throws(function() { dut.next() }, /StopIteration/);


function try_catch2() {
    try {
        yield "try";
    } catch (e) {
        yield e;
    }
}

var dut = try_catch2();
assert.equal(dut.next(), "try");
assert.throws(function() { dut.next() }, /StopIteration/);

var dut = try_catch2();
assert.equal(dut.next(), "try");
assert.equal(dut.throw(), undefined);
assert.throws(function() { dut.next() }, /StopIteration/);


function double_try_catch() {
    try {
        yield "try1";
    } catch (e1) {
        try {
            yield e1 + "try2";
        } catch (e2) {
            yield e2 + "catch2";
        } finally {
            yield "finally2";
        }
    } finally {
        yield "finally1";
    }
}

var dut = double_try_catch();
assert.equal(dut.next(), "try1");
assert.equal(dut.next(), "finally1");
assert.throws(function() { dut.next() }, /StopIteration/);

var dut = double_try_catch();
assert.equal(dut.next(), "try1");
assert.equal(dut.throw("throw"), "throwtry2");
assert.equal(dut.next(), "finally2");
assert.equal(dut.next(), "finally1");
assert.throws(function() { dut.next() }, /StopIteration/);

var dut = double_try_catch();
assert.equal(dut.next(), "try1");
assert.equal(dut.throw("throw"), "throwtry2");
assert.equal(dut.throw("throw2"), "throw2catch2");
assert.equal(dut.next(), "finally2");
assert.equal(dut.next(), "finally1");
assert.throws(function() { dut.next() }, /StopIteration/);


function try_catch_ret() {
    try {
        return yield "try";
    } finally {
        yield "finally";
    }
}

var dut = try_catch_ret();
assert.equal(dut.next(), "try");
assert.equal(dut.send("return this"), "finally");
assert.equal(dut.next(), "return this");
assert.throws(function() { dut.next() }, /StopIteration/);

var dut = try_catch_ret();
assert.equal(dut.next(), "try");
assert.equal(dut.throw("throw value"), "finally");
assert.throws(function() { dut.next() }, /throw value/);
assert.throws(function() { dut.next() }, /StopIteration/);

