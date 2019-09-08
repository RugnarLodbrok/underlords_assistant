let draw;
let grid;

class CellBase {
    constructor(i, j) {
        this.i = i;
        this.j = j;
    }

    update_placement(smooth) {
        let x = this.i * CELL_STEP;
        let y = this.j * CELL_STEP;
        let r = this.elem;
        if (smooth) {
            window["_gsScope"].TweenMax.to(r, .2, {x: x, y: y}, 0, 0);
        } else {
            r.move(x, y);
        }
    }
}

class AllianceCell extends CellBase {
    constructor(i, j, image, alliance) {
        super(i, j);
        this.elem = draw.group();
        let im = this.elem.image(image, CELL_SIZE, CELL_SIZE);
        this.alliance = alliance;
        if (alliance) {
            im.transform(alliance_im_matrix);
            alliances[alliance].rect = im;
        }
    }
}

class Cell extends CellBase {
    constructor(i, j, hero_names) {
        super(i, j);
        this.elem = draw.group();
        this.elem.rect(CELL_SIZE, CELL_SIZE).fill("#191919").radius(3);
        this.heroes = [];
        this.hero_rects = {};
        let k = 0;
        for (let hn of hero_names) {
            this.heroes[hn] = heroes[hn];
            this.hero_rects[hn] = this.elem.image(IMAGE_DATA[hn], HERO_SIZE, HERO_SIZE).move(
                (k % 2) * HERO_SIZE,
                Math.floor(k / 2) * HERO_SIZE);
            this.hero_rects[hn].filter(grayscale_filter);
            heroes[hn].rects.push(this.hero_rects[hn]);
            this.hero_rects[hn].node.onclick = ((e) => {
                toggle_hero(hn);
            });
            k++;
        }
    }
}

class Grid {
    constructor(m, n) {
        this.m = m || 3;
        this.n = n || 3;
        this.cells = [];

        this.drag_state = ({
            is_mouse_down: false,
            click_x: 0,
            click_y: 0,
            cell: null
        });
        this.cells[0] = [new AllianceCell(0, 0, IMAGE_DATA['LOGO'])];
        for (let i of range(1, this.m))
            this.cells[i] = [new AllianceCell(i, 0, IMAGE_DATA[SPICIES[i - 1]], SPICIES[i - 1])];
        for (let j of range(1, this.n))
            this.cells[0][j] = new AllianceCell(0, j, IMAGE_DATA[JOBS[j - 1]], JOBS[j - 1]);
        for (let i of range(1, this.m))
            for (let j of range(1, this.n))
                this.cells[i][j] = new Cell(i, j, Array.from(get_heroes(SPICIES[i - 1], JOBS[j - 1])));
        this.update_placement();

        draw.node.onmousedown = ((e) => {
            this.update_placement();
            let s = this.drag_state;
            s.is_mouse_down = true;

            let svg_rect = draw.node.getBoundingClientRect();
            let x = e.clientX - svg_rect.left;
            let y = e.clientY - svg_rect.top;
            let i = Math.floor(x / CELL_STEP);
            let j = Math.floor(y / CELL_STEP);

            s.cell = this.cells[i][j];
            s.click_x = x - i * CELL_STEP;
            s.click_y = y - j * CELL_STEP;
            e.preventDefault();
        });
        draw.node.onmousemove = ((e) => {
            let s = this.drag_state;
            if (!s.is_mouse_down) {
                return;
            }

            let svg_rect = draw.node.getBoundingClientRect();
            let x = e.clientX - svg_rect.left;
            let y = e.clientY - svg_rect.top;
            let i = Math.floor(x / CELL_STEP);
            let j = Math.floor(y / CELL_STEP);

            if (i !== s.cell.i) {
                this.swap_cols(i, s.cell.i);
            }
            if (j !== s.cell.j) {
                this.swap_rows(j, s.cell.j);
            }
            s.cell.elem.move(x - s.click_x, y - s.click_y);
        });
        document.onmouseup = ((e) => {  //draw.node.onmousemove is skipped when fps drops
            let s = this.drag_state;
            s.is_mouse_down = false;
            s.cell.update_placement(true);
            e.preventDefault();
        });
    }

    swap_rows(a, b, x, y) {
        //a b - swap a'th and b'th columns
        //x, y - idx of currently dragged tile.
        for (let i of range(this.m)) {
            let row = this.cells[i];
            let tmp = row[a];
            row[a] = row[b];
            row[b] = tmp;
            row[a].j = a;
            row[b].j = b;
//            if (x !== i || y !== a)
            row[a].update_placement(true);
            //          if (x !== i || y !== b)
            row[b].update_placement(true);
        }
    }

