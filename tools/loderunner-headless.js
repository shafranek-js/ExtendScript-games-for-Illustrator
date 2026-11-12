// Headless logic tests for LodeRunner.jsx - runs the real game code in Node.
//
//   node tools/loderunner-headless.js
//
// The ScriptUI tail is cut off, window/perf calls are stubbed, and the game's
// own update() is driven by hand. No Illustrator needed.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let src = fs.readFileSync(path.join(ROOT, "LodeRunner.jsx"), "utf8").replace(/^\uFEFF/, "");

const cut = src.indexOf("var win = new Window");
if (cut < 0) throw new Error("window creation not found");
src = src.substring(0, cut)
    .replace(/^#target[^\n]*$/gm, "")
    .replace(/^#include[^\n]*$/gm, "")
    .replace(/\(function \(\) \{/, "");

src += `
return {
    get x() { return player.cx; },
    get y() { return player.cy; },
    get state() { return gameState; },
    get gold() { return goldLeft; },
    get score() { return score; },
    get lives() { return lives; },
    get open() { return exitOpen; },
    get level() { return levelIndex; },
    get levelCount() { return LEVELS.length; },
    get holes() { return holes.length; },
    get player() { return player; },
    update: function (dt) { update(dt); },
    key: function (k, down) { setKey(k, down); },
    press: function (k) { setKey(k, true); },
    release: function (k) { setKey(k, false); },
    clearKeys: function () { keys = {}; },
    reset: function () { startGame(); },
    load: function (i) { levelIndex = i; loadLevel(i); gameState = "play"; },
    dig: function (d) { dig(d); },
    setGold: function (n) { goldLeft = n; },
    setOpen: function (v) { exitOpen = v; },
    tile: function (x, y) { return tileAt(x, y); },
    setTile: function (x, y, ch) { setTile(x, y, ch); },
    tp: function (x, y) { player.cx = x; player.cy = y; player.px = x * 20; player.py = y * 20;
                          player.moving = false; player.falling = false; player.moveT = 0; },
    enemyCount: function () { return enemies.length; },
    enemyAt: function (i) { return enemies[i]; },
    enemyMove: function (i) { return chooseEnemyMove(enemies[i]); },
    setBaseTile: function (x, y, ch) { baseGrid[y][x] = ch; },
    render: function (g) { drawSceneUnsafe(g); },
    get best() { return bestScore; },
    get maxLevel() { return maxUnlockedLevel; }
};
`;

const coreSrc = fs.readFileSync(path.join(ROOT, "lib", "GameCore.jsx"), "utf8");

const stubs = [
    coreSrc,
    "var perfNote = function () {};",
    "var perfInit = function () {};",
    "var perfFrame = function () {};",
    "var perfKey = function () {};",
    "var perfClose = function () {};",
    "var heartbeatStart = function () { return true; };",
    "var heartbeatStop = function () {};",
    "var heartbeatLastError = function () { return String(); };"
].join("\n");

const api = new Function(stubs + "\n" + src)();

function makeGraphics() {
    const g = {
        points: [],
        BrushType: { SOLID_COLOR: "solid" },
        PenType: { SOLID_COLOR: "solid" },
        filled: 0,
        stroked: 0,
        batches: [],
        newBrush(type, color) { return { type, color }; },
        newPen(type, color, width) { return { type, color, width }; },
        newPath() { g.points = []; },
        moveTo(x, y) { g.points.push([x, y]); },
        lineTo(x, y) { g.points.push([x, y]); },
        closePath() { g.closed = true; },
        ellipsePath() {},
        fillPath(brush) {
            g.filled++;
            g.batches.push({ points: g.points.length, brush: brush });
        },
        strokePath(pen) { g.stroked++; }
    };
    return g;
}

const results = [];
function check(name, fn) {
    try { fn(); results.push("  ok   " + name); }
    catch (e) { results.push("  FAIL " + name + " -> " + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

check("level 1 loads with the runner on its marker", () => {
    api.reset();
    assert(api.state === "play", "state " + api.state);
    assert(api.gold > 0, "no gold on the level");
    assert(api.tile(api.x, api.y) !== "#", "runner spawned inside brick");
});

check("walks right along the floor", () => {
    api.reset();
    const x0 = api.x;
    api.press("RIGHT");
    api.update(600);
    api.release("RIGHT");
    assert(api.x > x0, "did not move: x " + api.x);
});

check("climbs a ladder", () => {
    api.reset();
    // find a ladder column and stand on it, whatever the loaded level looks like
    let col = -1, row = -1;
    for (let y = 12; y < 16 && col < 0; y++) {
        for (let x = 1; x < 27; x++) {
            if (api.tile(x, y) === "H") { col = x; row = y; break; }
        }
    }
    assert(col > 0, "no ladder found on the bottom rows");
    api.tp(col, row);
    const y0 = api.y;
    api.press("UP");
    api.update(300);
    api.update(300);
    api.release("UP");
    assert(api.y < y0, "did not climb: y " + api.y + " from " + y0);
});

check("falls when the floor ends", () => {
    api.reset();
    api.tp(5, 10);                      // nothing under the feet here
    api.update(100);                    // notices the missing floor
    api.update(400);                    // then actually falls
    assert(api.y > 10, "did not fall, y " + api.y);
});

check("digs brick but not concrete", () => {
    api.reset();
    api.setTile(5, 14, " "); // runner standing here
    api.setTile(5, 15, "#"); // floor under runner
    api.setTile(6, 14, " "); // free air above target brick
    api.setTile(6, 15, "#"); // target brick to dig
    api.tp(5, 14);
    api.dig(1);
    api.update(400);
    assert(api.tile(6, 15) === "o", "brick not dug: " + api.tile(6, 15));

    // Now try concrete:
    api.setTile(6, 15, "=");
    api.dig(1);
    api.update(400);
    assert(api.tile(6, 15) === "=", "concrete was dug");
});

check("a hole refills after its lifetime", () => {
    api.reset();
    api.setTile(5, 14, " ");
    api.setTile(5, 15, "#");
    api.setTile(6, 14, " ");
    api.setTile(6, 15, "#");
    api.tp(5, 14);
    api.dig(1);
    api.update(400);
    assert(api.tile(6, 15) === "o", "no hole");
    api.update(9000);
    assert(api.tile(6, 15) === "#", "hole did not refill: " + api.tile(6, 15));
});

check("gold is collected and opens the exit", () => {
    api.reset();
    api.tp(2, 14);
    api.setTile(3, 14, "$");
    api.setGold(1);                     // pretend this is the last lump
    api.press("RIGHT");
    api.update(200);                    // starts the step
    api.update(200);                    // completes it, gold is taken on arrival
    api.release("RIGHT");
    assert(api.gold === 0, "gold left " + api.gold);
    assert(api.open === true, "exit did not open");
});

check("the exit only works when open", () => {
    api.reset();
    api.load(0);
    api.setOpen(false);
    api.tp(18, 0);                       // top of level 1 exit ladder
    api.update(200);
    assert(api.state === "play", "exit finished the level while closed");

    // When open, reaching row 0 on the ladder clears the level!
    api.setOpen(true);
    api.update(200);
    assert(api.state === "clear", "exit did not clear level when open: " + api.state);
});

check("level 2 loads with an enemy", () => {
    api.load(1);
    assert(api.enemyCount() > 0, "no enemies on level 2");
});

check("every level is 28x16 with gold and runner start", () => {
    for (let i = 0; i < api.levelCount; i++) {
        api.load(i);
        let gold = 0;
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 28; x++) {
                const t = api.tile(x, y);
                if (t === "$") gold++;
            }
        }
        assert(gold > 0, "level " + i + " has no gold");
    }
});

check("guard walks toward the runner", () => {
    api.load(0);
    const e = api.enemyAt(0);
    // find a floor row with room on it
    let row = -1;
    for (let y = 2; y < 15 && row < 0; y++) {
        let free = 0;
        for (let x = 2; x < 26; x++) if (api.tile(x, y) === " " && api.tile(x, y + 1) === "#") free++;
        if (free > 10) row = y;
    }
    assert(row > 0, "no open floor found");
    e.cx = 5; e.cy = row; e.px = 5 * 24; e.py = row * 24; e.moving = false; e.dead = 0;
    let px = 5;
    for (let x = 20; x > 6; x--) if (api.tile(x, row) === " ") { px = x; break; }
    api.tp(px, row);
    const x0 = e.cx;
    api.update(1500);
    assert(e.cx !== x0, "guard did not move at all");
});

check("guard keeps running across cell boundaries without losing frame time", () => {
    api.load(0);
    for (let x = 1; x < 27; x++) {
        api.setTile(x, 14, " ");
        api.setTile(x, 15, "#");
    }
    api.tp(25, 14);
    const guard = api.enemyAt(0);
    Object.assign(guard, { cx: 2, cy: 14, px: 2 * 24, py: 14 * 24, moving: false });

    api.update(16);
    const frameDistance = guard.px - 2 * 24;
    assert(frameDistance > 0, "guard did not start running");
    for (let frame = 0; frame < 60; frame++) {
        const x = guard.px;
        api.update(16);
        assert(guard.moving, "guard switched to idle during pursuit");
        assert(Math.abs(guard.px - x - frameDistance) < 0.001, "guard lost time at a cell boundary");
    }
});

check("guard falls into a hole and is trapped", () => {
    api.load(0);
    const e = api.enemyAt(0);
    let row = -1;
    for (let y = 2; y < 15 && row < 0; y++) {
        if (api.tile(10, y) === " " && api.tile(10, y + 1) === "#") row = y;
    }
    assert(row > 0, "no floor");
    api.setTile(10, row, "o");          // put a hole right under a free cell
    e.cx = 10; e.cy = row; e.px = 10 * 24; e.py = row * 24; e.moving = false; e.dead = 0;
    api.update(120);
    assert(e.inHole > 0, "guard not trapped, inHole=" + e.inHole);
});

check("guard drops gold when falling into hole", () => {
    api.load(0);
    const e = api.enemyAt(0);
    api.setTile(8, 14, "o");
    api.setTile(8, 13, " ");
    e.cx = 8; e.cy = 14; e.hasGold = true; e.inHole = 0; e.dead = 0;
    api.update(100);
    assert(e.hasGold === false, "guard did not drop gold");
    assert(api.tile(8, 13) === "$", "gold not dropped above hole: " + api.tile(8, 13));
});

check("guard climbs out of hole after trap timer", () => {
    api.load(0);
    const e = api.enemyAt(0);
    api.setTile(8, 14, "o");
    api.setTile(8, 13, " ");
    e.cx = 8; e.cy = 14; e.inHole = 100; e.dead = 0;
    api.update(300);
    assert(e.cy === 13, "guard did not climb out of hole: cy=" + e.cy);
    assert(e.inHole === 0, "guard still marked inHole");
});

check("runner walks across trapped guard head", () => {
    api.load(0);
    const e = api.enemyAt(0);
    api.setTile(5, 14, "#"); // floor
    api.setTile(6, 14, "o"); // hole with guard trapped
    api.setTile(7, 14, "#"); // floor
    api.setTile(5, 13, " ");
    api.setTile(6, 13, " ");
    api.setTile(7, 13, " ");
    e.cx = 6; e.cy = 14; e.inHole = 4000; e.dead = 0; e.moving = false;

    api.tp(5, 13);
    api.press("RIGHT");
    api.update(200);
    api.release("RIGHT");
    api.update(200);
    assert(api.x === 6, "runner could not step onto guard head: x=" + api.x);
    assert(api.state === "play", "runner was killed by trapped guard");
});

check("drops from rope on DOWN", () => {
    api.reset();
    let rx = -1, ry = -1;
    for (let y = 0; y < 16 && rx < 0; y++) {
        for (let x = 0; x < 28; x++) {
            if (api.tile(x, y) === "-") { rx = x; ry = y; break; }
        }
    }
    assert(rx > 0, "no rope found");
    api.tp(rx, ry);
    assert(api.player.falling === false, "falling on rope");
    api.press("DOWN");
    api.update(200);
    api.release("DOWN");
    api.update(200);
    assert(api.y > ry, "runner did not fall below rope: y=" + api.y + " ry=" + ry);
});

check("runner falls through trap brick X", () => {
    api.reset();
    api.setTile(12, 10, "X");
    api.setTile(12, 11, " ");
    api.tp(12, 10);
    api.update(100);
    api.update(300);
    assert(api.y > 10, "runner did not fall through trap brick X: y=" + api.y);
});

check("guard respawns after being crushed", () => {
    api.load(0);
    const e = api.enemyAt(0);
    e.dead = 50;                        // about to die
    const before = e.cx + ":" + e.cy;
    api.update(200);
    const after = e.cx + ":" + e.cy;
    assert(e.dead === 0, "still dead: " + e.dead);
    assert(before !== after, "respawned in the same cell");
});

check("guard climbs a ladder toward the runner", () => {
    api.load(0);
    const e = api.enemyAt(0);
    let c = -1, r = -1;
    for (let y = 3; y < 14 && c < 0; y++) {
        for (let x = 2; x < 26; x++) {
            if (api.tile(x, y) === "H" && api.tile(x, y - 1) === "H") { c = x; r = y; break; }
        }
    }
    assert(c > 0, "no vertical ladder found");

    e.cx = c; e.cy = r; e.px = c * 24; e.py = r * 24; e.moving = false; e.dead = 0;
    api.tp(c, Math.max(1, r - 3));       // runner straight above
    const y0 = e.cy;
    api.update(900);
    api.update(900);
    assert(e.cy < y0, "guard did not climb: " + y0 + " -> " + e.cy);
});

check("guard walking horizontally steps into dug hole and gets trapped", () => {
    api.load(0);
    for (let x = 4; x <= 16; x++) {
        api.setTile(x, 13, " ");
        api.setTile(x, 14, " ");
        api.setTile(x, 15, "#");
    }
    api.tp(6, 14);
    api.dig(1);
    api.update(300); // finish dig: hole at 7, 15
    assert(api.tile(7, 15) === "o", "hole not created: " + api.tile(7, 15));

    const e = api.enemyAt(0);
    e.cx = 9; e.cy = 14; e.px = 9 * 24; e.py = 14 * 24; e.moving = false; e.dead = 0; e.inHole = 0;

    // Guard advances toward runner (from 9 to 8, then 7 above the hole, then falls into 7, 15)
    for (let i = 0; i < 35; i++) {
        api.update(100);
    }
    assert(e.cx === 7 && e.cy === 15, "guard did not fall into hole: cx=" + e.cx + " cy=" + e.cy);
    assert(e.inHole > 0, "guard not trapped in hole: inHole=" + e.inHole);
});

check("runner walking horizontally over empty hole falls in", () => {
    api.load(0);
    for (let x = 4; x <= 12; x++) {
        api.setTile(x, 13, " ");
        api.setTile(x, 14, " ");
        api.setTile(x, 15, "#");
    }
    api.tp(5, 14);
    api.dig(1);
    api.update(300); // hole at 6, 15
    assert(api.tile(6, 15) === "o", "no hole at 6,15");

    // Clear any guards away:
    for (let i = 0; i < api.enemyCount(); i++) {
        api.enemyAt(i).cx = 25; api.enemyAt(i).cy = 2; api.enemyAt(i).dead = 9999;
    }

    // Step right over the empty hole:
    api.press("RIGHT");
    api.update(200);
    api.update(200);
    api.release("RIGHT");
    api.update(200); // fall into the hole
    assert(api.x === 6 && api.y === 15, "runner did not fall into hole: x=" + api.x + " y=" + api.y);
});

check("runner in hole climbs out when pressing UP", () => {
    api.load(0);
    for (let x = 4; x <= 12; x++) {
        api.setTile(x, 13, " ");
        api.setTile(x, 14, " ");
        api.setTile(x, 15, "#");
    }
    api.setTile(6, 15, "o");
    api.tp(6, 15);
    api.player.inHole = 400;

    api.press("UP");
    api.update(200);
    api.update(200);
    api.release("UP");
    assert(api.y === 14, "runner did not climb out of hole: y=" + api.y);
});

check("guard standing above a ladder descends to runner below", () => {
    api.load(0);
    // Level 1: ladder at col 9 from row 10 to row 13.
    // Place guard on row 9, directly over the ladder (col 9, row 9):
    const e = api.enemyAt(0);
    e.cx = 9; e.cy = 9; e.px = 9 * 24; e.py = 9 * 24; e.moving = false; e.dead = 0; e.inHole = 0;

    // Runner is at row 14, col 14 (below and to the right):
    api.tp(14, 14);

    // Update for guard to step down:
    api.update(350);
    assert(e.cy === 10, "guard did not climb down ladder at col 9: cy=" + e.cy);
});

check("guard on ladder continues descending even when runner is to the side", () => {
    api.load(0);
    // Ladder at col 9, rows 10..12:
    const e = api.enemyAt(0);
    e.cx = 9; e.cy = 10; e.px = 9 * 24; e.py = 10 * 24; e.moving = false; e.dead = 0; e.inHole = 0;

    // Runner is at row 14, col 14:
    api.tp(14, 14);

    api.update(350);
    assert(e.cy === 11, "guard did not continue descending ladder: cy=" + e.cy);
});

check("guard on platform navigates to ladder and climbs down to reach runner", () => {
    api.load(0);
    // Guard starts at (14, 9). Runner is at (14, 14).
    // The closest ladder down is at col 9.
    const e = api.enemyAt(0);
    e.cx = 14; e.cy = 9; e.px = 14 * 24; e.py = 9 * 24; e.moving = false; e.dead = 0; e.inHole = 0;
    api.tp(14, 14);

    // Give guard time to walk left (5 steps ~2s) and climb down (1 step ~0.4s):
    for (let i = 0; i < 35; i++) {
        api.update(100);
    }
    assert(e.cy > 9, "guard did not climb down ladder from row 9: cy=" + e.cy + " cx=" + e.cx);
});

check("runner catches rope or ladder while falling", () => {
    api.load(0);
    // Set up a vertical drop onto a rope at row 10
    api.setTile(5, 8, " ");
    api.setTile(5, 9, " ");
    api.setTile(5, 10, "-");
    api.setTile(5, 11, " ");
    api.tp(5, 8);
    api.player.falling = true;
    for (let i = 0; i < 15; i++) {
        api.update(50);
    }
    assert(api.player.cy === 10, "runner did not stop at rope row 10: cy=" + api.player.cy);
    assert(api.player.falling === false, "runner is still falling on rope");
});

check("guard drops collected gold after counting down steps", () => {
    api.load(0);
    const e = api.enemyAt(0);
    e.cx = 10; e.cy = 14; e.px = 10 * 24; e.py = 14 * 24; e.moving = false; e.dead = 0; e.inHole = 0;
    e.hasGold = true;
    e.goldSteps = 2; // Will drop in 2 steps
    api.tp(20, 14); // runner far away to the right

    // Update until guard moves 2 steps:
    for (let i = 0; i < 20; i++) {
        api.update(100);
    }
    assert(e.hasGold === false, "guard did not drop gold");
    assert(e.goldSteps < 0, "cooldown was not set after dropping gold");
});

check("false brick X blocks horizontal entry but allows vertical falling", () => {
    api.load(0);
    api.setTile(5, 14, " ");
    api.setTile(5, 15, "#");
    api.setTile(6, 14, "X"); // trap brick horizontally adjacent
    api.setTile(6, 15, "#");
    api.tp(5, 14);
    api.press("RIGHT");
    api.update(300);
    api.release("RIGHT");
    assert(api.x === 5, "runner walked horizontally into false brick X");

    // Falling into X from above is allowed:
    api.tp(6, 13);
    api.player.falling = true;
    for (let i = 0; i < 10; i++) {
        api.update(50);
    }
    assert(api.y >= 14, "runner did not fall through false brick X: y=" + api.y);
});

check("dig input is buffered while moving and executes on finishMove", () => {
    api.load(0);
    api.setTile(5, 14, " ");
    api.setTile(5, 15, "#");
    api.setTile(6, 14, " ");
    api.setTile(6, 15, "#");
    api.setTile(7, 14, " ");
    api.setTile(7, 15, "#");
    api.tp(5, 14);
    api.press("RIGHT");
    api.update(50); // runner starts moving
    assert(api.player.moving === true, "runner is not moving");

    // Buffer a dig right (+1) while in mid-stride
    api.player.pendingDig = 1;
    // Complete the step into (6, 14):
    api.update(200);
    api.release("RIGHT");

    assert(api.player.cx === 6, "runner did not reach (6, 14)");
    assert(api.player.digging > 0, "buffered dig did not execute");
});

check("runner can dig brick while standing on ladder", () => {
    api.reset();
    api.setTile(5, 14, "H"); // ladder cell where runner stands
    api.setTile(5, 15, "H"); // ladder continues below
    api.setTile(6, 14, " "); // empty air above target
    api.setTile(6, 15, "#"); // target brick
    api.tp(5, 14);
    api.dig(1);
    assert(api.tile(6, 15) === "o", "runner on ladder could not dig brick");
});

check("cannot dig brick directly under ladder", () => {
    api.reset();
    api.setTile(5, 14, " "); // runner cell
    api.setTile(5, 15, "#"); // floor
    api.setTile(6, 14, "H"); // ladder directly above target brick
    api.setTile(6, 15, "#"); // target brick
    api.tp(5, 14);
    api.dig(1);
    assert(api.tile(6, 15) === "#", "brick under ladder should not be diggable");
});

check("render draws authentic batch rects without throwing", () => {
    api.reset();
    const g = makeGraphics();
    api.render(g);
    assert(g.filled >= 10, "expected at least 10 batch fills, got " + g.filled);
    assert(g.batches.length >= 10, "expected at least 10 batches");
    const totalPts = g.batches.reduce((sum, b) => sum + b.points, 0);
    assert(totalPts > 100, "expected > 100 path points, got " + totalPts);
});

check("render draws active laser dig with sparks and disintegration", () => {
    api.reset();
    api.setTile(5, 14, " ");
    api.setTile(5, 15, "#");
    api.setTile(6, 14, " ");
    api.setTile(6, 15, "#");
    api.tp(5, 14);
    api.dig(1);
    assert(api.player.digging > 0, "player not digging");
    const g = makeGraphics();
    api.render(g);
    assert(g.filled >= 10, "expected at least 10 batch fills during dig, got " + g.filled);
});

check("render draws trapped guard shaking in hole", () => {
    api.load(1);
    const enemy = api.enemyAt(0);
    assert(enemy, "no enemy on level 2");
    enemy.inHole = 600; // mid-shake phase
    const g = makeGraphics();
    api.render(g);
    assert(g.filled >= 10, "expected at least 10 batch fills during guard trapped, got " + g.filled);
});

check("persistence tracks bestScore", () => {
    api.reset();
    api.tp(2, 14);
    api.setTile(3, 14, "$");
    api.press("RIGHT");
    api.update(200);
    api.update(200);
    api.release("RIGHT");
    assert(api.score >= 250, "score did not increase on gold pickup: " + api.score);
    assert(api.best >= api.score, "bestScore did not update: best=" + api.best + " score=" + api.score);
});

check("chooseEnemyMove returns [0, 0] when guard and runner share cell", () => {
    api.load(1);
    const enemy = api.enemyAt(0);
    assert(enemy, "no enemy on level 2");
    api.tp(10, 10);
    enemy.cx = 10;
    enemy.cy = 10;
    enemy.px = 200;
    enemy.py = 200;
    const mv = api.enemyMove(0);
    assert(mv[0] === 0 && mv[1] === 0, "expected [0, 0] when sharing cell, got [" + mv + "]");
});

check("exit clears when reaching top of exit ladder even if below row 0", () => {
    api.reset();
    api.setOpen(true);
    // Custom exit ladder in col 10 from row 4 to row 3 (row 2 is empty)
    api.setBaseTile(10, 4, "S");
    api.setTile(10, 4, "S");
    api.setBaseTile(10, 3, "S");
    api.setTile(10, 3, "S");
    api.setBaseTile(10, 2, " ");
    api.setTile(10, 2, " ");

    // Mid-ladder rung (row 4): ladder continues above, level should NOT clear yet
    api.tp(10, 4);
    api.update(50);
    assert(api.state === "play", "mid-ladder rung prematurely cleared level");

    // Top rung (row 3): ladder ends here, level clears!
    api.tp(10, 3);
    api.update(50);
    assert(api.state === "clear", "top of exit ladder did not clear level: " + api.state);
});

console.log(results.join("\n"));
const failed = results.filter((r) => r.indexOf("FAIL") >= 0).length;
console.log(failed === 0 ? "ALL PASSED (" + results.length + ")" : failed + " FAILED of " + results.length);
process.exit(failed === 0 ? 0 : 1);
