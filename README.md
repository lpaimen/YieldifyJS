# YieldifyJS

Fork of UglifyJS to backport yield support for Javascript 1.6.

Idea is to mangle the functions containing yield to totally different structure to enable yielding with JS engines that don't support it.

See test/backport for test cases and examples.
