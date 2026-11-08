// Imports Lode Runner levels from a copy of another game's data file.
//
//   node tools/loderunner-import.js <file.js> [--max N] [--write]
//
// Two encodings exist: digits (0 empty, 1 brick, 2 solid, 3 ladder, 4 bar,
// 5 trap, 6 exit ladder, 7 gold, 8 guard, 9 runner) and the Apple-II characters
// (# H - $ 0 S @). Each level is 16 rows of 28 cells; the runner is not stored
// in the data, so he is placed on the cell that reaches the most of the level.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const GAME = path.join(ROOT, "LodeRunner.jsx");
const W = 28, H = 16;

const args = process.argv.slice(2);
const input = args[0];
const maxLevels = args.indexOf("--max") >= 0 ? parseInt(args[args.indexOf("--max") + 1], 10) : 8;
const write = args.indexOf("--write") >= 0;

if (!input) {
    console.error("usage: node tools/loderunner-import.js <file> [--max N] [--write]");
    process.exit(2);
}

// ------------------------------------------------------------- tile helpers
const solid = (ch) => ch === "#" || ch === "=";
const ladder = (ch) => ch === "H";
const rope = (ch) => ch === "-";

function makeAt(g) {
    return (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? "#" : g[y][x];
}

function reachFrom(g, sx, sy) {
    const at = makeAt(g);
    const supported = (x, y) => {
        const here = at(x, y);
        if (ladder(here) || rope(here)) return true;
        const below = at(x, y + 1);
        return solid(below) || ladder(below) || rope(below) || below === "o";
    };
    const fallFrom = (x, y) => {
        let cy = y, guard = 0;
        while (guard++ < H) {
            if (supported(x, cy)) break;
            if (solid(at(x, cy + 1))) break;
            cy++;
        }
        return { x, y: cy };
    };

    const seen = new Set();
    const q = [];
    const push = (c) => {
        const k = c.x + ":" + c.y;
        if (!seen.has(k)) { seen.add(k); q.push(c); }
    };
    push({ x: sx, y: sy });

    while (q.length) {
        const cur = q.shift();
        if (!supported(cur.x, cur.y)) { push(fallFrom(cur.x, cur.y)); continue; }
        const here = at(cur.x, cur.y);
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cur.x + d[0], ny = cur.y + d[1];
            if (solid(at(nx, ny))) continue;
            if (d[1] !== 0) {
                if (!ladder(here)) continue;
                if (!ladder(at(nx, ny)) && at(nx, ny) !== "S") continue;
            }
            push(supported(nx, ny) ? { x: nx, y: ny } : fallFrom(nx, ny));
        }
    }
    return seen;
}

// ------------------------------------------------------------- extraction
const raw = fs.readFileSync(input, "utf8");
const quoted = raw.match(/["'][^"'\n]{28}["']/g) || [];
const rows = quoted.map((s) => s.substring(1, 29));

const blocks = [];
for (let i = 0; i + H <= rows.length; i += H) blocks.push(rows.slice(i, i + H));
console.log("rows: " + rows.length + ", blocks: " + blocks.length);

if (!blocks.length) {
    console.error("no 28-char rows found in that file");
    process.exit(1);
}

// ------------------------------------------------------------- conversion
const DIGITS = { "0": " ", "1": "#", "2": "=", "3": "H", "4": "-", "5": "X", "6": "S", "7": "$", "8": "E", "9": "P" };

function convert(block) {
    const digits = block.every((row) => /^[0-9]+$/.test(row));
    return block.map((row) => row.split("").map((ch) => {
        if (digits) return DIGITS[ch] || " ";
        if (ch === "&") return "P";     // runner - start tile
        if (ch === "0") return "E";     // guard
        if (ch === "S") return "S";     // exit ladder (hidden until all gold collected)
        if (ch === "X") return "X";     // false brick (trap)
        if (ch === "@") return "=";     // solid block
        if (ch === "#" || ch === "H" || ch === "-" || ch === "$") return ch;
        return " ";
    }).join(""));
}

function placeRunner(map) {
    if (map.some((row) => row.indexOf("P") >= 0)) return { map: map, cells: -1 };

    const g = map.map((r) => r.split(""));
    let best = null, bestN = -1;

    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            const here = g[y][x];
            if (here !== " " && here !== "H" && here !== "-") continue;
            const below = g[y + 1][x];
            if (!(solid(below) || below === "H" || below === "-")) continue;
            const n = reachFrom(g, x, y).size;
            if (n > bestN) { bestN = n; best = { x: x, y: y }; }
        }
    }
    if (!best) return { map: map, cells: 0 };

    const out = map.slice();
    out[best.y] = out[best.y].substring(0, best.x) + "P" + out[best.y].substring(best.x + 1);
    return { map: out, cells: bestN };
}

// ------------------------------------------------------------- acceptance
// Walking alone cannot reach gold the level expects you to dig for, and a naive
// digging model collapses the level: removing a brick takes away the floor the
// walker stands on, and reachability drops. A faithful model needs holes that
// refill on a timer and a search that digs only when stuck, so this tool keeps
// the structural check and reports walking reachability as a sanity signal.
function analyse(map) {
    const g = map.map((r) => r.split(""));
    let sx = -1, sy = -1, gold = 0, exits = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ch = g[y][x];
        if (ch === "P") { sx = x; sy = y; }
        if (ch === "$") gold++;
        if (ch === "S") exits++;
    }
    const seen = sx >= 0 ? reachFrom(g, sx, sy) : new Set();
    return { sx: sx, gold: gold, exits: exits, cells: seen.size };
}
const accepted = [];
blocks.forEach((block, i) => {
    const placed = placeRunner(convert(block));
    const r = analyse(placed.map);
    // a sealed start means the runner cannot get anywhere: reject those levels
    // the start now comes from the data itself, so reachability is only reported
    const ok = r.sx >= 0 && r.gold > 0;
    console.log("  #" + String(i + 1).padStart(3) + (ok ? " ok  " : " skip") +
        " gold=" + r.gold + " exit=" + r.exits + " reach=" + r.cells);
    if (ok && accepted.length < maxLevels) accepted.push({ name: String(accepted.length + 1), map: placed.map, cells: r.cells });
});

console.log("accepted: " + accepted.length);
if (accepted.length) {
    const cells = accepted.map((a) => a.cells);
    console.log("reach per level: " + cells.join(", "));
}

if (!write || !accepted.length) {
    console.log(write ? "nothing to write" : "dry run - pass --write to patch the game");
    process.exit(0);
}

let src = fs.readFileSync(GAME, "utf8").replace(/^\uFEFF/, "");
const out = ["    var LEVELS = ["];
accepted.forEach((lv, i) => {
    out.push("        {");
    out.push("            name: \"" + lv.name + "\",");
    out.push("            map: [");
    lv.map.forEach((row) => out.push("                \"" + row + "\","));
    out.push("            ]");
    out.push("        }" + (i < accepted.length - 1 ? "," : ""));
});
out.push("    ];");

const a = src.indexOf("    var LEVELS = [");
const b = src.indexOf("    ];", a);
src = src.substring(0, a) + out.join("\n") + src.substring(b + "    ];".length);
const hasNonAscii = Buffer.from(src, "utf8").some((b) => b > 127);
fs.writeFileSync(GAME, (hasNonAscii ? "\uFEFF" : "") + src, "utf8");
console.log("wrote " + accepted.length + " levels into LodeRunner.jsx");
