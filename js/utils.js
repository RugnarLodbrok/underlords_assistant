function* range(start, stop, step) {
    if (stop === undefined) {
        stop = start;
        start = 0;
    }
    step = step || 1;
    if (step > 0)
        for (let i = start; i < stop; i += step)
            yield i;
    else
        for (let i = start; i > stop; i += step)
            yield i;
}

function random_color() {
    let color = Math.round(0xffffff * Math.random()).toString(16);
    while (color.length < 6)
        color = "0" + color;
    return "#" + color;
}
