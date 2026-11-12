// Headless logic & solver tests for Sokoban.jsx - runs the real game code in Node.
//
//   node tools/sokoban-headless.js
//
// Uses the built-in __SOKOBAN_TEST__ hook (returning before Window creation),
// stubs persist/perf/heartbeat, solves all 20 levels via push-BFS, and checks
// gameplay mechanics and ScriptUIGraphics rendering.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const gameSrc = fs.readFileSync(path.join(ROOT, "Sokoban.jsx"), "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/^#target[^\n]*$/gm, "")
    .replace(/^#include[^\n]*$/gm, "");

const coreSrc = fs.readFileSync(path.join(ROOT, "lib", "GameCore.jsx"), "utf8");
const i18nSrc = fs.readFileSync(path.join(ROOT, "lib", "GameI18n.jsx"), "utf8");

const stubs = [
    coreSrc,
    i18nSrc,
    "var _memSave = {};",
    "var __SOKOBAN_TEST__ = {};",
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

const runner = new Function(stubs + "\n" + gameSrc + "\nreturn __SOKOBAN_TEST__.exports;");
const api = runner();

function makeGraphics() {
    const g = {
        points: [],
        BrushType: { SOLID_COLOR: "solid" },
        PenType: { SOLID_COLOR: "solid" },
        filled: 0,
        stroked: 0,
        badCoords: 0,
        newBrush(type, color) { return { type, color }; },
        newPen(type, color, width) { return { type, color, width }; },
        newPath() { g.points = []; },
        moveTo(x, y) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) g.badCoords++;
            g.points.push([x, y]);
        },
        lineTo(x, y) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) g.badCoords++;
            g.points.push([x, y]);
        },
        closePath() {},
        ellipsePath(x, y, w, h) {
            if (![x, y, w, h].every(Number.isFinite)) g.badCoords++;
        },
        fillPath() { g.filled++; },
        strokePath() { g.stroked++; }
    };
    return g;
}

