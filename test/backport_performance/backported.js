function foo_backported() {
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
                    i = 1
                  case 1:
                    if (!i) {
                        $yc_counter = 3;
                        continue yield_loop;
                    }
                    $yc_counter = 2;
                    return i;
                  case 2:
                    $yc_value
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
};
