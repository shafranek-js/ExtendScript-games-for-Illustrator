#!/usr/bin/env node
/**
 * relax/tools/test-core.js
 *
 * Executes lib/GameCore.jsx, lib/GameI18n.jsx and lib/GamePersist.jsx in a
 * sandbox with a fake ScriptUIGraphics and checks the drawing math and the
 * helper contracts. Catches geometry regressions without launching Illustrator.
 *
 *   node relax/tools/test-core.js
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const results = [];

function check(name, fn) {
    try {
        fn();
        results.push({ name, ok: true });
    } catch (e) {
        results.push({ name, ok: false, error: e.message });
    }
}

function assert(cond, message) {
    if (!cond) throw new Error(message);
}

function near(a, b, eps) {
    return Math.abs(a - b) <= (eps === undefined ? 1e-6 : eps);
}

function makeGraphics() {
    const g = {
        points: [],
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
        strokePath() { g.stroked++; }
    };
    return g;
}

function loadLib() {
    const ctx = {
        Math, String, Array, Object, Number, parseInt, parseFloat, isNaN,
        RGBColor: function () { this.red = 0; this.green = 0; this.blue = 0; },
        File: FakeFile,
        Folder: { userData: { fsName: "C:/fake/userData" }, temp: { fsName: "C:/fake/temp" } },
        $: { os: "Windows" }
    };
    vm.createContext(ctx);
    ["GameCore.jsx", "GameI18n.jsx", "GamePersist.jsx", "GameHeartbeat.jsx"].forEach((f) => {
        const src = fs.readFileSync(path.join(ROOT, "lib", f), "utf8").replace(/^\uFEFF/, "");
        vm.runInContext(src, ctx, { filename: "lib/" + f });
    });
    return ctx;
}

// In-memory stand-in for ExtendScript's File object.
function FakeFile(p) {
    this.path = String(p);
    this.fsName = String(p);
    this.exists = false;
    this.content = "";
    this.executed = 0;
    FakeFile.created.push(this);
}
FakeFile.created = [];
FakeFile.prototype.open = function (mode) {
    if (mode === "w") { this.content = ""; this.exists = true; }
    return true;
};
FakeFile.prototype.write = function (s) { this.content += s; };
FakeFile.prototype.read = function () { return this.content; };
FakeFile.prototype.close = function () { return true; };
FakeFile.prototype.remove = function () { this.exists = false; return true; };
FakeFile.prototype.execute = function () { this.executed++; return true; };

const lib = loadLib();

check("rgbToNorm normalizes and keeps alpha", () => {
    const c = lib.rgbToNorm([255, 128, 0], 0.5);
    assert(near(c[0], 1) && near(c[1], 128 / 255) && near(c[2], 0) && near(c[3], 0.5), JSON.stringify(c));
    const d = lib.rgbToNorm([0, 0, 0]);
    assert(near(d[3], 1), "alpha defaults to 1");
});

check("buildRoundRectPath emits finite, closed geometry", () => {
    const g = makeGraphics();
    lib.buildRoundRectPath(g, 10, 20, 100, 40, 8);
    assert(g.points.length >= 16, "expected >= 16 points, got " + g.points.length);
    assert(g.points.every((p) => isFinite(p[0]) && isFinite(p[1])), "non-finite point");
    assert(g.closed === true, "path not closed");
});

check("fillRoundRect clamps radius to half the smaller side", () => {
    const g = makeGraphics();
    lib.fillRoundRect(g, 0, 0, 20, 10, 999, {});
    assert(g.filled === 1, "fillPath not called");
    assert(g.points.every((p) => isFinite(p[0]) && isFinite(p[1])), "non-finite point");
});

check("fillCapsule builds two round caps", () => {
    const g = makeGraphics();
    lib.fillCapsule(g, 10, 10, 60, 10, 3, {});
    assert(g.points.length === 12, "expected 12 points (2 x 6), got " + g.points.length);
    assert(g.filled === 1, "fillPath not called");
});

check("fillArcBand builds ring with caps", () => {
    const g = makeGraphics();
    lib.fillArcBand(g, 50, 50, 20, 2, 180, 360, {});
    assert(g.points.length > 20, "too few points: " + g.points.length);
    assert(g.points.every((p) => isFinite(p[0]) && isFinite(p[1])), "non-finite point");
    assert(g.filled === 1, "fillPath not called");
});

check("drawGlyphRun centres the run and calls glyphFn per character", () => {
    const g = makeGraphics();
    const calls = [];
    lib.drawGlyphRun(g, "ABC", 100, 50, 20, [255, 255, 255], 1, (gg, ch, x, y, h) => {
        calls.push({ ch, x, y, h });
    }, 0.2);
    assert(calls.length === 3, "expected 3 glyph calls");
    assert(calls[0].ch === "A" && calls[2].ch === "C", "wrong characters");
    assert(calls.every((c) => near(c.h, 20)), "glyph height");
    const centre = (calls[0].x + calls[2].x) / 2;
    assert(near(centre, 100, 1e-6), "run not centred: " + centre);
});

check("drawGlyphRun handles a single character", () => {
    const g = makeGraphics();
    const calls = [];
    lib.drawGlyphRun(g, "7", 40, 30, 16, [0, 0, 0], 1, (gg, ch, x) => calls.push(x), 0.2);
    assert(calls.length === 1 && near(calls[0], 40), "single glyph not centred");
});

check("makeRGBColor builds an RGBColor from an array", () => {
    const c = lib.makeRGBColor([12, 34, 56]);
    assert(c.red === 12 && c.green === 34 && c.blue === 56, "wrong channels");
});

check("translateString falls back and substitutes placeholders", () => {
    const dict = { en: { a: "Score {0} of {1}" }, cs: { a: "Skóre {0}" } };
    assert(lib.translateString(dict.cs, dict.en, "a", [5, 9]) === "Skóre 5", "cs substitution");
    assert(lib.translateString(dict.cs, dict.en, "a", [5]) === "Skóre 5", "args array");
    assert(lib.translateString(dict.cs, dict.en, "missing", []) === "missing", "unknown key falls back to the key");
    assert(lib.translateString(dict.en, dict.en, "a", [1, 2]) === "Score 1 of 2", "en substitution");
});

check("getGameSaveFile uses the token", () => {
    const f = lib.getGameSaveFile("Tetris");
    assert(String(f.path).indexOf("AI_Tetris_SaveData.txt") >= 0, "unexpected path: " + f.path);
});

check("readKeyValueFile returns null for a missing file", () => {
    const res = lib.readKeyValueFile({ exists: false });
    assert(res === null, "expected null, got " + JSON.stringify(res));
});

check("readKeyValueFile parses key=value lines", () => {
    const fake = {
        exists: true,
        open() { return true; },
        read() { return "lang=cs\r\nbest=1200\nbroken\n"; },
        close() {}
    };
    const map = lib.readKeyValueFile(fake);
    assert(map && map.lang === "cs" && map.best === "1200", JSON.stringify(map));
    assert(map.broken === undefined, "line without '=' must be skipped");
});

check("writeKeyValueFile joins pairs with newlines", () => {
    let written = null;
    const fake = {
        open() { return true; },
        write(s) { written = s; },
        close() {}
    };
    const ok = lib.writeKeyValueFile(fake, ["a=1", "b=2"]);
    assert(ok === true && written === "a=1\nb=2", "written: " + written);
});

check("heartbeatStart generates a well-formed launcher", () => {
    FakeFile.created = [];
    const ok = lib.heartbeatStart({ title: "TETRIS - Adobe Illustrator Edition", token: "Tetris", tickMs: 40 });
    assert(ok === true, "heartbeatStart returned " + ok);

    const ps = FakeFile.created.find((f) => /_Heartbeat\.ps1$/.test(f.path));
    const vbs = FakeFile.created.find((f) => /_Launcher\.vbs$/.test(f.path));
    assert(ps && vbs, "temp files were not created");
    assert(vbs.executed === 1, "launcher was not executed");

    assert(ps.content.indexOf("Add-Type -TypeDefinition '") >= 0, "missing Add-Type");
    assert(ps.content.indexOf("FindGameWindow('TETRIS - Adobe Illustrator Edition')") >= 0, "title not passed");
    assert(ps.content.indexOf("Start-Sleep -Milliseconds 40") >= 0, "tickMs not passed");
    assert(ps.content.indexOf("GetWindowRect") >= 0, "play area must come from the canvas rect");
    assert(ps.content.indexOf("mouse_event") >= 0, "mouse nudge missing");

    const opens = (ps.content.match(/\{/g) || []).length;
    const closes = (ps.content.match(/\}/g) || []).length;
    assert(opens === closes, "unbalanced braces in generated C#: " + opens + "/" + closes);

    const cs = ps.content;
    assert(cs.indexOf("IntPtr lpClassName") >= 0, "FindWindow must take IntPtr, not string");
    assert(cs.indexOf("StartsWith(title") >= 0, "window fallback must match by prefix");
});

check("heartbeatStart rejects non-Windows", () => {
    const saved = lib.$.os;
    lib.$.os = "Macintosh OS 10.15";
    const ok = lib.heartbeatStart({ title: "X", token: "Y", tickMs: 35 });
    lib.$.os = saved;
    assert(ok === false, "must return false on macOS");
    assert(lib.heartbeatLastError() === "not-windows", "unexpected error: " + lib.heartbeatLastError());
});

check("heartbeatStop writes the flag and removes temp helpers", () => {
    FakeFile.created = [];
    lib.heartbeatStart({ title: "SNAKE - Adobe Illustrator Edition", token: "Snake", tickMs: 35 });
    const flag = FakeFile.created.find((f) => /_Stop\.flag$/.test(f.path));
    const ps = FakeFile.created.find((f) => /_Heartbeat\.ps1$/.test(f.path));
    const vbs = FakeFile.created.find((f) => /_Launcher\.vbs$/.test(f.path));
    lib.heartbeatStop();
    assert(flag.content === "stop", "stop flag not written");
    assert(ps.exists === false && vbs.exists === false, "temp helpers were not removed");
});

let failed = 0;
results.forEach((r) => {
    if (r.ok) {
        console.log("  ok   " + r.name);
    } else {
        failed++;
        console.log("  FAIL " + r.name + " -> " + r.error);
    }
});
console.log("\n" + (results.length - failed) + "/" + results.length + " passed");
if (failed) process.exit(1);
