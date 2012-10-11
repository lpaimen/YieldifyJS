window.onload = function() {

    var logEl = document.createElement("pre");
    document.body.appendChild(logEl);
    function log(text) {
        logEl.textContent += text + "\n";
    }
    
    log("Date: " + (new Date));
    log("User agent: " + navigator.userAgent);
    log("Supports native yield: " + (typeof canYield === "boolean"));
    log("");

    function repeat(func, times) {
        var gen = func();
        while (times--) {
            gen.next();
        }
    }
    function reportElapsed(start, end) {
        var elapsed = end.getTime() - start.getTime();
        log("Elapsed " + elapsed + " ms");
        return elapsed;
    }

    var start, foo_elapsed, backport_elapsed, times = 10*1000*1000;
    
    if (typeof foo == "function") {
        log("Running foo " + times + " times");
        start = new Date();
        repeat(foo, times);
        foo_elapsed = reportElapsed(start, new Date);
    }
    
    if (typeof foo_backported == "function") {
        log("Running foo_backported " + times + " times");
        start = new Date();
        repeat(foo_backported, times);
        backport_elapsed = reportElapsed(start, new Date);
    }
    
    if (typeof foo == typeof foo_backported) {
        log("Native performance: " +
            Math.round(backport_elapsed / foo_elapsed  * 100) + "%");
        
    }
};
