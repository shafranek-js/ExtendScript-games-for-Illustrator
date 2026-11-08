#target illustrator

/**
 * RELAX - Arcade Launcher for Adobe Illustrator (ExtendScript / ScriptUI)
 *
 * One window for all eight games in this folder. Click a title or press 1-8.
 * When a game window is closed the launcher comes back, so you can play the
 * next one without touching File > Scripts again.
 *
 * How it runs a game without depending on #include support in $.evalFile():
 *   1. reads the .jsx, recursively inlines every #include "..." (paths are
 *      resolved relative to the including file, same as ExtendScript does),
 *   2. strips #target / #includepath / #script directives,
 *   3. writes a single-file bundle to Folder.temp and runs it with $.evalFile().
 * The bundle is deleted after a successful run and kept on error for debugging.
 *
 * Requires: this file to stay next to the games and their lib/ folder.
 */

(function () {
    var BG_RGB = [40, 36, 33];
    var FG_RGB = [236, 231, 242];
    var MUTED_RGB = [158, 148, 140];
    var ACCENT_RGB = [237, 194, 46];

    var GAMES = [
        { file: "2048.jsx", token: "2048", title: "2048", tag: "PUZZLE", desc: "Swipe tiles, reach 2048" },
        { file: "Tetris.jsx", token: "Tetris", title: "Tetris", tag: "CLASSIC", desc: "10x20 well, hold, levels" },
        { file: "Arkanoid.jsx", token: "Arkanoid", title: "Arkanoid", tag: "ACTION", desc: "Paddle, ball, 5 stages" },
        { file: "Snake.jsx", token: "Snake", title: "Snake", tag: "ARCADE", desc: "3 arena modes, bonuses" },
        { file: "SpaceInvaders.jsx", token: "SpaceInvaders", title: "Space Invaders", tag: "SHOOTER", desc: "5x9 swarm, bunkers, UFO" },
        { file: "BoulderDash.jsx", token: "BoulderDash", title: "Boulder Dash", tag: "LOGIC", desc: "Caves, boulders, diamonds" },
        { file: "PacMan.jsx", token: "PacMan", title: "Pac-Man", tag: "ARCADE", desc: "Maze and 4 ghosts" },
        { file: "LodeRunner.jsx", token: "LodeRunner", title: "Lode Runner", tag: "ARCADE", desc: "150 levels, digging, guards" }
    ];

    // ---------------------------------------------------------------- paths

    function currentDir() {
        try {
            var f = new File($.fileName);
            if (f && f.parent) return f.parent.fsName;
        } catch (e) {}
        return "";
    }

    var BASE_DIR = currentDir();
    var MISSING = [];

    function gamePath(game) {
        return BASE_DIR + "/" + game.file;
    }

    // ------------------------------------------------------------ file i/o

    function readTextFile(path) {
        var f = new File(path);
        if (!f.exists) return null;
        f.encoding = "UTF-8";
        if (!f.open("r")) return null;
        var s = f.read();
        f.close();
        // A leading BOM is a marker for the engine, not part of the code.
        if (s && s.charCodeAt(0) === 0xFEFF) s = s.substring(1);
        return s;
    }

    // Recursively replaces #include "..." with the file contents. Returns null
    // when the root file cannot be read, so the caller can report it.
    function bundleSource(path, depth) {
        if (depth > 8) return "";
        var src = readTextFile(path);
        if (src === null) return null;

        var dir = new File(path).parent;
        var dirPath = dir ? dir.fsName : BASE_DIR;
        var lines = src.split(/\r?\n/);
        var out = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            var inc = line.match(/^[ \t]*#include\s+"([^"]+)"/);
            if (inc) {
                var childPath = dirPath + "/" + inc[1];
                var child = bundleSource(childPath, depth + 1);
                if (child === null && MISSING.length < 5) MISSING.push(inc[1]);
                out.push(child === null ? "" : child);
                continue;
            }

            if (/^[ \t]*#(target|targetengine|includepath|script)\b/.test(line)) continue;
            out.push(line);
        }
        return out.join("\n");
    }

    function writeBundle(token, source) {
        var path = Folder.temp.fsName + "/relax_run_" + token + ".jsx";
        var f = new File(path);
        f.encoding = "UTF-8";
        if (!f.open("w")) return null;
        f.write(source);
        f.close();
        ensureUtf8Bom(path);
        return new File(path);
    }

    // Illustrator decodes a BOM-less .jsx as Windows-1252, so a bundle with
    // Czech/Hindi strings must start with an explicit UTF-8 BOM. ExtendScript's
    // UTF-8 writer may or may not emit one, so the bytes are checked and the
    // file is rewritten (binary copy) when the BOM is missing.
    function ensureUtf8Bom(path) {
        var probe = new File(path);
        probe.encoding = "BINARY";
        if (!probe.open("r")) return;
        var head = probe.read(3);
        probe.close();
        if (head && head.length === 3 &&
            head.charCodeAt(0) === 0xEF && head.charCodeAt(1) === 0xBB && head.charCodeAt(2) === 0xBF) {
            return;
        }

        var reader = new File(path);
        reader.encoding = "BINARY";
        if (!reader.open("r")) return;
        var data = reader.read();
        reader.close();

        var writer = new File(path);
        writer.encoding = "BINARY";
        if (!writer.open("w")) return;
        writer.write(String.fromCharCode(0xEF, 0xBB, 0xBF) + data);
        writer.close();
    }

    // ---------------------------------------------------------------- run

    function runGame(game) {
        MISSING.length = 0;
        var source = bundleSource(gamePath(game), 0);
        if (source === null) {
            alert("Cannot read " + game.file + "\n\nExpected next to this launcher:\n" + BASE_DIR);
            return;
        }
        if (MISSING.length) {
            alert("Missing #include file(s):\n  " + MISSING.join("\n  ") +
                  "\n\nCopy the whole relax folder, not a single .jsx file.");
            return;
        }

        var bundle = writeBundle(game.token, source);
        if (!bundle) {
            alert("Cannot write to the temp folder:\n" + Folder.temp.fsName);
            return;
        }

        var failed = false;
        try {
            $.evalFile(bundle.fsName);
        } catch (err) {
            failed = true;
            var msg = (err && err.message) ? err.message : String(err);
            var line = (err && err.line) ? " (line " + err.line + ")" : "";
            alert("Error in " + game.file + line + ":\n\n" + msg);
        }

        if (!failed) {
            try { bundle.remove(); } catch (e) {}
        }
    }

    // ---------------------------------------------------------------- ui

    function norm(rgb) {
        return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1];
    }

    function makeFont(size, style) {
        try {
            return ScriptUI.newFont("Segoe UI", style || "REGULAR", size);
        } catch (e) {
            try {
                return ScriptUI.newFont("Arial", style || "REGULAR", size);
            } catch (e2) {
                return null;
            }
        }
    }

    function buildWindow() {
        var win = new Window("dialog", "RELAX - Illustrator Arcade");
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 5;
        win.margins = 14;
        win.preferredSize = [470, 400];

        var g = win.graphics;
        g.backgroundColor = g.newBrush(g.BrushType.SOLID_COLOR, norm(BG_RGB));
        var fgPen = g.newPen(g.PenType.SOLID_COLOR, norm(FG_RGB), 1);
        var mutedPen = g.newPen(g.PenType.SOLID_COLOR, norm(MUTED_RGB), 1);
        var accentPen = g.newPen(g.PenType.SOLID_COLOR, norm(ACCENT_RGB), 1);

        var title = win.add("statictext", undefined, "RELAX");
        title.graphics.foregroundColor = accentPen;
        var titleFont = makeFont(22, "BOLD");
        if (titleFont) title.graphics.font = titleFont;

        var sub = win.add("statictext", undefined, "Eight games inside Illustrator - click a title or press 1-8");
        sub.graphics.foregroundColor = mutedPen;
        win.add("panel").preferredSize = [440, 1];

        var buttons = [];

        for (var i = 0; i < GAMES.length; i++) {
            var game = GAMES[i];
            var exists = new File(gamePath(game)).exists;

            var row = win.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.spacing = 8;

            var key = row.add("statictext", undefined, String(i + 1));
            key.preferredSize = [14, 20];
            key.graphics.foregroundColor = exists ? accentPen : mutedPen;

            var btn = row.add("button", undefined, exists ? game.title : game.title + "  (missing)");
            btn.preferredSize = [140, 26];
            btn.enabled = exists;
            buttons.push(btn);

            var tag = row.add("statictext", undefined, game.tag);
            tag.preferredSize = [62, 20];
            tag.graphics.foregroundColor = mutedPen;
            var tagFont = makeFont(9, "REGULAR");
            if (tagFont) tag.graphics.font = tagFont;

            var desc = row.add("statictext", undefined, game.desc);
            desc.preferredSize = [196, 20];
            desc.graphics.foregroundColor = fgPen;
        }

        win.add("panel").preferredSize = [440, 1];

        var footer = win.add("group");
        footer.orientation = "row";
        footer.alignChildren = ["left", "center"];
        footer.spacing = 6;

        var btnRandom = footer.add("button", undefined, "\u2605 Random");
        btnRandom.preferredSize = [82, 24];

        var btnDocs = footer.add("button", undefined, "\u2756 Docs");
        btnDocs.preferredSize = [70, 24];

        var btnFolder = footer.add("button", undefined, "Folder");
        btnFolder.preferredSize = [70, 24];

        var btnLogs = footer.add("button", undefined, "Logs");
        btnLogs.preferredSize = [64, 24];

        var spacer = footer.add("statictext", undefined, "");
        spacer.preferredSize = [8, 24];

        var btnClose = footer.add("button", undefined, "Close (Esc)", { name: "cancel" });
        btnClose.preferredSize = [92, 24];

        var hint = win.add("statictext", undefined, "Animation runs on its own on Windows (heartbeat). On macOS move the mouse.");
        hint.graphics.foregroundColor = mutedPen;
        var hintFont = makeFont(9, "REGULAR");
        if (hintFont) hint.graphics.font = hintFont;

        return {
            win: win,
            buttons: buttons,
            btnRandom: btnRandom,
            btnDocs: btnDocs,
            btnFolder: btnFolder,
            btnLogs: btnLogs,
            btnClose: btnClose
        };
    }

    // Shows the launcher and returns the chosen index, or -1 to quit.
    function showMenu() {
        var chosen = -1;
        var ui = buildWindow();
        var win = ui.win;

        for (var i = 0; i < ui.buttons.length; i++) {
            ui.buttons[i].onClick = (function (index) {
                return function () {
                    chosen = index;
                    win.close();
                };
            })(i);
        }

        ui.btnRandom.onClick = function () {
            chosen = Math.floor(Math.random() * GAMES.length);
            win.close();
        };

        ui.btnDocs.onClick = function () {
            var doc = new File(BASE_DIR + "/README.md");
            if (doc.exists) {
                doc.execute();
            } else {
                alert("README.md not found in\n" + BASE_DIR);
            }
        };

        ui.btnFolder.onClick = function () {
            var folder = new Folder(BASE_DIR);
            if (folder.exists) folder.execute();
        };

        ui.btnLogs.onClick = function () {
            try {
                Folder.temp.execute();
            } catch (e) {
                alert("Logs are written to:\n" + Folder.temp.fsName);
            }
        };

        ui.btnClose.onClick = function () {
            chosen = -1;
            win.close();
        };

        // Digit shortcuts. Global listeners are needed because the custom
        // group area never receives keyboard focus.
        var onKey = function (ev) {
            var name = String(ev.keyName || "");
            var digit = parseInt(name, 10);
            if (digit >= 1 && digit <= GAMES.length) {
                ev.preventDefault();
                chosen = digit - 1;
                win.close();
            }
        };
        win.addEventListener("keydown", onKey);
        for (var b = 0; b < ui.buttons.length; b++) {
            ui.buttons[b].addEventListener("keydown", onKey);
        }
        ui.btnClose.addEventListener("keydown", onKey);

        win.center();
        win.show();
        return chosen;
    }

    // --------------------------------------------------------------- main

    if (!BASE_DIR) {
        alert("Cannot determine the launcher folder ($.fileName is empty).");
        return;
    }
    if (!(new File(BASE_DIR + "/lib/GameCore.jsx")).exists) {
        alert("The lib/ folder was not found next to this launcher.\n\n" +
              "Copy the whole relax folder, not a single .jsx file.");
        return;
    }

    while (true) {
        var index = showMenu();
        if (index < 0) break;
        runGame(GAMES[index]);
    }
})();
