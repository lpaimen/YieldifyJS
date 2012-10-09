// Generators listed on https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Iterators_and_Generators

function fibonacci(){
  var fn1 = 1;
  var fn2 = 1;
  while (1){
    var current = fn2;
    fn2 = fn1;
    fn1 = fn1 + current;
    yield current;
  }
}

var g = fibonacci();
assert.equal(g.next(), 1);
assert.equal(g.next(), 1);
assert.equal(g.next(), 2);
assert.equal(g.next(), 3);
assert.equal(g.next(), 5);
assert.equal(g.next(), 8);
assert.equal(g.next(), 13);


function fibonacci_reset(){
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
 
var g = fibonacci_reset();
assert.equal(g.next(), 1);
assert.equal(g.next(), 1);
assert.equal(g.next(), 2);
assert.equal(g.next(), 3);
assert.equal(g.next(), 5);
assert.equal(g.next(), 8);
assert.equal(g.next(), 13);
assert.equal(g.send(true), 1);
assert.equal(g.next(), 1);
assert.equal(g.next(), 2);
assert.equal(g.next(), 3);
