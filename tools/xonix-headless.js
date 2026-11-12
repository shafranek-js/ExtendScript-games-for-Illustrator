// Headless logic tests for Xonix.jsx - runs the real game code in Node.
//
//   node tools/xonix-headless.js
//
// The ScriptUI tail is cut off before `var win = new Window`, window/perf/persist
// calls are stubbed, and update(dt) + drawSceneUnsafe(g) are driven directly.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let src = fs.readFileSync(path.join(ROOT, "Xonix.jsx"), "utf8").replace(/^\uFEFF/, "");

const cut = src.indexOf("var win = new Window");
if (cut < 0) throw new Error("window creation not found in Xonix.jsx");
src = src.substring(0, cut)
    .replace(/^#target[^\n]*$/gm, "")
    .replace(/^#include[^\n]*$/gm, "")
    .replace(/\(function \(\) \{/, "");

src += `
return {
    get COLS() { return COLS; },
    get ROWS() { return ROWS; },
    get CELL_SEA() { return CELL_SEA; },
    get CELL_LAND() { return CELL_LAND; },
    get CELL_TRAIL() { return CELL_TRAIL; },
    get x() { return runner.cx; },
    get y() { return runner.cy; },
    get dir() { return runner.dir; },
    get drawing() { return runner.drawing; },
    get invuln() { return runner.invulnTimer; },
    set invuln(v) { runner.invulnTimer = v; },
    get state() { return gameState; },
    get score() { return score; },
    get best() { return bestScore; },
    get stage() { return stage; },
    get lives() { return lives; },
    get pct() { return capturedPct; },
    get targetPct() { return targetPct; },
    get trailLen() { return trail.length; },
    set theme(t) { currentThemeName = t; },
    set lang(l) { currentLang = l; },
    cell(x, y) { return grid[y][x]; },
    seaCount() { return seaBalls.length; },
    seaAt(i) { return seaBalls[i]; },
    patrolCount() { return landPatrols.length; },
    patrolAt(i) { return landPatrols[i]; },
    tp(cx, cy) {
        runner.cx = cx;
        runner.cy = cy;
        runner.px = (cx + 0.5) * CELL;
        runner.py = (cy + 0.5) * CELL;
        runner.drawing = (grid[cy][cx] === CELL_TRAIL);
        runner.moveTimer = 0;
    },
    update(dt) { update(dt); },
    stepSec(totalSec, stepDt) {
        var dt = stepDt || 0.02;
        var steps = Math.round(totalSec / dt);
        for (var i = 0; i < steps; i++) update(dt);
    },
    press(dir) { setKey(dir, true); },
    release(dir) { setKey(dir, false); },
    clearKeys() { clearInputState(); },
    pause() { togglePause(); },
    reset() { newGame(); },
    loadStage(n) { initStage(n); gameState = "play"; },
    render(g) { drawSceneUnsafe(g); }
};
`;

const coreSrc = fs.readFileSync(path.join(ROOT, "lib", "GameCore.jsx"), "utf8");
const i18nSrc = fs.readFileSync(path.join(ROOT, "lib", "GameI18n.jsx"), "utf8");

const stubs = [
    coreSrc,
    i18nSrc,
    "var _memSave = {};",
    "function getGameSaveFile(tok) { return { token: tok }; }",
    "function readKeyValueFile(f) { return _memSave[f.token] || null; }",
    "function writeKeyValueFile(f, pairs) { var m = {}; for (var i = 0; i < pairs.length; i++) { var idx = pairs[i].indexOf('='); if (idx > 0) m[pairs[i].substring(0, idx)] = pairs[i].substring(idx + 1); } _memSave[f.token] = m; return true; }",
    "function perfNow() { return Date.now(); }",
    "function perfNote() {}",
    "function perfInit() {}",
    "function perfFrame() {}",
    "function perfKey() {}",
    "function perfClose() {}",
    "function heartbeatStart() { return true; }",
    "function heartbeatStop() {}",
    "function heartbeatLastError() { return ''; }"
].join("\n");

const api = new Function(stubs + "\n" + src)();

function makeGraphics() {
    const g = {
        points: [],
        strings: [],
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
            g.batches.push({ points: g.points.length, brush });
        },
        strokePath() { g.stroked++; },
        drawString(text, pen, x, y) { g.strings.push({ text, x, y }); }
    };
    return g;
}

const results = [];
function check(name, fn) {
    try { fn(); results.push("  ok   " + name); }
    catch (e) { results.push("  FAIL " + name + " -> " + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

check("initial stage 1 builds 2-cell border, 0% sea interior, entities placed", () => {
    api.reset();
    assert(api.state === "ready", "expected ready state, got " + api.state);
    assert(api.stage === 1, "expected stage 1");
    assert(api.lives === 3, "expected 3 lives");
    assert(api.pct === 0, "expected 0% captured initially, got " + api.pct);
    assert(api.cell(0, 0) === api.CELL_LAND, "corner must be LAND");
    assert(api.cell(1, 1) === api.CELL_LAND, "inner border corner must be LAND");
    assert(api.cell(2, 2) === api.CELL_SEA, "interior top-left must be SEA");
    assert(api.cell(api.COLS - 3, api.ROWS - 3) === api.CELL_SEA, "interior bottom-right must be SEA");
    assert(api.cell(api.COLS - 2, api.ROWS - 2) === api.CELL_LAND, "right border must be LAND");
    assert(api.seaCount() === 2, "stage 1 should have 2 sea balls");
    assert(api.patrolCount() === 1, "stage 1 should have 1 land patrol");
    assert(api.x === Math.floor(api.COLS / 2) && api.y === 0, "runner spawn mismatch");
});

check("entering sea leaves trail and auto-glides even after key release", () => {
    api.reset();
    api.press("down");
    api.stepSec(0.18, 0.02); // crosses y=1 (LAND) then enters y=2 (SEA)
    api.release("down");
    assert(api.state === "play", "state should become play");
    assert(api.drawing === true, "runner should be drawing in sea");
    assert(api.cell(api.x, api.y) === api.CELL_TRAIL, "current sea cell should be TRAIL");
    const yAfterEnter = api.y;
    api.stepSec(0.20, 0.02); // should keep gliding down without held keys
    assert(api.y > yAfterEnter, "runner should keep gliding in sea after release: " + api.y);
});

check("180-degree reversal is blocked while carving in sea", () => {
    api.reset();
    api.press("down");
    api.stepSec(0.25, 0.02);
    api.release("down");
    assert(api.drawing === true && api.dir === "down", "expected downward carve");
    api.press("up");
    api.stepSec(0.12, 0.02);
    api.release("up");
    assert(api.lives === 3, "180 reversal should not kill player, lives=" + api.lives);
    assert(api.dir === "down", "dir should remain down, got " + api.dir);
});

check("flood-fill converts enclosed side with 0 balls to land", () => {
    api.reset();
    api.loadStage(1);
    // Pin both sea balls safely on the left side of column 26
    api.seaAt(0).x = 8.5; api.seaAt(0).y = 12.5; api.seaAt(0).vx = 0; api.seaAt(0).vy = 0;
    api.seaAt(1).x = 14.5; api.seaAt(1).y = 22.5; api.seaAt(1).vx = 0; api.seaAt(1).vy = 0;
    api.patrolAt(0).x = 1.0; api.patrolAt(0).y = 16.5; api.patrolAt(0).vx = 0; api.patrolAt(0).vy = 0;

    api.tp(26, 1);
    api.press("down");
    api.release("down");
    // Step down 31 cells (from y=1 to y=32 LAND) at 0.088s/cell (~2.73s)
    api.stepSec(3.1, 0.02);

    assert(api.drawing === false, "runner should be back on bottom land, y=" + api.y);
    assert(api.trailLen === 0, "trail should clear after capture");
    assert(api.cell(35, 16) === api.CELL_LAND, "right half should be filled as LAND");
    assert(api.cell(10, 16) === api.CELL_SEA, "left half with sea balls must remain SEA");
    assert(api.pct >= 45, "captured pct should be ~50%, got " + api.pct);
    assert(api.score > 0, "score should increase after capture");
});

check("splitting balls across halves captures only trail, preserves both seas", () => {
    api.reset();
    api.loadStage(1);
    // One ball left, one ball right
    api.seaAt(0).x = 10.5; api.seaAt(0).y = 16.5; api.seaAt(0).vx = 0; api.seaAt(0).vy = 0;
    api.seaAt(1).x = 38.5; api.seaAt(1).y = 16.5; api.seaAt(1).vx = 0; api.seaAt(1).vy = 0;
    api.patrolAt(0).x = 1.0; api.patrolAt(0).y = 16.5; api.patrolAt(0).vx = 0; api.patrolAt(0).vy = 0;

    api.tp(26, 1);
    api.press("down");
    api.release("down");
    api.stepSec(3.1, 0.02);

    assert(api.drawing === false, "capture should complete at bottom land");
    assert(api.cell(26, 16) === api.CELL_LAND, "bisecting trail line should become LAND");
    assert(api.cell(10, 16) === api.CELL_SEA, "left sea should remain SEA");
    assert(api.cell(38, 16) === api.CELL_SEA, "right sea should remain SEA");
    assert(api.pct < 10, "only trail cells should convert (~2%), got " + api.pct);
});

check("looping into own trail loses life and restores trail back to sea", () => {
    api.reset();
    api.loadStage(1);
    api.seaAt(0).vx = 0; api.seaAt(0).vy = 0; api.seaAt(0).x = 6.5; api.seaAt(0).y = 25.5;
    api.seaAt(1).vx = 0; api.seaAt(1).vy = 0; api.seaAt(1).x = 8.5; api.seaAt(1).y = 25.5;
    api.patrolAt(0).vx = 0; api.patrolAt(0).vy = 0; api.patrolAt(0).x = 1.0; api.patrolAt(0).y = 20.5;

    api.tp(20, 1);
    // Go down 4 steps, right 3 steps, up 2 steps, left 3 steps -> crosses vertical trail at x=20
    api.press("down"); api.stepSec(0.38, 0.02); api.release("down");
    api.press("right"); api.stepSec(0.28, 0.02); api.release("right");
    api.press("up"); api.stepSec(0.18, 0.02); api.release("up");
    api.press("left"); api.stepSec(0.32, 0.02); api.release("left");

    assert(api.lives === 2, "crossing own trail should cost 1 life, lives=" + api.lives);
    assert(api.trailLen === 0, "trail must clear after death");
    assert(api.cell(20, 3) === api.CELL_SEA, "abandoned trail must revert to SEA");
    assert(api.x === Math.floor(api.COLS / 2) && api.y === 0, "runner should respawn at top center");
});

check("sea orb colliding with active trail cuts line and costs a life", () => {
    api.reset();
    api.loadStage(1);
    api.patrolAt(0).vx = 0; api.patrolAt(0).vy = 0; api.patrolAt(0).x = 1.0; api.patrolAt(0).y = 16.5;
    api.seaAt(0).vx = 0; api.seaAt(0).vy = 0; api.seaAt(0).x = 6.5; api.seaAt(0).y = 16.5;
    api.seaAt(1).vx = 0; api.seaAt(1).vy = 0; api.seaAt(1).x = 42.5; api.seaAt(1).y = 22.5;

    api.tp(26, 1);
    api.press("down");
    api.stepSec(0.45, 0.02); // lays trail at x=26, y=2..6
    api.release("down");
    assert(api.trailLen > 0 && api.cell(26, 3) === api.CELL_TRAIL, "expected trail at (26,3)");

    // Aim sea ball 0 right into (26, 3)
    api.seaAt(0).x = 25.4;
    api.seaAt(0).y = 3.5;
    api.seaAt(0).vx = 8.0;
    api.seaAt(0).vy = 0;
    api.stepSec(0.06, 0.01);

    assert(api.lives === 2, "sea ball hitting trail should cost 1 life, lives=" + api.lives);
    assert(api.trailLen === 0, "trail should clear when cut");
});

check("land patrol respects spawn invulnerability and kills when exposed", () => {
    api.reset();
    api.loadStage(1);
    api.invuln = 1.0;
    api.patrolAt(0).x = 26.5; api.patrolAt(0).y = 0.5;
    api.patrolAt(0).vx = 0; api.patrolAt(0).vy = 0;
    api.stepSec(0.10, 0.02);
    assert(api.lives === 3, "invuln shield should protect runner on land");

    api.invuln = 0;
    api.patrolAt(0).x = 26.5; api.patrolAt(0).y = 0.5;
    api.stepSec(0.04, 0.02);
    assert(api.lives === 2, "patrol should kill exposed runner on land, lives=" + api.lives);
});

check("entities remain within valid terrain across 200 simulation steps", () => {
    api.reset();
    api.loadStage(3);
    for (let i = 0; i < 200; i++) {
        api.update(0.05);
    }
    for (let i = 0; i < api.seaCount(); i++) {
        const b = api.seaAt(i);
        const cx = Math.floor(b.x), cy = Math.floor(b.y);
        assert(cx >= 0 && cx < api.COLS && cy >= 0 && cy < api.ROWS, "sea ball out of bounds");
        assert(api.cell(cx, cy) === api.CELL_SEA, "sea ball entered non-sea cell: " + cx + "," + cy);
    }
    for (let i = 0; i < api.patrolCount(); i++) {
        const p = api.patrolAt(i);
        const cx = Math.floor(p.x), cy = Math.floor(p.y);
        assert(cx >= 0 && cx < api.COLS && cy >= 0 && cy < api.ROWS, "patrol out of bounds");
        assert(api.cell(cx, cy) === api.CELL_LAND, "patrol left land cell: " + cx + "," + cy);
    }
});

check("stage clears at >= 75% and advances to stage 2 with 3 sea balls", () => {
    api.reset();
    api.loadStage(1);
    // Put both balls in far-left strip (x < 9) and slice vertically along x=10
    api.seaAt(0).x = 4.5; api.seaAt(0).y = 10.5; api.seaAt(0).vx = 0; api.seaAt(0).vy = 0;
    api.seaAt(1).x = 6.5; api.seaAt(1).y = 20.5; api.seaAt(1).vx = 0; api.seaAt(1).vy = 0;
    api.patrolAt(0).x = 1.0; api.patrolAt(0).y = 16.5; api.patrolAt(0).vx = 0; api.patrolAt(0).vy = 0;

    api.tp(10, 1);
    api.press("down");
    api.release("down");
    api.stepSec(3.2, 0.02);

    assert(api.state === "clear", "expected clear state at " + api.pct + "%, got " + api.state);
    api.stepSec(1.75, 0.05);
    assert(api.state === "play", "expected advance to stage 2 play, got " + api.state);
    assert(api.stage === 2, "expected stage 2, got " + api.stage);
    assert(api.pct === 0, "new stage should reset captured pct to 0");
    assert(api.seaCount() === 3, "stage 2 should spawn 3 sea balls");
});

check("gameover updates bestScore and reset restores clean stage 1", () => {
    api.reset();
    api.loadStage(1);
    api.seaAt(0).x = 6.5; api.seaAt(0).y = 12.5; api.seaAt(0).vx = 0; api.seaAt(0).vy = 0;
    api.seaAt(1).x = 6.5; api.seaAt(1).y = 20.5; api.seaAt(1).vx = 0; api.seaAt(1).vy = 0;
    api.patrolAt(0).x = 1.0; api.patrolAt(0).y = 16.5; api.patrolAt(0).vx = 0; api.patrolAt(0).vy = 0;

    // Earn points first
    api.tp(40, 1);
    api.press("down"); api.release("down");
    api.stepSec(3.1, 0.02);
    const earned = api.score;
    assert(earned > 0 && api.best >= earned, "best score should track earned score");

    // Lose 3 lives via exposed land patrol
    for (let k = 0; k < 3; k++) {
        api.invuln = 0;
        api.patrolAt(0).x = api.x + 0.5;
        api.patrolAt(0).y = api.y + 0.5;
        api.stepSec(0.04, 0.02);
    }
    assert(api.state === "gameover" && api.lives === 0, "expected gameover, got " + api.state);

    api.reset();
    assert(api.state === "ready" && api.score === 0 && api.lives === 3 && api.stage === 1,
        "reset should restore initial state");
    assert(api.best >= earned, "bestScore should persist across reset");
});

check("drawSceneUnsafe renders cleanly across dark/light themes and overlays", () => {
    api.reset();
    const gDark = makeGraphics();
    api.theme = "dark";
    api.render(gDark);
    assert(gDark.filled > 5 && gDark.stroked > 5, "expected filled & stroked shapes in dark theme");

    api.press("down");
    api.stepSec(0.3, 0.02);
    api.release("down");
    api.pause();
    const gLight = makeGraphics();
    api.theme = "light";
    api.render(gLight);
    assert(gLight.filled > 5 && gLight.stroked > 5, "expected filled & stroked shapes in light theme");
});

console.log(results.join("\n"));
const failed = results.filter((r) => r.indexOf("FAIL") >= 0).length;
console.log(failed === 0 ? "ALL PASSED (" + results.length + ")" : failed + " FAILED of " + results.length);
process.exit(failed === 0 ? 0 : 1);
