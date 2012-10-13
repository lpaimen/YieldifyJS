window.onload = function() {

    // Logging to page
    var logEl = document.createElement("pre");
    document.body.appendChild(logEl);
    function log(text) {
        logEl.textContent += text + "\n";
    }
    
    // Translates string to number, 5000k = 5M = 5000000
    function numerize(n) {
        var str = String(n);
        n = parseInt(str, 10);
        var c = str[str.length - 1];
        if (c.toLowerCase() == 'k') {
            n *= 1000;
        }
        if (c.toLowerCase() == 'm') {
            n *= 1000*1000;
        }
        return n;

    }
    
    // Driver that calls next <times> times
    function repeatDriver(times) {
        function driver(func) {
            var count = numerize(times);
            var gen = func();
            while (count--) {
                gen.next();
            }
        }
        driver.explain = "call next() " + times + " times";
        return driver;
    }
    
    // Driver that initializes the generator <times> times
    function initDriver(times) {
        function driver(func) {
            var count = numerize(times);
            while (count--) {
                func();
            }
        }
        driver.explain = "initialize generator " + times + " times";
        return driver;
    }

    // Helper that compares results
    function compare(name, native, backported, driver) {
        var start, native_elapsed = false, bp_elapsed = false;
        log(name);
        log(driver.explain);
        if (typeof native == "function") {
            start = new Date();
            driver(native);
            native_elapsed = (new Date()).getTime() - start.getTime();
            log("Native executed " + native_elapsed + " ms");
        }
        if (typeof backported == "function") {
            start = new Date();
            driver(backported);
            bp_elapsed = (new Date()).getTime() - start.getTime();
            log("Backported executed " + bp_elapsed + " ms");
        }
        if (native_elapsed !== false
            && bp_elapsed !== false) {
            var perf = Math.round(bp_elapsed / native_elapsed * 100);
            log("Backport took " + perf + "% of time of native");
        }
        
        // Not having native or backported is usually a typo somewhere
        if (native_elapsed === false && bp_elapsed === false) {
            log("Did not find functions for " + name);
        }
        
        log("");
    }

    // Executes given tests
    function run(tests) {
    
        var at = 0;
            
        // Run tests asynchronically to avoid runaway Javascript
        // notifications
        function runNext() {
            var test = tests[at++];
            if (test) {
                setTimeout( function() {
                    compare(test.func,
                            window[test.func],
                            window[test.func + "_backported"],
                            test.driver);
                    runNext();
                }, 20);
            }
        }
    
        runNext();
    }

    var tests = [
        {
            func: "while_forever",
            driver: initDriver("500k")
        },
        {
            func: "while_forever",
            driver: repeatDriver("1M")
        },
        {
            func: "mdn_fibonacci_reset",
            driver: repeatDriver("1M")
        } ];
    
    log("Date: " + (new Date));
    log("User agent: " + navigator.userAgent);
    log("Supports native yield: " + (typeof canYield === "boolean"));
    log("Executing " + tests.length + " tests");
    log("");

    run(tests);
    
};
