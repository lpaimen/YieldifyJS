function only_yield() {
    var b = yield 5 + 7;
}
function yield_yield() {
    var c = yield yield 1+2;
}
function while_yield() {
    while (true) {
        yield 5;
    }
}
function fib() {
  var i, j = 1;
  while (true) {
    yield i;
    var t = i;
    i = j;
    j += t;
  }
}

/*
function f() {
    switch (a) {
     case 0:
     console.log(2);
     break;
     case 1:
     break;
    }
    yield 5;
    return 6;
}
function dbl_yield() {
    yield yield 5;
    var b = yield 7;
    return 5;
}
*/
/*
function foo() {

}
*/
