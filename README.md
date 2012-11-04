# YieldifyJS

Fork of [UglifyJS](https://github.com/mishoo/UglifyJS) to support `yield`
keyword in Javascript 1.6.

The idea is to rewrite functions that contain `yield` to a structure that can
return immediate value, and continue from that point and state when `next()` is
called. `throw(exception)` and `send(value)` are also supported.

## Introduction

The following function is a generator; for each run, it returns an integer one
bigger than on the last run, starting from the given `startValue`.

    function inc_generator(startValue) {
        while (true) {
            yield startValue++;
        }
    }

    var gen = inc_generator(42);
    for (var i = 0; i < 10; i++) {
        console.log( gen.next() ); // Prints 42..51
    }

To run the code, you need Javascript engine that supports yield. As of Oct 2012,
the most common supporting engine is shipped with Firefox browser. Sadly, no
other browser supports yield. This is where YieldifyJS steps in, and helps you
get that code shipped everywhere!

## Getting YieldifyJS

To setup YieldifyJS, pull the repository and install the dependencies:

    $ git clone https://github.com/lpaimen/YieldifyJS.git
    $ cd YieldifyJS
    $ npm install

And you are ready to go. If you don't have npm or NodeJS, get it from [NodeJS
homepage](http://nodejs.org/).

## Using YieldifyJS

The code shown in introduction is shipped with YieldifyJS on
`test/yield_example.js` file. Due YieldifyJS building on top of
[UglifyJS](https://github.com/mishoo/UglifyJS), program is called `uglifyjs`.
UglifyJS does a lot more, but with `--backport` switch, it does the magic:

    $ ./bin/uglifyjs --backport test/yield_example.js

The output is runnable Javascript code. If you don't believe it, redirect output
to NodeJS to run it (`./bin/uglifyjs --backport test/yield_example.js | node`),
or include it into your homepage or where you need it.

More human-readable code, try `--backport-beautifully` switch:

    $ ./bin/uglifyjs --backport-beautifully test/yield_example.js

## Walkthrough of rewritten test/yield_example.js

Original source (test/yield_example.js):

```javascript
function inc_generator(startValue) {
    while (true) {
        yield startValue++;
    }
}

var gen = inc_generator(42);
for (var i = 0; i < 10; i++) {
    console.log(gen.next()); // Prints 42..51
}
```

Commented source after
`$ ./bin/uglifyjs --backport-beautifully test/yield_example.js`:

```javascript
/*  Original function is replaced with new generator function that has similar
    interface. */
function inc_generator(startValue) {

/*  All the variables declared in the original functions are lifted here.
    In this case, there was no variables. Variable declaration also contains
    variables that the code needs to work. These are:
      - $yc_counter:  Counter for switch case ("program counter").
      - $yc_value:    Function that returns value given to send(), throws
                      exception given in throws(), or returns undefined if
                      next() was called.
      - $y_guard:     Stack of program counter guards. Stack value is array
                      containing 3 items:
                      0: Beginning of try block
                      1: End of catch/begin of finally block
                      2: Beginning of catch block (between [0] and [1])
      - $y_pcstack:   Stack of program counter values for finally block(s).
      - $y_return:    Value to be returned in special return block.
      - $y_exception: Two uses: Exception to be thrown in special throw block or
                      caught exception for catch block. */
    var $yc_counter = 0, $yc_value = function noop() {}, $y_guard = [], $y_pcstack = [], $y_return, $y_exception;
    
/*  Main function is only used to store the state (variables). Just return
    object representing generator API. */
    return {

/*  Send function. Replaces $yc_value with a function that returns sent value
    and calls next(). On exit, $yc_value is restored (to noop). */
        send: function(value) {
            var old_yc = $yc_value;
            $yc_value = function() {
                return value;
            };
            try {
                return this.next();
            } finally {
                $yc_value = old_yc;
            }
        },

/*  Throw function. Similar to send, but $yc_value is replaced with function
    that throws given exception. */
        "throw": function(value) {
            var old_yc = $yc_value;
            $yc_value = function() {
                throw value;
            };
            try {
                return this.next();
            } finally {
                $yc_value = old_yc;
            }
        },

/*  Next function. Contains big switch-case that emulates original generator
    logic, and two helper blocks for exception handling. */
        next: function() {

/*  Outer loop, whose purpose is to react on thrown errors. */
            catcher : do {
                try {
                
/*  Inner loop, whose purpose is to recreate generator logic. Contains the
    switch-case, and guard. */
                    yield_loop : do {

/*  Guard. Guards for jumps outside of try...catch, and when such is detected,
    stores the counter and redirects execution to finally block. */
                        if ($y_guard.length) {
                            var $y_top = $y_guard[$y_guard.length - 1];
                            if ($yc_counter < $y_top[0] || $yc_counter > $y_top[1]) {
                                $y_pcstack.push($yc_counter);
                                $yc_counter = $y_top[1];
                            }
                        }

/*  The switch case, containing flattened function logic. */
                        switch ($yc_counter) {
                          case 0:

/*  Case 1 is the beginning of while block. First, while expression is
    evaluated. In this case, the expression is true. If the expression
    evaluates to false, loop is jumped out ($yc_counter changed and the switch
    restarted).
    */
                          case 1:
                            if (!true) {
                                $yc_counter = 3;
                                continue yield_loop;
                            }
/*  while loop block starts here. yield is replaced with return command, so when
    next() is called and yield encountered, proper value is returned. Before
    returning, $yc_counter is updated so that when next() is later called,
    execution continues from the right place. */
                            $yc_counter = 2;
                            return startValue++;
                          case 2:

/*  This is where execution continues when next(), send() or throw() is called.
    If yield value would be saved (var a = yield;), the next line would be
    a = $yc_value(); . Even if the value was not saved anywhere, $yc_value()
    still has to be executed because it may also throw an exception. */
                            $yc_value();

/*  This is the end of while block. $yc_counter is set to the beginning of while
    loop, and execution continued by evaluating guard and switch again. */
                            $yc_counter = 1;
                            continue yield_loop;
                          case 3:

/*  This is the final state of the generator, where it just constantly throws
    StopIteration exception. As such exception does not exist prior to ES6,
    "StopIteration" string is thrown. */
                          case 4:
                            throw "StopIteration";

/*  This is a special "return" state. If generator has return clause, return
    expression is evaluated and assigned to $y_return, and jump to this special
    state is executed. $yc_counter is set to be the final "throw" state, and
    the $y_return is returned. Jump to special state is needed to execute
    finally blocks (with help of guard) before returning the value. */
                          case 5:
                            $yc_counter = 4;
                            return $y_return;

/*  This is a special "throw" state that handles uncaught exceptions. In case
    of uncaught exception, final state is set, and the exception thrown further.
    $y_exception contains the caught exception. */
                          case 6:
                            $yc_counter = 4;
                            throw $y_exception;

/*  Very special "Emergency break" default state. It is not related to
    generator functionality, but added here just in case $yc_counter gets wrong
    values due possible bugs in backport functions. So far, I've never got into
    this state. */
                          default:
                            throw "Emergency break";
                        }
                    } while (true);

/*  Catch block of outer loop. This handles all the exceptions from generator.
    If the exception is not from final state, and there is catch blocks set,
    execution is transferred to catch block. Caught exception is saved to
    $y_exception variable, and is later handled in original catch block.
    Else, the state is set to final state and exception rethrown. */
                } catch ($y_e) {
                    if ($y_e !== "StopIteration" && $y_guard.length) {
                        $y_exception = $y_e;
                        $yc_counter = $y_guard[$y_guard.length - 1][2];
                        continue catcher;
                    } else {
                        $yc_counter = 4;
                        throw $y_e;
                    }
                }
            } while (true);
        }
    };
}

/*  Only functions containing yield keyword are rewritten. If there is other
    code or functions without yield keyword, their structure is not touched.
    However, all the code is read to AST and then re-generated, so all the
    comments and original formatting is always lost. */
var gen = inc_generator(42);

for (var i = 0; i < 10; i++) {
    console.log(gen.next());
};
```

## Other resources

See `test/backport` directory for test cases and examples.

To read more about `yield`, see [MDN article](https://developer.mozilla.org/
en-US/docs/JavaScript/Guide/Iterators_and_Generators) and
[Ecmascript harmony plans](http://wiki.ecmascript.org/doku.php?
id=harmony:iterators).

For a different way to do yield, see [lyfe](https://bitbucket.org/balpha/lyfe) project.

And when you need excellent Javascript parser or mangler, be sure to check out
[UglifyJS](https://github.com/mishoo/UglifyJS).