    swap_cols(a, b, x, y) {
        let tmp = this.cells[a];
        this.cells[a] = this.cells[b];
        this.cells[b] = tmp;
        for (let j of range(this.n)) {
            this.cells[a][j].i = a;
            this.cells[b][j].i = b;
            //        if (x !== j || y !== a)
            this.cells[a][j].update_placement(true);
            //      if (x !== j || y !== b)
            this.cells[b][j].update_placement(true);
        }
    }

    update_placement() {
        for (let i of range(this.m))
            for (let j of range(this.n))
                this.cells[i][j].update_placement();
    };

    activate_alliance(a) {
        for (let i of range(1, this.m))
            // columns
            if (this.cells[i][0].alliance === a) {
                for (let k of range(i - 1, 0, -1))
                    if (!alliances[this.cells[k][0].alliance].enabled)
                        this.swap_cols(k + 1, k);
                return;
            }
        for (let j of range(1, this.n))
            // rows
            if (this.cells[0][j].alliance === a) {
                for (let k of range(j - 1, 0, -1))
                    if (!alliances[this.cells[0][k].alliance].enabled)
                        this.swap_rows(k + 1, k);
                return;
            }
    }

    deactivate_alliance(a) {
        for (let i of range(1, this.m))
            // columns
            if (this.cells[i][0].alliance === a) {
                for (let k of range(i + 1, this.m))
                    if (alliances[this.cells[k][0].alliance].enabled)
                        this.swap_cols(k - 1, k);
                return;
            }
        for (let j of range(1, this.n))
            // rows
            if (this.cells[0][j].alliance === a) {
                for (let k of range(j + 1, this.n))
                    if (alliances[this.cells[0][k].alliance].enabled)
                        this.swap_rows(k - 1, k);
                return;
            }
    }
}

function* get_heroes(a1, a2) {
    for (let h in HERO_ALLIANCES) {
        if (HERO_ALLIANCES.hasOwnProperty(h)) {
            let ha = HERO_ALLIANCES[h];
            if (ha.includes(a1) && ha.includes(a2))
                yield h;
        }
    }
}


let heroes = {};
let alliances = {};

function toggle_hero(h) {
    let hero = heroes[h];
    hero.enabled = !hero.enabled;
    for (let rect of hero.rects) {
        if (hero.enabled)
            rect.unfilter();
        else
            rect.filter(grayscale_filter);
    }
    for (let a of HERO_ALLIANCES[h])
        update_alliance(a);
}

function update_alliance(a) {
    let enabled_cnt = 0;
    for (let h of alliances[a].heroes) {
        if (heroes[h].enabled)
            enabled_cnt++;
    }
    if ((enabled_cnt < ALLIANCE_REQUIREMENTS[a][0]) || a === 'demon' && enabled_cnt > 1) {
        if (alliances[a].enabled) {
            alliances[a].rect.filter(grayscale_filter);
            alliances[a].enabled = false;
            grid.deactivate_alliance(a);
        }
    } else if (!alliances[a].enabled) {
        alliances[a].rect.unfilter();
        alliances[a].enabled = true;
        grid.activate_alliance(a);
    }
}

function initialize_data() {
    for (let a of ALLIANCES) {
        alliances[a] = {
            rect: null,
            heroes: [],
            enabled: true
        };
    }
    for (let h in HERO_ALLIANCES) {
        if (HERO_ALLIANCES.hasOwnProperty(h)) {
            heroes[h] = {
                'enabled': false,
                'alliances': HERO_ALLIANCES[h],
                'rects': []
            };
            for (let a of HERO_ALLIANCES[h])
                alliances[a].heroes.push(h);
        }
    }
}

let alliance_im_matrix = new SVG.Matrix(1.08, 0, 0, 1.08, -3, -3);
let grayscale_filter = new SVG.Filter();
grayscale_filter.colorMatrix("saturate", 0);

document.addEventListener('DOMContentLoaded', main);

if (IMAGE_B64)  // use local assets when available
    for (let key in IMAGE_B64)
        if (IMAGE_B64.hasOwnProperty(key))
            IMAGE_DATA[key] = ((key === 'LOGO') ? SVG_PREFIX : PNG_PREFIX) + IMAGE_B64[key];


function main() {
    initialize_data();
    let draw_main = SVG('main').size(W, H);
    draw_main.rect(W, H).fill("#000000");
    draw = draw_main.group().move(10, 10);
    grid = new Grid(14, 11);
    for (let a of ALLIANCES)
        update_alliance(a);
}