// Headless logic tests for BattleCity.jsx - runs the real game code in Node.
//
//   node tools/battlecity-headless.js

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let src = fs.readFileSync(path.join(ROOT, "BattleCity.jsx"), "utf8").replace(/^\uFEFF/, "");

const cut = src.indexOf("var win = new Window");
if (cut < 0) throw new Error("window creation not found in BattleCity.jsx");
src = src.substring(0, cut)
    .replace(/^#target[^\n]*$/gm, "")
    .replace(/^#include[^\n]*$/gm, "")
    .replace(/\(function \(\) \{/, "");

src += `
return {
    get COLS() { return COLS; },
    get ROWS() { return ROWS; },
    get TILE_EMPTY() { return TILE_EMPTY; },
    get TILE_BRICK() { return TILE_BRICK; },
    get TILE_STEEL() { return TILE_STEEL; },
    get TILE_WATER() { return TILE_WATER; },
    get TILE_TREES() { return TILE_TREES; },
    get TILE_ICE() { return TILE_ICE; },
    get TILE_EAGLE() { return TILE_EAGLE; },
    get state() { return gameState; },
    set state(s) { gameState = s; },
    get score() { return score; },
    get best() { return bestScore; },
    get stage() { return stage; },
    get lives() { return lives; },
    set lives(v) { lives = v; },
    get eagleDestroyed() { return eagleDestroyed; },
    get player() { return player; },
    get freezeTimer() { return freezeTimer; },
    get shovelTimer() { return shovelTimer; },
    cell(x, y) { return grid[y][x]; },
    setCell(x, y, val) { grid[y][x] = val; },
    clearAllTerrain() {
        for (var y = 0; y < ROWS; y++) {
            for (var x = 0; x < COLS; x++) {
                if (grid[y][x] !== TILE_EAGLE) grid[y][x] = TILE_EMPTY;
            }
        }
    },
    remainingTotal() { return remainingTotalFoes(); },
    clearQueue() { enemyQueue = []; pendingSpawns = []; },
    enemyCount() { return enemies.length; },
    enemyAt(i) { return enemies[i]; },
    setEnemies(list) { enemies = list; },
    bulletCount() { return bullets.length; },
    bulletsList() { return bullets; },
    clearBullets() { bullets = []; player.cooldown = 0; },
    powerupCount() { return powerups.length; },
    spawnPowerup(x, y, type) { powerups = [{ x: x, y: y, type: type, timer: 14 }]; },
    fire() { return firePlayerBullet(); },
    fireEnemy(e) { fireEnemyBullet(e); },
    tp(x, y, dir) {
        player.x = x; player.y = y;
        if (dir) player.dir = dir;
        player.cooldown = 0;
    },
    setTheme(t) { currentThemeName = t; },
    press(dir) { setKey(dir, true); },
    release(dir) { setKey(dir, false); },
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

check("stage 1 builds 26x26 field, HQ Eagle, brick fortress, and 20 foes queue", () => {
    api.loadStage(1);
    assert(api.COLS === 26 && api.ROWS === 26, "expected 26x26");
    assert(api.cell(12, 24) === api.TILE_EAGLE && api.cell(13, 25) === api.TILE_EAGLE, "HQ Eagle at 12..13,24..25");
    assert(api.cell(11, 24) === api.TILE_BRICK && api.cell(12, 23) === api.TILE_BRICK, "HQ ringed by brick");
    assert(api.player.x === 9 && api.player.y === 25, "player spawn mismatch");
    assert(api.remainingTotal() === 20, "stage must queue 20 foes, got " + api.remainingTotal());
});

check("90-degree turn snaps to integer corridor and enters 2-tile gap", () => {
    api.reset();
    api.clearQueue();
    api.clearAllTerrain();
    // Create 2-tile wide vertical corridor at x=8..9 blocked on left (x=7) and right (x=10)
    api.setCell(7, 20, api.TILE_STEEL);
    api.setCell(7, 21, api.TILE_STEEL);
    api.setCell(10, 20, api.TILE_STEEL);
    api.setCell(10, 21, api.TILE_STEEL);
    api.tp(9.35, 22, "right");
    api.press("up");
    api.stepSec(0.45, 0.02);
    api.release("up");
    assert(api.player.x === 9, "expected axis snap to 9, got " + api.player.x);
    assert(api.player.y < 21, "tank should smoothly drive into corridor, y=" + api.player.y);
});

check("terrain rules: water blocks tanks but lets bullets fly; ice slides; trees passable", () => {
    api.reset();
    api.clearQueue();
    api.clearAllTerrain();
    api.setCell(8, 15, api.TILE_WATER);
    api.setCell(9, 15, api.TILE_WATER);
    api.tp(9, 17, "up");
    api.press("up");
    api.stepSec(0.5, 0.02);
    api.release("up");
    assert(api.player.y >= 16.5, "water must block tank, y=" + api.player.y);

    // Bullet crosses water to hit target at y=10
    api.setCell(8, 10, api.TILE_BRICK);
    api.setCell(9, 10, api.TILE_BRICK);
    api.fire();
    api.stepSec(0.8, 0.02);
    assert(api.cell(8, 10) === api.TILE_EMPTY && api.cell(9, 10) === api.TILE_EMPTY,
        "bullet must pass over water and smash brick");

    // Ice gives slide after key release & trees passable
    api.clearAllTerrain();
    api.setCell(12, 11, api.TILE_ICE);
    api.setCell(12, 12, api.TILE_ICE);
    api.setCell(11, 12, api.TILE_ICE);
    api.setCell(12, 13, api.TILE_TREES);
    api.tp(12, 14, "up");
    api.press("up");
    api.stepSec(0.38, 0.02);
    api.release("up");
    const yRelease = api.player.y;
    api.stepSec(0.25, 0.02);
    assert(api.player.y < yRelease, "tank should slide slightly on ice after release");
});

check("brick breaks two-wide; steel ignores stars<3 and breaks at stars=3", () => {
    api.reset();
    api.clearQueue();
    api.clearAllTerrain();
    api.setCell(8, 18, api.TILE_STEEL);
    api.setCell(9, 18, api.TILE_STEEL);
    api.tp(9, 21, "up");
    api.player.stars = 2;
    api.fire();
    api.stepSec(0.3, 0.02);
    assert(api.cell(8, 18) === api.TILE_STEEL, "stars=2 must not break steel");

    api.player.stars = 3;
    api.fire();
    api.stepSec(0.3, 0.02);
    assert(api.cell(8, 18) === api.TILE_EMPTY && api.cell(9, 18) === api.TILE_EMPTY,
        "stars=3 armor-piercing shot must break steel");
});

check("opposing bullets cancel in mid-air and star ranks cap active bullets", () => {
    api.reset();
    api.clearQueue();
    api.clearAllTerrain();
    api.tp(10, 20, "up");
    api.fire();
    api.player.cooldown = 0;
    assert(api.fire() === false, "rank 0 allows only 1 active bullet");
    api.clearBullets();

    api.player.stars = 2;
    api.fire();
    api.player.cooldown = 0;
    assert(api.fire() === true, "rank 2 allows 2 active bullets");
    api.clearBullets();

    const foe = { id: 88, kind: "basic", isBonus: false, hp: 1, maxHp: 1, x: 10, y: 10, dir: "down", speed: 0, turnTimer: 9, fireTimer: 9, trackPhase: 0 };
    api.setEnemies([foe]);
    api.fire();
    api.fireEnemy(foe);
    assert(api.bulletCount() === 2, "expected 2 opposing bullets");
    api.stepSec(0.6, 0.02);
    assert(api.bulletCount() === 0 && api.enemyCount() === 1,
        "opposing bullets must cancel each other cleanly, bullets=" + api.bulletCount());
});

check("heavy tank requires 4 hits; bonus tank drops powerup on hit", () => {
    api.reset();
    api.clearQueue();
    api.clearAllTerrain();
    const heavy = { id: 91, kind: "heavy", isBonus: true, hp: 4, maxHp: 4, x: 10, y: 12, dir: "down", speed: 0, turnTimer: 9, fireTimer: 9, trackPhase: 0 };
    api.setEnemies([heavy]);
    api.tp(10, 18, "up");
    api.player.stars = 1; // power=1, speed=20

    api.fire();
    api.stepSec(0.35, 0.02);
    assert(api.enemyCount() === 1 && api.enemyAt(0).hp === 3, "heavy tank hp should drop to 3");
    assert(api.powerupCount() === 1, "bonus tank must spawn powerup when hit");

    // Finish remaining 3 hp
    for (let k = 0; k < 3; k++) {
        api.player.cooldown = 0;
        api.fire();
        api.stepSec(0.35, 0.02);
    }
    assert(api.enemyCount() === 0, "heavy tank should die after 4th hit");
    assert(api.state === "clear", "killing last enemy clears stage");
});

check("shovel fortifies HQ with steel then reverts to brick after duration", () => {
    api.reset();
    api.clearQueue();
    api.tp(9, 25, "up");
    api.spawnPowerup(9, 25, "shovel");
    api.stepSec(0.05, 0.02);
    assert(api.shovelTimer > 14, "shovel timer should activate");
    assert(api.cell(11, 24) === api.TILE_STEEL && api.cell(12, 23) === api.TILE_STEEL, "HQ ring must turn to steel");

    api.stepSec(15.2, 0.05);
    assert(api.shovelTimer === 0, "shovel timer should expire");
    assert(api.cell(11, 24) === api.TILE_BRICK, "HQ ring must revert to brick");
});

check("clock freezes foes and grenade destroys all active foes", () => {
    api.reset();
    api.clearQueue();
    api.clearAllTerrain();
    const e1 = { id: 51, kind: "fast", isBonus: false, hp: 1, maxHp: 1, x: 5, y: 5, dir: "right", speed: 5, turnTimer: 9, fireTimer: 9, trackPhase: 0 };
    const e2 = { id: 52, kind: "basic", isBonus: false, hp: 1, maxHp: 1, x: 18, y: 5, dir: "left", speed: 3, turnTimer: 9, fireTimer: 9, trackPhase: 0 };
    api.setEnemies([e1, e2]);
    api.tp(9, 25, "up");
    api.spawnPowerup(9, 25, "clock");
    api.stepSec(0.5, 0.02);
    assert(api.freezeTimer > 8, "clock should activate freezeTimer");
    assert(api.enemyAt(0).x === 5 && api.enemyAt(1).x === 18, "frozen foes must not move");

    api.spawnPowerup(9, 25, "grenade");
    api.stepSec(0.05, 0.02);
    assert(api.enemyCount() === 0 && api.score >= 1300, "grenade destroys all active foes + awards points, score=" + api.score);
});

check("destroying Eagle HQ triggers immediate gameover", () => {
    api.reset();
    api.clearQueue();
    api.clearAllTerrain();
    api.tp(9, 24.5, "right");
    api.fire();
    api.stepSec(0.5, 0.02);
    assert(api.eagleDestroyed === true, "Eagle flag must be true");
    assert(api.state === "gameover", "destroying Eagle must end game immediately");
});

check("enemies stay valid across 200 simulation steps on stage 3", () => {
    api.loadStage(3);
    for (let s = 0; s < 200; s++) {
        api.update(0.03);
        for (let i = 0; i < api.enemyCount(); i++) {
            const e = api.enemyAt(i);
            assert(e.x >= 0.8 && e.x <= api.COLS - 0.8 && e.y >= 0.8 && e.y <= api.ROWS - 0.8,
                "enemy out of arena: " + e.x + "," + e.y);
        }
    }
    assert(api.enemyCount() > 0, "stage 3 should spawn active enemies");
});

check("drawSceneUnsafe renders cleanly across dark/light themes and states", () => {
    const g = makeGraphics();
    api.loadStage(4);
    api.setTheme("dark");
    api.state = "ready";
    api.render(g);
    const baseFills = g.filled;
    assert(baseFills > 10 && g.stroked > 5, "expected rich vector geometry");

    api.setTheme("light");
    api.state = "pause";
    api.fire();
    api.render(g);
    assert(g.filled > 10 && g.strings.length === 0, "must never call ScriptUI drawString()");
});

console.log(results.join("\n"));
const failed = results.filter((r) => r.indexOf("  FAIL ") === 0);
if (failed.length) {
    console.error("\nFAILED (" + failed.length + ")");
    process.exit(1);
}
console.log("ALL PASSED (" + results.length + ")");
