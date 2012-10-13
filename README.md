# YieldifyJS

Fork of [UglifyJS](https://github.com/mishoo/UglifyJS) to backport yield support for Javascript 1.6.

Idea is to mangle the functions containing yield to totally different structure to enable yielding with JS engines that don't support it. That will allow you to *write functions that `yield`, and use them in current browsers*.

See test/backport for test cases and examples. To read about `yield`, see [MDN](https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Iterators_and_Generators). For a different way to do yield, see [lyfe](https://bitbucket.org/balpha/lyfe) project.

## Sample usage and output

Lets take an example function while_yield.js from test/backport directory:

    $ cat test/backport_performance/test/mdn_fibonacci_reset.js 
    function mdn_fibonacci_reset(){
      var fn1 = 1;
      var fn2 = 1;
      while (1){
        var current = fn2;
        fn2 = fn1;
        fn1 = fn1 + current;
        var reset = yield current;
        if (reset){
            fn1 = 1;
            fn2 = 1;
        }
      }
    }

Then process it not to contain yield:

    $ ./bin/uglifyjs --backport-beautifully test/backport_performance/test/mdn_fibonacci_reset.js 
    function mdn_fibonacci_reset() {
        var current, reset, fn1, fn2, $yc_counter = 0, $yc_value;
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
                        fn2 = 1
                        fn1 = 1
                      case 1:
                        if (!1) {
                            $yc_counter = 5;
                            continue yield_loop;
                        }
                        current = fn2
                        fn2 = fn1
                        fn1 = fn1 + current
                        $yc_counter = 2;
                        return current;
                      case 2:
                        reset = $yc_value
                        if (!reset) {
                            $yc_counter = 3;
                            continue yield_loop;
                        }
                        fn1 = 1
                        fn2 = 1
                        $yc_counter = 4;
                        continue yield_loop;
                      case 3:
                      case 4:
                        $yc_counter = 1;
                        continue yield_loop;
                      case 5:
                        throw "StopIteration";
                      default:
                        throw "Emergency break";
                    }
                }
            }
        };
    };

mdn\_fibonacci\_reset function has now been mangled to behave like yielding function. Looks dirty, but works.

## Preliminary performance

There is very rudimentary performance tester at `test/backport_performance`. To use it, `cd` into that directory, run `./update`, and open index.html into your web browser. If your browser supports `yield` (Firefox does), comparison of native and yieldifyjs converted function is done.

While converted output is still subject to change and performance is not the goal of this project, preliminary findings are interesting. It seems that backported yield functions *actually run faster* than their native counterparts *on the same Javascript engine*.

Here is a sample output of performance tester on yield-supporting Firefox:

    Date: Sat Oct 13 2012 14:47:06 GMT+0300 (EEST)
    User agent: Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:16.0) Gecko/20100101 Firefox/16.0
    Supports native yield: true
    Executing 3 tests
    
    while_forever
    initialize generator 500k times
    Native executed 281 ms
    Backported executed 178 ms
    Backport took 63% of time of native
    
    while_forever
    call next() 1M times
    Native executed 206 ms
    Backported executed 43 ms
    Backport took 21% of time of native
    
    mdn_fibonacci_reset
    call next() 1M times
    Native executed 266 ms
    Backported executed 101 ms
    Backport took 38% of time of native




