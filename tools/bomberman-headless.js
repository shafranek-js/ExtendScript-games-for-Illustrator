// Headless logic tests for Bomberman.jsx - runs the real game code in Node.
//
//   node tools/bomberman-headless.js
//
// The ScriptUI tail is cut off before `var win = new Window`, window/perf/persist
// calls are stubbed, and update(dt) + drawSceneUnsafe(g) are driven directly.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let src = fs.readFileSync(path.join(ROOT, "Bomberman.jsx"), "utf8").replace(/^\uFEFF/, "");

const cut = src.indexOf("var win = new Window");
if (cut < 0) throw new Error("window creation not found in Bomberman.jsx");
src = src.substring(0, cut)
    .replace(/^#target[^\n]*$/gm, "")
    .replace(/^#include[^\n]*$/gm, "")
    .replace(/\(function \(\) \{/, "");

src += `
return {
    get COLS() { return COLS; },
    get ROWS() { return ROWS; },
    get TILE_EMPTY() { return TILE_EMPTY; },
    get TILE_HARD() { return TILE_HARD; },
    get TILE_SOFT() { return TILE_SOFT; },
    get state() { return gameState; },
    set state(s) { gameState = s; },
    get score() { return score; },
    get best() { return bestScore; },
    get stage() { return stage; },
    get lives() { return lives; },
    set lives(v) { lives = v; },
    get x() { return player.x; },
    get y() { return player.y; },
    get maxBombs() { return player.maxBombs; },
    get fireRange() { return player.fireRange; },
    get speedLevel() { return player.speedLevel; },
    get invuln() { return player.invulnTimer; },
    set invuln(v) { player.invulnTimer = v; },
    get door() { return door; },
    get statusKey() { return currentStatusKey; },
    cell(x, y) { return grid[y][x]; },
    setCell(x, y, val) { grid[y][x] = val; },
    bombCount() { return bombs.length; },
    bombAt(i) { return bombs[i]; },
    clearBombs() { bombs = []; flames = []; },
    flameCount() { return flames.length; },
    hasFlameAt(gx, gy) { return !!flameAt(gx, gy); },
    enemyCount() { return enemies.length; },
    enemyAt(i) { return enemies[i]; },
    setEnemies(list) { enemies = list; },
    powerupCount() { return powerups.length; },
    powerupAt(i) { return powerups[i]; },
    addHiddenPowerup(gx, gy, type) { hiddenPowerups[keyFor(gx, gy)] = type; },
    addOpenPowerup(gx, gy, type) { powerups.push({ gx: gx, gy: gy, type: type, immuneWaveId: 0, phase: 0 }); },
    tp(x, y) { player.x = x; player.y = y; },
    plant() { return placeBomb(); },
    setTheme(t) { currentThemeName = t; },
    press(dir) { setKey(dir, true); },
    release(dir) { setKey(dir, false); },
    clearKeys() { clearInputState(); },
    pause() { togglePause(); },
    reset() { newGame(); },
    loadStage(n) { initStage(n); gameState = "play"; },
    update(dt) { update(dt); },
    stepSec(totalSec, stepDt) {
        var dt = stepDt || 0.02;
        var steps = Math.round(totalSec / dt);
        for (var i = 0; i < steps; i++) update(dt);
    },
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
        newBrush(type, color) { return { type, color }; },
        newPen(type, color, width) { return { type, color, width }; },
        newPath() { g.points = []; },
        moveTo(x, y) { g.points.push([x, y]); },
        lineTo(x, y) { g.points.push([x, y]); },
        closePath() { g.closed = true; },
        ellipsePath() {},
        fillPath() { g.filled++; },
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

function clearAreaRect(x0, y0, x1, y1) {
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            if (api.cell(x, y) === api.TILE_SOFT) api.setCell(x, y, api.TILE_EMPTY);
        }
    }
}

check("initial stage 1 builds 15x13 maze, safe corner, and 5 foes", () => {
    api.loadStage(1);
    api.state = "ready";
    assert(api.COLS === 15 && api.ROWS === 13, "expected 15x13 grid");
    assert(api.cell(0, 0) === api.TILE_HARD, "outer perimeter must be HARD");
    assert(api.cell(2, 2) === api.TILE_HARD, "pillar (2,2) must be HARD");
    assert(api.cell(1, 1) === api.TILE_EMPTY, "spawn (1,1) must be EMPTY");
    assert(api.cell(2, 1) === api.TILE_EMPTY, "safe right (2,1) must be EMPTY");
    assert(api.cell(1, 2) === api.TILE_EMPTY, "safe down (1,2) must be EMPTY");
    assert(api.enemyCount() === 5, "stage 1 should spawn 5 enemies, got " + api.enemyCount());
    assert(api.x === 1.5 && api.y === 1.5, "player spawn mismatch");
});

check("player moves cleanly and corner-assists into corridor", () => {
    api.reset();
    api.setEnemies([]);
    clearAreaRect(1, 1, 5, 3);
    // Offset vertically near pillar (2,2) edge, then press right into corridor y=1
    api.tp(1.5, 1.82);
    api.press("right");
    api.stepSec(0.5, 0.02);
    api.release("right");
    assert(api.x > 2.2, "corner-assist should guide player past pillar edge, x=" + api.x);
    assert(Math.abs(api.y - 1.5) <= 0.19, "player should clear pillar edge near 1.5, y=" + api.y);
});

check("bomb allows player exit then becomes solid blocker", () => {
    api.reset();
    api.setEnemies([]);
    clearAreaRect(1, 1, 5, 1);
    api.tp(1.5, 1.5);
    assert(api.plant() === true, "should plant bomb at (1,1)");
    assert(api.bombCount() === 1, "expected 1 active bomb");
    assert(api.bombAt(0).solidForPlayer === false, "bomb starts passable while player stands on it");

    api.press("right");
    api.stepSec(0.35, 0.02);
    api.release("right");
    assert(api.x > 2.2, "player should walk off own bomb, x=" + api.x);
    assert(api.bombAt(0).solidForPlayer === true, "bomb must solidify after player exits cell");

    const xBefore = api.x;
    api.press("left");
    api.stepSec(0.35, 0.02);
    api.release("left");
    assert(api.x >= 2.25 && api.x <= xBefore, "solid bomb must block re-entry, x=" + api.x);
});

check("blast destroys TILE_SOFT, awards +15, and stops at TILE_HARD", () => {
    api.reset();
    api.setEnemies([]);
    clearAreaRect(1, 1, 5, 5);
    api.setCell(3, 1, api.TILE_SOFT);
    api.setCell(4, 1, api.TILE_EMPTY);
    api.tp(1.5, 1.5);

    // Give range 3 by putting bomb at (1,1); pillar at (2,2) blocks below, (3,1) is soft
    api.addOpenPowerup(1, 1, "fire");
    api.stepSec(0.02, 0.02);
    api.addOpenPowerup(1, 1, "fire");
    api.stepSec(0.02, 0.02);
    assert(api.fireRange === 3, "expected fireRange 3");

    const scoreBefore = api.score;
    api.plant();
    api.tp(1.5, 2.5); // move out of (1,1) horizontal ray (behind pillar 2,2 is safe)
    api.tp(3.5, 3.5);
    api.stepSec(2.3, 0.02);

    assert(api.cell(3, 1) === api.TILE_EMPTY, "soft block at (3,1) must break");
    assert(api.hasFlameAt(3, 1) === true, "flame should reach broken block (3,1)");
    assert(api.hasFlameAt(4, 1) === false, "blast must NOT pass beyond broken soft block");
    assert(api.hasFlameAt(0, 1) === false, "blast must NOT enter HARD border (0,1)");
    assert(api.score === scoreBefore + 15, "breaking 1 soft block should award +15 pts");
});

check("chain detonation triggers nearby bomb within 0.08s", () => {
    api.reset();
    api.setEnemies([]);
    clearAreaRect(1, 1, 5, 1);
    api.addOpenPowerup(1, 1, "bomb");
    api.addOpenPowerup(1, 1, "fire");
    api.stepSec(0.02, 0.02);

    api.tp(1.5, 1.5);
    api.plant(); // bomb 0 at (1,1), range 2
    api.stepSec(1.2, 0.02);
    api.tp(3.5, 1.5);
    api.plant(); // bomb 1 at (3,1), freshly planted with ~2.2s fuse
    api.tp(1.5, 3.5);

    assert(api.bombCount() === 2, "expected 2 bombs before detonation");
    api.stepSec(1.15, 0.02); // first bomb detonates around 1.0s later, triggers second within 0.06s
    assert(api.bombCount() === 0, "second bomb should chain-detonate immediately, left=" + api.bombCount());
    assert(api.hasFlameAt(5, 1) === true, "chained bomb at (3,1) should flame (5,1)");
});

check("newly revealed powerup survives triggering blast; exposed powerup burns", () => {
    api.reset();
    api.setEnemies([]);
    clearAreaRect(1, 1, 5, 1);
    api.setCell(2, 1, api.TILE_SOFT);
    api.addHiddenPowerup(2, 1, "speed");
    api.addOpenPowerup(3, 1, "bomb");
    api.addOpenPowerup(1, 1, "fire");
    api.stepSec(0.02, 0.02); // fireRange=2, (3,1) still holds open powerup? Wait: (1,1) collected fire; set open powerup at (1,3)

    clearAreaRect(1, 1, 1, 5);
    api.addOpenPowerup(1, 3, "bomb"); // will sit inside range=2 downward from (1,1)
    api.tp(1.5, 1.5);
    api.plant();
    api.tp(5.5, 5.5);
    api.stepSec(2.3, 0.02);

    let foundHiddenSpeed = false;
    let foundExposedBomb = false;
    for (let i = 0; i < api.powerupCount(); i++) {
        const p = api.powerupAt(i);
        if (p.gx === 2 && p.gy === 1 && p.type === "speed") foundHiddenSpeed = true;
        if (p.gx === 1 && p.gy === 3 && p.type === "bomb") foundExposedBomb = true;
    }
    assert(foundHiddenSpeed === true, "newly revealed powerup must survive its own reveal blast");
    assert(foundExposedBomb === false, "already-exposed powerup in flame path must burn");
});

check("collecting bomb, fire, speed, and life powerups upgrades stats", () => {
    api.reset();
    api.setEnemies([]);
    clearAreaRect(1, 1, 6, 1);
    api.tp(1.5, 1.5);
    api.addOpenPowerup(1, 1, "bomb");
    api.addOpenPowerup(1, 1, "fire");
    api.addOpenPowerup(1, 1, "speed");
    api.addOpenPowerup(1, 1, "life");
    api.stepSec(0.05, 0.02);

    assert(api.maxBombs === 2, "bomb powerup should raise maxBombs to 2");
    assert(api.fireRange === 2, "fire powerup should raise fireRange to 2");
    assert(api.speedLevel === 1, "speed powerup should raise speedLevel to 1");
    assert(api.lives === 4, "life powerup should raise lives to 4");
    assert(api.powerupCount() === 0, "collected powerups should disappear");
});

check("enemies stay valid across 200 steps and phantoms traverse TILE_SOFT", () => {
    api.loadStage(2);
    let hasPhantom = false;
    for (let i = 0; i < api.enemyCount(); i++) {
        if (api.enemyAt(i).kind === "phantom") hasPhantom = true;
    }
    assert(hasPhantom === true, "stage 2 should include a phantom enemy");

    for (let step = 0; step < 200; step++) {
        api.update(0.03);
        for (let i = 0; i < api.enemyCount(); i++) {
            const e = api.enemyAt(i);
            const gx = Math.floor(e.x);
            const gy = Math.floor(e.y);
            assert(gx >= 1 && gx <= api.COLS - 2 && gy >= 1 && gy <= api.ROWS - 2,
                "enemy out of bounds: " + e.x + "," + e.y);
            assert(api.cell(gx, gy) !== api.TILE_HARD, "enemy entered HARD tile at " + gx + "," + gy);
            if (e.kind !== "phantom") {
                assert(api.cell(gx, gy) !== api.TILE_SOFT, "non-phantom entered SOFT tile");
            }
        }
    }
});

check("multi-kill combo awards bonus pts and opens portal notice on last foe", () => {
    api.reset();
    clearAreaRect(1, 1, 5, 3);
    api.setEnemies([
        { id: 901, kind: "ballom", gx: 2, gy: 1, x: 2.5, y: 1.5, dir: "right", speed: 0, phase: 0 },
        { id: 902, kind: "chaser", gx: 1, gy: 2, x: 1.5, y: 2.5, dir: "down", speed: 0, phase: 0 }
    ]);
    api.tp(1.5, 1.5);
    api.plant();
    api.tp(5.5, 3.5);
    api.stepSec(2.3, 0.02);

    assert(api.enemyCount() === 0, "both foes should be eliminated");
    // 100 + 200 + 100 combo = 400 (or 200 + 100 + 100 = 400 depending on loop order)
    assert(api.score === 400, "expected 400 combo pts, got " + api.score);
    assert(api.statusKey === "statusDoorOpen", "expected statusDoorOpen, got " + api.statusKey);
});

check("hazards reduce lives and reach gameover at 0 with best score saved", () => {
    api.reset();
    clearAreaRect(1, 1, 5, 3);
    api.setEnemies([
        { id: 905, kind: "ballom", gx: 3, gy: 1, x: 3.5, y: 1.5, dir: "left", speed: 0, phase: 0 }
    ]);
    api.invuln = 0;
    api.lives = 1;
    api.addOpenPowerup(1, 1, "bomb"); // +50 score
    api.stepSec(0.02, 0.02);

    api.tp(3.5, 1.5);
    api.stepSec(0.02, 0.02);

    assert(api.lives === 0, "expected 0 lives");
    assert(api.state === "gameover", "expected gameover, got " + api.state);
    assert(api.best >= 50, "best score should persist after gameover");
});

check("entering revealed portal with 0 foes clears stage and preserves upgrades", () => {
    api.reset();
    api.setEnemies([]);
    clearAreaRect(1, 1, 13, 11);
    api.addOpenPowerup(1, 1, "bomb");
    api.addOpenPowerup(1, 1, "fire");
    api.stepSec(0.02, 0.02);

    api.door.revealed = true;
    api.tp(api.door.x + 0.5, api.door.y + 0.5);
    api.stepSec(0.05, 0.02);

    assert(api.state === "clear", "expected stage clear overlay state, got " + api.state);
    api.stepSec(1.75, 0.05);
    assert(api.state === "play" && api.stage === 2, "should advance to stage 2");
    assert(api.maxBombs === 2 && api.fireRange === 2, "upgrades must carry over to stage 2");
});

check("drawSceneUnsafe renders cleanly across dark/light themes and overlays", () => {
    const g = makeGraphics();
    api.reset();
    api.setTheme("dark");
    api.state = "ready";
    api.render(g);
    const readyFills = g.filled;
    assert(readyFills > 10 && g.stroked > 5, "expected substantial vector primitives");

    api.setTheme("light");
    api.state = "pause";
    api.plant();
    api.render(g);
    assert(g.filled > readyFills, "light theme pause draw should succeed");

    api.state = "gameover";
    api.render(g);
    assert(g.strings.length === 0, "must never call ScriptUI drawString()");
});

console.log(results.join("\n"));
const failed = results.filter((r) => r.indexOf("  FAIL ") === 0);
if (failed.length) {
    console.error("\nFAILED (" + failed.length + ")");
    process.exit(1);
}
console.log("ALL PASSED (" + results.length + ")");