const results = [];
function check(name, fn) {
    try { fn(); results.push("  ok   " + name); }
    catch (e) { results.push("  FAIL " + name + " -> " + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function solvePush(map) {
    const h = map.length;
    const w = Math.max(...map.map((r) => r.length));
    const walls = new Set();
    const goals = [];
    const boxes = [];
    let px = 0, py = 0, players = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const c = map[y][x];
            const k = y * w + x;
            if (c === "#") walls.add(k);
            if (c === "." || c === "+" || c === "*") goals.push(k);
            if (c === "$" || c === "*") boxes.push(k);
            if (c === "@" || c === "+") { px = x; py = y; players++; }
        }
    }
    if (players !== 1) return { err: "expected 1 player, got " + players };
    if (goals.length === 0 || goals.length !== boxes.length) {
        return { err: "goals/boxes mismatch: " + goals.length + " vs " + boxes.length };
    }
    const goalSet = new Set(goals);
    const dirs = [1, -1, w, -w];

    function isCornerDead(k) {
        if (goalSet.has(k)) return false;
        const up = walls.has(k - w), dn = walls.has(k + w);
        const lt = walls.has(k - 1), rt = walls.has(k + 1);
        return (up || dn) && (lt || rt);
    }

    function reachAndMinCell(pStart, bSet) {
        const seen = new Set([pStart]);
        const st = [pStart];
        let minC = pStart;
        for (let i = 0; i < st.length; i++) {
            const c = st[i];
            if (c < minC) minC = c;
            for (const d of dirs) {
                const n = c + d;
                if (n < 0 || n >= w * h) return { leaked: true };
                if (!walls.has(n) && !bSet.has(n) && !seen.has(n)) {
                    seen.add(n);
                    st.push(n);
                }
            }
        }
        return { seen, minC, leaked: false };
    }

    boxes.sort((a, b) => a - b);
    const r0 = reachAndMinCell(py * w + px, new Set(boxes));
    if (r0.leaked) return { err: "player leaked outside perimeter" };

    const startKey = r0.minC + "|" + boxes.join(",");
    const q = [{ p: r0.minC, b: boxes, pu: 0 }];
    const visited = new Set([startKey]);
    let qi = 0;
    while (qi < q.length && qi < 150000) {
        const cur = q[qi++];
        if (cur.b.every((k) => goalSet.has(k))) return { ok: true, pushes: cur.pu };
        const bSet = new Set(cur.b);
        const rc = reachAndMinCell(cur.p, bSet);
        for (let bi = 0; bi < cur.b.length; bi++) {
            const bp = cur.b[bi];
            for (const d of dirs) {
                const pushFrom = bp - d;
                const pushTo = bp + d;
                if (!rc.seen.has(pushFrom) || walls.has(pushTo) || bSet.has(pushTo) || isCornerDead(pushTo)) continue;
                const nb = cur.b.slice();
                nb[bi] = pushTo;
                nb.sort((a, b) => a - b);
                const nr = reachAndMinCell(bp, new Set(nb));
                if (nr.leaked) return { err: "crate/player leak" };
                const key = nr.minC + "|" + nb.join(",");
                if (!visited.has(key)) {
                    visited.add(key);
                    q.push({ p: bp, b: nb, pu: cur.pu + 1 });
                }
            }
        }
    }
    return { err: "unsolved after " + qi + " states" };
}

check("all 20 levels exist, have closed rooms, and are push-BFS solvable matching par", () => {
    assert(api.LEVELS.length === 20, "expected 20 levels, got " + api.LEVELS.length);
    for (let i = 0; i < api.LEVELS.length; i++) {
        const lvl = api.LEVELS[i];
        const res = solvePush(lvl.map);
        assert(res.ok, "level " + (i + 1) + " (" + lvl.name + "): " + res.err);
        assert(res.pushes === lvl.par, "level " + (i + 1) + " par=" + lvl.par + " != solved " + res.pushes);
    }
});

check("stage 1 loads crates, goals, insideGrid, and player position cleanly", () => {
    api.loadLevel(0, true);
    const s = api.getState();
    assert(s.gameState === "ready", "expected ready state");
    assert(s.totalGoals === 2, "stage 1 should have 2 goals");
    assert(s.cratesOnGoal === 0, "stage 1 starts with 0 crates on goal");
    assert(s.insideGrid[3][3] === true, "player start must be insideGrid");
    assert(s.insideGrid[0][0] === false, "wall corner must not be insideGrid");
});

check("walls and adjacent double crates block movement", () => {
    api.loadLevel(0, false);
    // Stage 0 ("TWIN DOCKS"):
    // ######
    // # .  #
    // # #$ #
    // # $@ #
    // #  . #
    // ######
    assert(api.tryMove(0, 1, false) === true, "move down to (3,4)");
    assert(api.tryMove(0, 1, false) === false, "wall at bottom should block");
    // Step to (3,3), push left crate at (2,3) -> (1,3)
    assert(api.tryMove(0, -1, false) === true, "move back up to (3,3)");
    assert(api.tryMove(-1, 0, false) === true, "push crate left to (1,3)");
    assert(api.tryMove(-1, 0, false) === false, "cannot push crate into left wall");
});

check("undo reverses steps and crate pushes with exact move/push counters", () => {
    api.loadLevel(0, false);
    const startP = { x: api.getState().player.x, y: api.getState().player.y };
    api.tryMove(-1, 0, false); // push left crate to (1,3)
    let s = api.getState();
    assert(s.moves === 1 && s.pushes === 1, "expected 1 move, 1 push");
    assert(s.crateGrid[3][1] === true && s.crateGrid[3][2] === false, "crate moved left");

    assert(api.undoMove() === true, "undoMove should succeed");
    s = api.getState();
    assert(s.moves === 0 && s.pushes === 0, "counters restored to 0");
    assert(s.player.x === startP.x && s.player.y === startP.y, "player restored");
    assert(s.crateGrid[3][2] === true && s.crateGrid[3][1] === false, "crate restored");
    assert(api.undoMove() === false, "undo at start should return false");
});

check("BFS click-to-move walks cleanly around walls and pushes adjacent crates", () => {
    api.loadLevel(0, false);
    // Click reachable tile (1,4) from (3,3) -> walks down then left
    const p = api.findWalkPath(1, 4);
    assert(Array.isArray(p) && p.length > 0, "walk path to (1,4) should exist");
    assert(api.clickBoardCell(1, 4) === true, "click walk should move player");
    let s = api.getState();
    assert(s.player.x === 1 && s.player.y === 4, "player arrived at (1,4)");
    assert(s.pushes === 0, "walk should not count as push");
    // Clicking unreachable wall returns false
    assert(api.clickBoardCell(0, 0) === false, "clicking wall must fail");
    // Step right to (2,4), then walk/push adjacent crate at (2,3) by clicking it? Push up hits (2,2) wall,
    // so verify pushing downward from (3,1) on crate (3,2):
    api.loadLevel(0, false);
    assert(api.clickBoardCell(3, 1, false) === true, "walk around to (3,1)");
    assert(api.clickBoardCell(3, 2, false) === true, "click adjacent crate (3,2) pushes it down to (3,3)");
    assert(api.getState().crateGrid[3][3] === true && api.getState().pushes === 1, "crate pushed down");

    // Animated click-walk advances 1 tile per interval via update(dt)
    api.loadLevel(0, false);
    assert(api.clickBoardCell(1, 4, true) === true, "animated click walk starts immediately");
    for (let k = 0; k < 12; k++) api.update(0.05);
    assert(api.getState().player.x === 1 && api.getState().player.y === 4, "animated click walk reaches (1,4)");
});

check("completing stage 0 transitions to clear and persists bestMoves/bestPushes", () => {
    // Stage 3 ("FIRST SHIFT"): 7x7 open room with two clear pushes
    // #######
    // #     #
    // # . $ #  (goal 2,2; crate 4,2)
    // #  @  #  (player 3,3)
    // # $ . #  (crate 2,4; goal 4,4)
    // #     #
    // #######
    api.loadLevel(3, false);
    // Push top crate (4,2) left to (2,2): walk to (5,2), push left x2
    assert(api.clickBoardCell(5, 2) === true, "walk to (5,2)");
    assert(api.tryMove(-1, 0, false) === true, "push crate left 1");
    assert(api.tryMove(-1, 0, false) === true, "push crate left 2 onto goal");
    assert(api.getState().cratesOnGoal === 1, "1 crate on goal");

    // Push bottom crate (2,4) right to (4,4): walk to (1,4), push right x2
    assert(api.clickBoardCell(1, 4) === true, "walk to (1,4)");
    assert(api.tryMove(1, 0, false) === true, "push crate right 1");
    assert(api.tryMove(1, 0, false) === true, "push crate right 2 onto final goal");

    const s = api.getState();
    assert(s.gameState === "clear", "expected clear state, got " + s.gameState);
    assert(s.bestRecords[3] && s.bestRecords[3].pushes === 4, "best record should persist pushes=4");

    // Verify reload reads saved key=value record cleanly
    api.saveSettings();
    api.loadSettings();
    assert(api.getState().bestRecords[3].moves === s.moves, "reloaded best moves mismatch");
});

check("undoMove clears active walkQueue so auto-walk stops cleanly", () => {
    api.loadLevel(0, false);
    // Start animated BFS walk from (3,3) toward (1,4)
    assert(api.clickBoardCell(1, 4, true) === true, "animated click walk should start");
    const posAfterClick = { x: api.getState().player.x, y: api.getState().player.y, moves: api.getState().moves };
    assert(posAfterClick.moves === 1, "first step ran immediately");
    assert(api.getState().walkQueueLen > 0, "remaining walk steps should be queued");

    assert(api.undoMove() === true, "undoMove should succeed during walk");
    assert(api.getState().walkQueueLen === 0, "undoMove must clear walkQueue");
    for (let k = 0; k < 10; k++) api.update(0.05);
    assert(api.getState().moves === 0, "queued walk must not advance after undo, moves=" + api.getState().moves);
    assert(api.getState().player.x === 3 && api.getState().player.y === 3, "player must stay at (3,3)");
});

check("completing stages out of order (2-20 then stage 1) triggers allclear", () => {
    api.loadLevel(0, false);
    const recs = api.getState().bestRecords;
    for (let i = 0; i < api.LEVELS.length; i++) delete recs[i];
    // Mark stages 2..20 (indices 1..19) solved first
    for (let i = 1; i < api.LEVELS.length; i++) recs[i] = { moves: 10, pushes: 2 };

    // Solve stage 1 (index 0): crate (2,3)->(1,3) then push crate (3,2) up to (3,1)? Wait:
    // Stage 0 map: (1,1) goal, (4,1), (2,3) crate, (3,2) crate, (3,4) goal
    // Let's solve via completeLevel() hook on stage 0 as the final unsolved stage:
    api.loadLevel(0, false);
    api.tryMove(-1, 0, false); // moves=1, pushes=1 so record is valid (>0)
    api.completeLevel();
    assert(api.getState().gameState === "allclear",
        "solving final missing stage 1 must enter allclear, got " + api.getState().gameState);
});

check("bestRecords maintain independent minimum moves and pushes", () => {
    const recs = api.getState().bestRecords;
    for (let i = 0; i < api.LEVELS.length; i++) delete recs[i];
    // Clear stage 3 once cleanly to establish a record
    api.loadLevel(3, false);
    api.clickBoardCell(5, 2);
    api.tryMove(-1, 0, false); api.tryMove(-1, 0, false);
    api.clickBoardCell(1, 4);
    api.tryMove(1, 0, false); api.tryMove(1, 0, false);
    const firstMoves = api.getState().moves;
    const firstPushes = api.getState().pushes;
    assert(recs[3].moves === firstMoves && recs[3].pushes === firstPushes, "first solve saved");

    // Seed { moves: 20, pushes: 8 }, then solve in >20 moves with fewer pushes (4)
    recs[3] = { moves: 20, pushes: 8 };
    api.loadLevel(3, false);
    for (let w = 0; w < 12; w++) { api.tryMove(0, -1, false); api.tryMove(0, 1, false); }
    api.clickBoardCell(5, 2);
    api.tryMove(-1, 0, false); api.tryMove(-1, 0, false);
    api.clickBoardCell(1, 4);
    api.tryMove(1, 0, false); api.tryMove(1, 0, false);
    assert(recs[3].pushes === 4, "best pushes improved from 8 to 4");
    assert(recs[3].moves === 20, "best moves must stay 20 instead of regressing to " + recs[3].moves);
});

check("saveSettings surfaces writeKeyValueFile failures cleanly", () => {
    const failStubs = stubs.replace("return true;", "return false;");
    const saveFailRunner = new Function(
        failStubs + "\n" + gameSrc + "\nreturn __SOKOBAN_TEST__.exports;"
    );
    const failApi = saveFailRunner();
    failApi.loadLevel(0, false);
    assert(failApi.saveSettings(true) === false, "saveSettings(true) should return false on write error");
    assert(failApi.getState().statusKey === "statusSaveErr", "statusKey should report statusSaveErr");

    // Advancing from clear and allclear by board click must also surface save failure
    failApi.completeLevel();
    assert(failApi.getState().gameState === "clear", "should enter clear");
    assert(failApi.getState().statusKey === "statusSaveErr", "completeLevel save error surfaced");
    assert(failApi.clickBoardCell(0, 0) === true, "click on clear advances to stage 2");
    assert(failApi.getState().levelIndex === 1, "advanced to stage 2");
    assert(failApi.getState().statusKey === "statusSaveErr", "click advance from clear must surface statusSaveErr");

    const recs = failApi.getState().bestRecords;
    for (let i = 0; i < failApi.LEVELS.length; i++) recs[i] = { moves: 10, pushes: 2 };
    failApi.loadLevel(failApi.LEVELS.length - 1, false);
    failApi.completeLevel();
    assert(failApi.getState().gameState === "allclear", "should enter allclear");
    assert(failApi.clickBoardCell(0, 0) === true, "click on allclear restarts stage 1");
    assert(failApi.getState().levelIndex === 0, "restarted stage 1");
    assert(failApi.getState().statusKey === "statusSaveErr", "click advance from allclear must surface statusSaveErr");
});

function runUiLifecycleScenario(osName, useStandalone) {
    const coreLib = fs.readFileSync(path.join(ROOT, "lib", "GameCore.jsx"), "utf8");
    const i18nLib = fs.readFileSync(path.join(ROOT, "lib", "GameI18n.jsx"), "utf8");
    const persistLib = fs.readFileSync(path.join(ROOT, "lib", "GamePersist.jsx"), "utf8");
    const hbLib = fs.readFileSync(path.join(ROOT, "lib", "GameHeartbeat.jsx"), "utf8");
    const perfLib = fs.readFileSync(path.join(ROOT, "lib", "GamePerf.jsx"), "utf8");

    const vfs = {};
    const calls = { executed: [], removed: [], hbFilesWritten: [] };

    function FakeFile(p) {
        this.fsName = String(p);
        this.exists = !!vfs[this.fsName];
        this._mode = null;
        this._buf = "";
    }
    FakeFile.prototype.open = function (mode) {
        this._mode = mode;
        this._buf = (mode === "a" && vfs[this.fsName]) ? vfs[this.fsName] : "";
        return true;
    };
    FakeFile.prototype.write = function (s) {
        this._buf += String(s);
        vfs[this.fsName] = this._buf;
        this.exists = true;
    };
    FakeFile.prototype.writeln = function (s) {
        this.write(String(s) + "\n");
    };
    FakeFile.prototype.read = function () {
        return vfs[this.fsName] || "";
    };
    FakeFile.prototype.close = function () {
        calls.hbFilesWritten.push(this.fsName);
        this.exists = !!vfs[this.fsName];
    };
    FakeFile.prototype.execute = function () {
        calls.executed.push(this.fsName);
        return true;
    };
    FakeFile.prototype.remove = function () {
        delete vfs[this.fsName];
        this.exists = false;
        calls.removed.push(this.fsName);
        return true;
    };

    function makeCtrl(type, text) {
        const g = makeGraphics();
        g.backgroundColor = null;
        g.foregroundColor = null;
        const ctrl = {
            type,
            text: text || "",
            graphics: g,
            preferredSize: [0, 0],
            minimumSize: [0, 0],
            maximumSize: [0, 0],
            spacing: 0,
            margins: 0,
            orientation: "column",
            alignChildren: ["left", "top"],
            selection: 0,
            active: false,
            children: [],
            listeners: {},
            add(t, b, l) {
                const c = makeCtrl(t, l);
                ctrl.children.push(c);
                return c;
            },
            addEventListener(evName, fn) {
                if (!ctrl.listeners[evName]) ctrl.listeners[evName] = [];
                ctrl.listeners[evName].push(fn);
            },
            notify(evName) {
                if (evName === "onDraw" && typeof ctrl.onDraw === "function") ctrl.onDraw();
            },
            hide() {},
            show() {
                if (typeof ctrl.onShow === "function") ctrl.onShow();
            },
            center() {},
            close() {
                if (typeof ctrl.onClose === "function") ctrl.onClose();
            }
        };
        return ctrl;
    }

    let createdWin = null;
    const targetSrc = useStandalone
        ? fs.readFileSync(path.join(ROOT, "standalone", "Sokoban_standalone.jsx"), "utf8")
            .replace(/^\uFEFF/, "")
            .replace(/^#target[^\n]*$/gm, "")
        : [coreLib, i18nLib, persistLib, hbLib, perfLib, gameSrc].join("\n");
    const Dollar = { os: osName };
    function CaptureWindow(type, title) {
        createdWin = makeCtrl(type, title);
        return createdWin;
    }
    const runnerFn = new Function("Window", "File", "Folder", "$", targetSrc);
    runnerFn(CaptureWindow, FakeFile, { userData: { fsName: "/mock/user" }, temp: { fsName: "/mock/temp" } }, Dollar);

    return { win: createdWin, vfs, calls };
}

check("real Window + lib/GameHeartbeat lifecycle executes win.onShow, Undo, bubbled keydown, and win.onClose cleanly", () => {
    const res = runUiLifecycleScenario("Windows 11");
    const win = res.win;
    assert(win !== null, "Window should be created");
    assert(res.calls.executed.some((p) => p.indexOf("AI_Sokoban_Launcher.vbs") !== -1),
        "win.onShow must invoke real heartbeatStart creating AI_Sokoban_Launcher.vbs");

    const canvas = win.children[0];
    const statusText = win.children[1];
    const btnRow = win.children[3];
    const btnUndo = btnRow.children[2];
    const btnClose = btnRow.children[7];

    assert(canvas.graphics.filled > 0 && canvas.graphics.badCoords === 0, "onShow rendered initial board cleanly");
    assert(statusText.text.indexOf("Stage 1") === 0, "initial status shown cleanly");

    // Simulate click on board near a distant tile so animated walk starts, then press btnUndo:
    // Board metrics on stage 0 (6x6): cell=48, ox=160, oy=164 -> tile (1,4) center = (160 + 72, 164 + 216)
    const mousedown = canvas.listeners.mousedown[0];
    mousedown({ clientX: 232, clientY: 380 });
    assert(statusText.text.indexOf("moves") !== -1 || statusText.text.indexOf("Stage 1") !== -1, "click processed");
    btnUndo.onClick();
    assert(statusText.text.indexOf("Undid step (0 moves, 0 pushes)") === 0,
        "btnUndo should undo first walk step cleanly, got: " + statusText.text);

    // Send F15 heartbeat ticks after Undo — queued mouse walk must NOT continue moving!
    win.listeners.keydown[0]({ keyName: "F15", target: win, currentTarget: win, preventDefault() {}, stopPropagation() {} });
    win.listeners.keydown[0]({ keyName: "F15", target: win, currentTarget: win, preventDefault() {}, stopPropagation() {} });

    // Simulate arrow tap firing on btnUndo + immediate bubbled duplicate on win:
    // Moving left pushes crate or hitting Left once: moves=1, NOT 2!
    const evBtn = { keyName: "Left", target: btnUndo, currentTarget: btnUndo, preventDefault() {}, stopPropagation() {} };
    const evWinBubble = { keyName: "Left", target: btnUndo, currentTarget: win, preventDefault() {}, stopPropagation() {} };
    btnUndo.listeners.keydown[0](evBtn);
    win.listeners.keydown[0](evWinBubble);
    assert(statusText.text.indexOf("1 moves, 1 pushes") !== -1,
        "bubbled keydown from btnUndo->win must not cause double step, got: " + statusText.text);

    // Close window via Close button and check stop file + temp cleanup
    btnClose.onClick();
    assert(res.vfs["/mock/temp/AI_Sokoban_Stop.flag"] === "stop", "heartbeatStop must write stop flag");
    assert(res.calls.removed.some((p) => p.indexOf("AI_Sokoban_Heartbeat.ps1") !== -1), "ps1 cleaned on close");
});

check("standalone/Sokoban_standalone.jsx runs full Window + onShow + onClose lifecycle cleanly", () => {
    const res = runUiLifecycleScenario("Windows 11", true);
    assert(res.win !== null, "standalone Window should be created");
    assert(res.calls.executed.some((p) => p.indexOf("AI_Sokoban_Launcher.vbs") !== -1),
        "standalone onShow must invoke heartbeatStart");
    res.win.children[3].children[7].onClick();
    assert(res.vfs["/mock/temp/AI_Sokoban_Stop.flag"] === "stop", "standalone Close must invoke heartbeatStop");
});

check("non-Windows win.onShow falls back gracefully to statusNoHeartbeat", () => {
    const res = runUiLifecycleScenario("Macintosh OS");
    const statusText = res.win.children[1];
    assert(statusText.text.indexOf("Heartbeat unavailable") !== -1,
        "non-Windows fallback must show statusNoHeartbeat, got: " + statusText.text);
    res.win.onClose();
});

check("update settles slide interpolation and drawSceneUnsafe renders dark/light themes cleanly", () => {
    api.loadLevel(12, true);
    api.update(0.05);
    const gDark = makeGraphics();
    api.setTheme("dark");
    api.drawSceneUnsafe(gDark);
    assert(gDark.filled > 0 && gDark.badCoords === 0, "dark ready render badCoords=" + gDark.badCoords);

    api.tryMove(0, -1, false);
    api.update(0.04);
    const gLight = makeGraphics();
    api.setTheme("light");
    api.drawSceneUnsafe(gLight);
    assert(gLight.filled > 0 && gLight.badCoords === 0, "light play render badCoords=" + gLight.badCoords);
});

for (const line of results) console.log(line);
const failed = results.filter((r) => r.startsWith("  FAIL")).length;
if (failed > 0) {
    console.log("FAILED (" + failed + ")");
    process.exit(1);
}
console.log("ALL PASSED (" + results.length + ")");
