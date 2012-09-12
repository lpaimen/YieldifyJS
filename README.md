# YieldifyJS

Fork of [UglifyJS](https://github.com/mishoo/UglifyJS) to backport yield support for Javascript 1.6.

Idea is to mangle the functions containing yield to totally different structure to enable yielding with JS engines that don't support it.

See test/backport for test cases and examples. To read about yield, see [MDN](https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Iterators_and_Generators). For a different way to do yield, see [lyfe](https://bitbucket.org/balpha/lyfe) project.

## Sample usage and output

Lets take an example function while_yield.js from test/backport directory:

    $ cat test/backport/while_yield.js
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

Then process it not to contain yield:

    $ ./bin/uglifyjs --backport-beautifully test/backport/while_yield.js
    function dut() {
        var i, $yc_counter = 0, $yc_value;
        return {
            send: function(value) {
                $yc_value = value;
                try {
                    return this.next();
                } finally {
                    $yc_value = undefined;
                }
            },
            next: function() {
                yield_loop : while (true) {
                    switch ($yc_counter) {
                      case 0:
                        i = 0
                      case 1:
                        if (!(i < 4)) {
                            $yc_counter = 3;
                            continue yield_loop;
                        }
                        $yc_counter = 2;
                        return i;
                      case 2:
                        $yc_value
                        i++
                        $yc_counter = 1;
                        continue yield_loop;
                      case 3:
                        throw "StopIteration";
                      default:
                        throw "Emergency break";
                    }
                }
            }
        };
    }
    var g = dut();

    assert.equal(g.next(), 0);

    assert.equal(g.next(), 1);

    assert.equal(g.next(), 2);

    assert.equal(g.next(), 3);

    assert.throws(function() {
        g.next();
    }, /StopIteration/);

dut function (that contained yield) has now been mangled to behave like yielding function. Looks dirty, but should work. The best, it is automatic.


