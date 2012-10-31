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
        console.log( gen.next() ); // Prints numbers 42 ... 51
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

## Other resources

See `test/backport` directory for test cases and examples.

To read more about `yield`, see [MDN article](https://developer.mozilla.org/
en-US/docs/JavaScript/Guide/Iterators_and_Generators) and
[Ecmascript harmony plans](http://wiki.ecmascript.org/doku.php?
id=harmony:iterators).

For a different way to do yield, see [lyfe](https://bitbucket.org/balpha/lyfe) project.

And when you need excellent Javascript parser or mangler, be sure to check out
[UglifyJS](https://github.com/mishoo/UglifyJS).

