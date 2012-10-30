function break_() {
    var i = 1;
    while (true) {
        i = yield i;
        if (!i) {
            break;
        }
    }
    return "done";
}

var g = break_();
assert.equal(g.next(), 1);
assert.equal(g.send(), "done");
assert.throws(function() { g.next(); }, /StopIteration/);

var g = break_();
assert.equal(g.next(), 1);
assert.equal(g.send(1), 1);
assert.equal(g.next(), "done");
assert.throws(function() { g.next(); }, /StopIteration/);


function break_label() {
    var n = 0;
    outer: while (1) {
        n += 10;
        inner: while (1) {
            n += 1;
            var value = yield n;
            if (value == "inner") {
                break inner;
            }
            if (value == "outer") {
                break outer;
            }
        }
    }
    n += 100;
    return n;
}


var g = break_label();
assert.equal(g.next(), 11);
assert.equal(g.next(), 12);
assert.equal(g.send("inner"), 23);
assert.equal(g.send("inner"), 34);
assert.equal(g.send("outer"), 134);
assert.throws(function() { g.next(); }, /StopIteration/);

function continue_() {
    var i = 1;
    while (i) {
        var value = yield i;
        if (value == "skip") {
            continue;
        }
        i--;
    }
    return "done";
}

var g = continue_();
assert.equal(g.next(), 1);
assert.equal(g.next(), "done");
assert.throws(function() { g.next(); }, /StopIteration/);

var g = continue_();
assert.equal(g.next(), 1);
assert.equal(g.send("skip"), 1);
assert.equal(g.send("skip"), 1);
assert.equal(g.next(), "done");
assert.throws(function() { g.next(); }, /StopIteration/);

function continue_label() {
    var i = 1;
    outer: while (i) {
        i += 2;
        inner: while (i) {
            var value = yield i;
            if (value == "twomore") {
                continue outer;
            }
            if (value == "skip") {
                continue inner;
            }
            i--;
        }
    }
}

var g = continue_label();
assert.equal(g.next(), 3);
assert.equal(g.next(), 2);
assert.equal(g.send("twomore"), 4);
assert.equal(g.send("skip"), 4);
assert.equal(g.next(), 3);
assert.equal(g.next(), 2);
assert.equal(g.next(), 1);
assert.throws(function() { g.next(); }, /StopIteration/);

