function inc_generator(startValue) {
    while (true) {
        yield startValue++;
    }
}

var gen = inc_generator(42);
for (var i = 0; i < 10; i++) {
    console.log(gen.next()); // Prints 42..51
}
