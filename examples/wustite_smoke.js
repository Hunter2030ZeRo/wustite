// Baseline engine smoke test: no Wustite JIT is required.
function sum(n) {
    let total = 0;
    for (let i = 0; i < n; i++) {
        total += i;
    }
    return total;
}

if (sum(1000) !== 499500) {
    throw new Error('numeric loop regression');
}

function coerce(x) {
    return x + 2;
}
if (coerce('3') !== '32' || coerce(3) !== 5) {
    throw new Error('dynamic addition regression');
}

let handled = false;
try {
    throw new TypeError('expected');
} catch (error) {
    handled = error instanceof TypeError;
}
if (!handled) {
    throw new Error('exception regression');
}
