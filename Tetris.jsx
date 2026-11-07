#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"
#include "lib/GameAnim.jsx"

/**
 * TETRIS — Designer Edition for Adobe Illustrator (ExtendScript / ScriptUI)
 *
 * Features:
 * - Authentic 10x20 well, 7-Bag randomizer, Wall-Kick rotation, Ghost piece, Hold & Next preview
 * - Hybrid Real-Time + Tactical Gravity (real-time clock during input/mouse movement + tactical step)
 * - Bespoke Smooth Vector Numeral & Micro-Font Engine (100% pixel-perfect HUD & overlays)
 * - Tactile 3D tetromino blocks with specular highlights and shadow lips
 * - Dark Espresso & Classic Light themes (1-click toggle, persisted)
 * - Localizations: English (EN), Czech (CS), Romanian (RO), Hindi (HI)
 * - 1-click Vector Export of the board snapshot plus a score header text to the active artboard
 */

(function () {
    var COLS = 10;
    var ROWS = 20;
    var CELL = 21;
    var GAP = 1;
    var STEP = CELL + GAP; // 22 px
    var WELL_PAD = 6;
    var WELL_W = COLS * STEP - GAP + WELL_PAD * 2; // 231 px
    var WELL_H = ROWS * STEP - GAP + WELL_PAD * 2; // 451 px
    var SIDE_GAP = 10;
    var SIDE_W = 124;
    var CANVAS_W = WELL_W + SIDE_GAP + SIDE_W; // 365 px
    var CANVAS_H = WELL_H; // 451 px

    // ==================== LOCALIZATION (EN, CS, RO, HI) ====================

    var LANG_ORDER = ["en", "cs", "ro", "hi"];
    var currentLang = "en";
    var darkTheme = true;

    var I18N = {
        en: {
            langName: "English",
            btnNew: "↻ New (N)",
            btnHold: "⇄ Hold (C)",
            btnDrop: "⇓ Drop (Space)",
            btnVector: "❖ To Artboard",
            btnClose: "Close (Esc)",
            themeDark: "◐ Dark",
            themeLight: "☀ Light",
            controlsHint: "WASD/Arrows • Space: Drop",
            statusReady: "Arrows/WASD: Move & Rotate • Space: Drop • C: Hold",
            statusNoHeartbeat: "Timer unavailable - move the mouse to advance.",
            statusRestored: "Game restored! Press any control key to continue.",
            statusNewGame: "New Tetris game started! Good luck!",
            statusHoldUsed: "Hold already used this turn!",
            statusHeld: "Piece held in reserve.",
            statusLine1: "★ SINGLE! +1 line ({0} pts)",
            statusLine2: "★★ DOUBLE! +2 lines ({0} pts)",
            statusLine3: "★★★ TRIPLE! +3 lines ({0} pts)",
            statusLine4: "★★★★ TETRIS! +4 lines ({0} pts)!",
            statusGameOver: "Game Over! Score: {0}. Press 'New (N)' to play again.",
            exportOk: "✓ Vector Tetris board created on layer '{0}'!",
            exportErr: "Export error: {0}"
        },
        cs: {
            langName: "Čeština",
            btnNew: "↻ Nová (N)",
            btnHold: "⇄ Držet (C)",
            btnDrop: "⇓ Shodit (Space)",
            btnVector: "❖ Do křivek",
            btnClose: "Zavřít (Esc)",
            themeDark: "◐ Tmavý",
            themeLight: "☀ Světlý",
            controlsHint: "WASD/Šipky • Space: Shodit",
            statusReady: "Šipky/WASD: Pohyb & rotace • Space: Shodit • C: Držet",
            statusNoHeartbeat: "Časovač nedostupný - posun myší.",
            statusRestored: "Hra obnovena! Pokračujte libovolnou klávesou.",
            statusNewGame: "Nová hra zahájena! Hodně štěstí!",
            statusHoldUsed: "Rezerva již byla v tomto tahu použita!",
            statusHeld: "Kostka uložena do rezervy.",
            statusLine1: "★ SINGLE! +1 řada ({0} b.)",
            statusLine2: "★★ DOUBLE! +2 řady ({0} b.)",
            statusLine3: "★★★ TRIPLE! +3 řady ({0} b.)",
            statusLine4: "★★★★ TETRIS! +4 řady ({0} b.)!",
            statusGameOver: "Konec hry! Skóre: {0}. Klikněte na 'Nová (N)'.",
            exportOk: "✓ Pole vykresleno do vrstvy '{0}'!",
            exportErr: "Chyba exportu: {0}"
        },
        ro: {
            langName: "Română",
            btnNew: "↻ Nou (N)",
            btnHold: "⇄ Rezervă (C)",
            btnDrop: "⇓ Jos (Space)",
            btnVector: "❖ Pe Artboard",
            btnClose: "Închide (Esc)",
            themeDark: "◐ Întunecat",
            themeLight: "☀ Luminos",
            controlsHint: "WASD/Săgeți • Space: Jos",
            statusReady: "Săgeți/WASD: Mutare & Rotire • Space: Jos • C: Rezervă",
            statusNoHeartbeat: "Cronometru indisponibil - mișcă mouse-ul.",
            statusRestored: "Joc restaurat! Apăsați orice tastă pentru a continua.",
            statusNewGame: "Joc nou început! Mult succes!",
            statusHoldUsed: "Rezerva a fost deja folosită în această tură!",
            statusHeld: "Piesă salvată în rezervă.",
            statusLine1: "★ SINGLE! +1 linie ({0} pct.)",
            statusLine2: "★★ DOUBLE! +2 linii ({0} pct.)",
            statusLine3: "★★★ TRIPLE! +3 linii ({0} pct.)",
            statusLine4: "★★★★ TETRIS! +4 linii ({0} pct.)!",
            statusGameOver: "Joc încheiat! Scor: {0}. Apăsați 'Nou (N)'.",
            exportOk: "✓ Tabla a fost desenată în stratul '{0}'!",
            exportErr: "Eroare la export: {0}"
        },
        hi: {
            langName: "हिन्दी",
            btnNew: "↻ नया (N)",
            btnHold: "⇄ होल्ड (C)",
            btnDrop: "⇓ ड्रॉप (Space)",
            btnVector: "❖ आर्टबोर्ड पर",
            btnClose: "बंद करें (Esc)",
            themeDark: "◐ डार्क",
            themeLight: "☀ लाइट",
            controlsHint: "WASD/तीर • Space: ड्रॉप",
            statusReady: "तीर/WASD: चाल और घुमाव • Space: ड्रॉप • C: होल्ड",
            statusNoHeartbeat: "टाइमर अनुपलब्ध - माउस हिलाएँ।",
            statusRestored: "खेल बहाल किया गया! जारी रखने के लिए कोई भी कुंजी दबाएँ।",
            statusNewGame: "नया टेट्रिस खेल शुरू हुआ! शुभकामनाएँ!",
            statusHoldUsed: "इस चाल में होल्ड पहले ही उपयोग हो चुका है!",
            statusHeld: "टुकड़ा होल्ड में रखा गया।",
            statusLine1: "★ सिंगल! +1 लाइन ({0} अंक)",
            statusLine2: "★★ डबल! +2 लाइनें ({0} अंक)",
            statusLine3: "★★★ ट्रिपल! +3 लाइनें ({0} अंक)",
            statusLine4: "★★★★ टेट्रिस! +4 लाइनें ({0} अंक)!",
            statusGameOver: "खेल समाप्त! स्कोर: {0}। 'नया (N)' दबाएँ।",
            exportOk: "✓ वेक्टर बोर्ड '{0}' लेयर पर बनाया गया!",
            exportErr: "निर्यात त्रुटि: {0}"
        }
    };

    function tr(key, args) {
        return translateString(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    // ==================== TETROMINO DEFINITIONS & PALETTE ====================

    // IDs: 1=I, 2=O, 3=T, 4=S, 5=Z, 6=J, 7=L
    var PIECES = {
        1: {
            name: "I",
            bg: [0, 210, 230],
            lip: [0, 148, 168],
            shapes: [
                [[0, 1], [1, 1], [2, 1], [3, 1]],
                [[2, 0], [2, 1], [2, 2], [2, 3]],
                [[0, 2], [1, 2], [2, 2], [3, 2]],
                [[1, 0], [1, 1], [1, 2], [1, 3]]
            ]
        },
        2: {
            name: "O",
            bg: [242, 202, 42],
            lip: [192, 152, 16],
            shapes: [
                [[1, 0], [2, 0], [1, 1], [2, 1]],
                [[1, 0], [2, 0], [1, 1], [2, 1]],
                [[1, 0], [2, 0], [1, 1], [2, 1]],
                [[1, 0], [2, 0], [1, 1], [2, 1]]
            ]
        },
        3: {
            name: "T",
            bg: [176, 86, 228],
            lip: [126, 48, 174],
            shapes: [
                [[1, 0], [0, 1], [1, 1], [2, 1]],
                [[1, 0], [1, 1], [2, 1], [1, 2]],
                [[0, 1], [1, 1], [2, 1], [1, 2]],
                [[1, 0], [0, 1], [1, 1], [1, 2]]
            ]
        },
        4: {
            name: "S",
            bg: [86, 208, 96],
            lip: [48, 152, 58],
            shapes: [
                [[1, 0], [2, 0], [0, 1], [1, 1]],
                [[1, 0], [1, 1], [2, 1], [2, 2]],
                [[1, 1], [2, 1], [0, 2], [1, 2]],
                [[0, 0], [0, 1], [1, 1], [1, 2]]
            ]
        },
        5: {
            name: "Z",
            bg: [236, 76, 76],
            lip: [182, 42, 42],
            shapes: [
                [[0, 0], [1, 0], [1, 1], [2, 1]],
                [[2, 0], [1, 1], [2, 1], [1, 2]],
                [[0, 1], [1, 1], [1, 2], [2, 2]],
                [[1, 0], [0, 1], [1, 1], [0, 2]]
            ]
        },
        6: {
            name: "J",
            bg: [66, 118, 238],
            lip: [38, 78, 182],
            shapes: [
                [[0, 0], [0, 1], [1, 1], [2, 1]],
                [[1, 0], [2, 0], [1, 1], [1, 2]],
                [[0, 1], [1, 1], [2, 1], [2, 2]],
                [[1, 0], [1, 1], [0, 2], [1, 2]]
            ]
        },
        7: {
            name: "L",
            bg: [242, 142, 48],
            lip: [188, 98, 22],
            shapes: [
                [[2, 0], [0, 1], [1, 1], [2, 1]],
                [[1, 0], [1, 1], [1, 2], [2, 2]],
                [[0, 1], [1, 1], [2, 1], [0, 2]],
                [[0, 0], [1, 0], [1, 1], [1, 2]]
            ]
        }
    };

    var PALETTE = {
        winBgDark: [36, 33, 38],
        winBgLight: [245, 242, 235],
        wellFrameDark: [56, 52, 62],
        wellFrameLight: [175, 168, 158],
        wellBgDark: [24, 22, 28],
        wellBgLight: [225, 220, 212],
        cellEmptyDark: [34, 31, 39],
        cellEmptyLight: [212, 206, 196],
        cardBgDark: [52, 48, 58],
        cardBgLight: [195, 188, 178],
        cardLipDark: [34, 30, 38],
        cardLipLight: [165, 158, 148],
        gold: [242, 202, 42]
    };

    // ==================== GAME STATE ====================

    var board = []; // ROWS x COLS (0 or 1..7)
    var bag = [];
    var curType = 1;
    var curRot = 0;
    var curX = 3;
    var curY = 0;
    var nextType = 2;
    var holdType = 0;
    var holdUsed = false;

    var score = 0;
    var bestScore = 0;
    var lastGained = 0;
    var lines = 0;
    var level = 1;
    var gameOver = false;

    var lastGravityTime = new Date().getTime();
    var tacticalSubSteps = 0;
    var prevY = 0;      // previous row of the falling piece, for smooth rendering
    var saveDirty = false;
    var lastSaveTime = 0;

    var statusKey = "statusReady";
    var statusArgs = [];

    function setStatus(key, args) {
        statusKey = key;
        statusArgs = args || [];
    }

    // ==================== PERSISTENCE ====================

    function getSaveFile() {
        return getGameSaveFile("Tetris");
    }

    function saveStateToDisk() {
        if (!board || board.length !== ROWS) return;
        var flat = [];
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                flat.push(board[r][c]);
            }
        }
        writeKeyValueFile(getSaveFile(), [
            "lang=" + currentLang,
            "dark=" + (darkTheme ? 1 : 0),
            "best=" + bestScore,
            "score=" + score,
            "lines=" + lines,
            "level=" + level,
            "over=" + (gameOver ? 1 : 0),
            "curType=" + curType,
            "curRot=" + curRot,
            "curX=" + curX,
            "curY=" + curY,
            "nextType=" + nextType,
            "holdType=" + holdType,
            "holdUsed=" + (holdUsed ? 1 : 0),
            "board=" + flat.join(",")
        ]);
        lastSaveTime = new Date().getTime();
        saveDirty = false;
    }

    // Per-step state changes only mark the save as dirty: writing 200 board
    // cells on every gravity tick caused a disk write ~16 times per second.
    // Discrete events (line clear, hold, game over, close) still write at once.
    function markDirty() {
        saveDirty = true;
    }

    function flushSave(force) {
        if (!saveDirty) return;
        var now = new Date().getTime();
        if (!force && now - lastSaveTime < 3000) return;
        saveStateToDisk();
    }

    function loadStateFromDisk() {
        try {
            var map = readKeyValueFile(getSaveFile());
            if (!map) return false;

            if (map.lang && I18N[map.lang]) currentLang = map.lang;
            if (map.dark !== undefined) darkTheme = (map.dark === "1");
            if (map.best) bestScore = parseInt(map.best, 10) || 0;
            if (!map.board || map.over === "1") return false;

            var parts = map.board.split(",");
            if (parts.length !== ROWS * COLS) return false;

            board = createEmptyBoard();
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    board[r][c] = parseInt(parts[r * COLS + c], 10) || 0;
                }
            }

            score = parseInt(map.score, 10) || 0;
            lines = parseInt(map.lines, 10) || 0;
            level = parseInt(map.level, 10) || 1;
            curType = parseInt(map.curType, 10) || 1;
            curRot = parseInt(map.curRot, 10) || 0;
            curX = parseInt(map.curX, 10) || 3;
            curY = parseInt(map.curY, 10) || 0;
            nextType = parseInt(map.nextType, 10) || drawFromBag();
            holdType = parseInt(map.holdType, 10) || 0;
            holdUsed = (map.holdUsed === "1");
            gameOver = false;
            lastGravityTime = new Date().getTime();
            return true;
        } catch (e) {
            return false;
        }
    }

    // ==================== CORE TETRIS LOGIC ====================

    function createEmptyBoard() {
        var b = [];
        for (var r = 0; r < ROWS; r++) {
            var row = [];
            for (var c = 0; c < COLS; c++) {
                row.push(0);
            }
            b.push(row);
        }
        return b;
    }

    function refillBag() {
        var arr = [1, 2, 3, 4, 5, 6, 7];
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        for (var k = 0; k < arr.length; k++) {
            bag.push(arr[k]);
        }
    }

    function drawFromBag() {
        if (bag.length === 0) refillBag();
        return bag.shift();
    }

    function getCells(type, rot, px, py) {
        var shape = PIECES[type].shapes[rot % 4];
        var res = [];
        for (var i = 0; i < 4; i++) {
            res.push({
                x: px + shape[i][0],
                y: py + shape[i][1]
            });
        }
        return res;
    }

    function isValidPos(type, rot, px, py) {
        var cells = getCells(type, rot, px, py);
        for (var i = 0; i < 4; i++) {
            var cx = cells[i].x;
            var cy = cells[i].y;
            if (cx < 0 || cx >= COLS || cy >= ROWS) return false;
            if (cy >= 0 && board[cy][cx] !== 0) return false;
        }
        return true;
    }

    function getGhostY() {
        var gy = curY;
        while (isValidPos(curType, curRot, curX, gy + 1)) {
            gy++;
        }
        return gy;
    }

    function getDropIntervalMs() {
        // Speeds up from 800ms at Level 1 down to 120ms at Level 15+
        return Math.max(120, 800 - (level - 1) * 50);
    }

    function spawnPiece(type) {
        curType = type;
        curRot = 0;
        curX = 3;
        curY = 0;
        prevY = 0;
        holdUsed = false;
        tacticalSubSteps = 0;
        lastGravityTime = new Date().getTime();
        animBegin(getDropIntervalMs());

        if (!isValidPos(curType, curRot, curX, curY)) {
            gameOver = true;
            setStatus("statusGameOver", [score]);
            saveStateToDisk();
            return false;
        }
        return true;
    }

    function startNewGame() {
        board = createEmptyBoard();
        bag = [];
        score = 0;
        lastGained = 0;
        lines = 0;
        level = 1;
        holdType = 0;
        holdUsed = false;
        gameOver = false;
        nextType = drawFromBag();
        spawnPiece(drawFromBag());
        setStatus("statusNewGame");
        saveStateToDisk();
    }

    function lockAndClearLines() {
        var cells = getCells(curType, curRot, curX, curY);
        for (var i = 0; i < 4; i++) {
            var cx = cells[i].x;
            var cy = cells[i].y;
            if (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS) {
                board[cy][cx] = curType;
            }
        }

        // Check full rows
        var cleared = 0;
        for (var r = ROWS - 1; r >= 0; r--) {
            var full = true;
            for (var c = 0; c < COLS; c++) {
                if (board[r][c] === 0) {
                    full = false;
                    break;
                }
            }
            if (full) {
                cleared++;
                board.splice(r, 1);
                var emptyRow = [];
                for (var ec = 0; ec < COLS; ec++) emptyRow.push(0);
                board.unshift(emptyRow);
                r++; // re-check shifted row
            }
        }

        if (cleared > 0) {
            var basePts = [0, 100, 300, 500, 800][cleared] || 800;
            var pts = basePts * level;
            lastGained = pts;
            score += pts;
            if (score > bestScore) bestScore = score;
            lines += cleared;
            level = Math.floor(lines / 10) + 1;
            setStatus("statusLine" + Math.min(4, cleared), [pts]);
        } else {
            lastGained = 0;
        }

        if (score > bestScore) bestScore = score;

        var upcoming = nextType;
        nextType = drawFromBag();
        spawnPiece(upcoming);
        saveStateToDisk();
    }

    function moveHorizontal(dx) {
        if (gameOver) return false;
        var moved = false;
        if (isValidPos(curType, curRot, curX + dx, curY)) {
            curX += dx;
            moved = true;
        }
        // Tactical gravity: every 2 horizontal/rotation maneuvers, step down 1 row if time/tactical threshold reached
        tacticalSubSteps++;
        if (tacticalSubSteps >= 2) {
            tacticalSubSteps = 0;
            if (isValidPos(curType, curRot, curX, curY + 1)) {
                prevY = curY;
                curY++;
                animBegin(getDropIntervalMs());
                lastGravityTime = new Date().getTime();
            }
        }
        markDirty();
        return moved;
    }

    function rotatePiece(dir) {
        if (gameOver) return false;
        var newRot = (curRot + (dir > 0 ? 1 : 3)) % 4;
        var kicks = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]];
        for (var i = 0; i < kicks.length; i++) {
            var kx = curX + kicks[i][0];
            var ky = curY + kicks[i][1];
            if (isValidPos(curType, newRot, kx, ky)) {
                curRot = newRot;
                curX = kx;
                curY = ky;
                tacticalSubSteps++;
                if (tacticalSubSteps >= 3) {
                    tacticalSubSteps = 0;
                    if (isValidPos(curType, curRot, curX, curY + 1)) {
                        prevY = curY;
                        curY++;
                        animBegin(getDropIntervalMs());
                        lastGravityTime = new Date().getTime();
                    }
                }
                markDirty();
                return true;
            }
        }
        return false;
    }

    function softDrop(fromUser) {
        if (gameOver) return false;
        lastGravityTime = new Date().getTime();
        tacticalSubSteps = 0;
        if (isValidPos(curType, curRot, curX, curY + 1)) {
            prevY = curY;
            curY++;
            animBegin(getDropIntervalMs());
            if (fromUser) {
                score += 1;
                if (score > bestScore) bestScore = score;
            }
            markDirty();
            return true;
        } else {
            lockAndClearLines();
            return false;
        }
    }

    function hardDrop() {
        if (gameOver) return false;
        var dist = 0;
        while (isValidPos(curType, curRot, curX, curY + 1)) {
            curY++;
            dist++;
        }
        score += dist * 2;
        if (score > bestScore) bestScore = score;
        prevY = curY;
        lastGravityTime = new Date().getTime();
        tacticalSubSteps = 0;
        lockAndClearLines();
        return true;
    }

    function holdCurrentPiece() {
        if (gameOver) return false;
        if (holdUsed) {
            setStatus("statusHoldUsed");
            return false;
        }
        var prevHold = holdType;
        holdType = curType;
        if (prevHold === 0) {
            var upcoming = nextType;
            nextType = drawFromBag();
            spawnPiece(upcoming);
        } else {
            spawnPiece(prevHold);
        }
        holdUsed = true;
        setStatus("statusHeld");
        saveStateToDisk();
        return true;
    }

    /**
     * Checks real-time wall clock on any user interaction or mouse movement
     */
    function checkRealtimeGravity() {
        flushSave(false);
        if (gameOver) return false;
        var now = new Date().getTime();
        var interval = getDropIntervalMs();
        if (now - lastGravityTime >= interval) {
            lastGravityTime = now;
            softDrop(false);
            return true;
        }
        return false;
    }

    // ==================== VECTOR GRAPHICS ENGINE ====================

    /**
     * Draws digits '0'..'9', '+', and HUD letters ('N','E','X','T','H','O','L','D','S','C','R','B','I','V')
     */
    function drawVectorString(g, strVal, cx, cy, glyphH, rgbColor, alpha) {
        drawGlyphRun(g, strVal, cx, cy, glyphH, rgbColor, alpha, drawVectorGlyph, 0.20);
    }

    function drawVectorGlyph(g, ch, cx, cy, h, brush) {
        var w = h * 0.62;
        var t = Math.max(1.1, h * 0.11);
        var left = cx - w / 2 + t;
        var right = cx + w / 2 - t;
        var top = cy - h / 2 + t;
        var bot = cy + h / 2 - t;
        var rx = (right - left) / 2;
        var midY = cy;

        if (ch === "+") {
            var arm = h * 0.28;
            fillCapsule(g, cx - arm, cy, cx + arm, cy, t * 0.85, brush);
            fillCapsule(g, cx, cy - arm, cx, cy + arm, t * 0.85, brush);
        } else if (ch === "0" || ch === "O") {
            fillArcBand(g, cx, top + rx, rx, t, 180, 360, brush);
            fillArcBand(g, cx, bot - rx, rx, t, 0, 180, brush);
            fillCapsule(g, left, top + rx, left, bot - rx, t, brush);
            fillCapsule(g, right, top + rx, right, bot - rx, t, brush);
        } else if (ch === "1") {
            var stemX = cx + rx * 0.15;
            fillCapsule(g, stemX, top, stemX, bot, t, brush);
            fillCapsule(g, stemX, top, cx - rx * 0.55, top + rx * 0.65, t, brush);
            fillCapsule(g, cx - rx * 0.55, bot, cx + rx * 0.75, bot, t, brush);
        } else if (ch === "2") {
            fillArcBand(g, cx, top + rx, rx, t, 195, 395, brush);
            var a35 = (35 * Math.PI) / 180;
            fillCapsule(g, cx + Math.cos(a35) * rx, top + rx + Math.sin(a35) * rx, left, bot, t, brush);
            fillCapsule(g, left, bot, right, bot, t, brush);
        } else if (ch === "3") {
            var rTop3 = (midY - top) / 2;
            var rBot3 = (bot - midY) / 2;
            fillArcBand(g, cx, top + rTop3, rTop3, t, 195, 450, brush);
            fillArcBand(g, cx, midY + rBot3, rBot3, t, 270, 525, brush);
            fillCapsule(g, cx - rx * 0.35, midY, cx + rx * 0.05, midY, t, brush);
        } else if (ch === "4") {
            var stem4X = left + (right - left) * 0.68;
            var bar4Y = cy + h * 0.10;
            fillCapsule(g, stem4X, top, stem4X, bot, t, brush);
            fillCapsule(g, left, bar4Y, right + t * 0.2, bar4Y, t, brush);
            fillCapsule(g, stem4X, top, left, bar4Y, t, brush);
        } else if (ch === "5" || ch === "S") {
            var mid5Y = cy - h * 0.03;
            var rBot5 = (bot - mid5Y) / 2;
            fillCapsule(g, left, top, right, top, t, brush);
            fillCapsule(g, left, top, left, mid5Y, t, brush);
            fillCapsule(g, left, mid5Y, cx + rx * 0.1, mid5Y, t, brush);
            fillArcBand(g, cx, mid5Y + rBot5, rBot5, t, 265, 520, brush);
        } else if (ch === "6") {
            fillArcBand(g, cx, bot - rx, rx, t, 0, 180, brush);
            fillArcBand(g, cx, bot - rx, rx, t, 180, 360, brush);
            fillCapsule(g, left, top + rx, left, bot - rx, t, brush);
            fillArcBand(g, cx, top + rx, rx, t, 180, 335, brush);
        } else if (ch === "7") {
            fillCapsule(g, left, top, right, top, t, brush);
            fillCapsule(g, right, top, cx - rx * 0.25, bot, t, brush);
        } else if (ch === "8" || ch === "B") {
            var rTop8 = (midY - top) / 2;
            var rBot8 = (bot - midY) / 2;
            fillArcBand(g, cx, top + rTop8, rTop8 * 0.94, t, 180, 360, brush);
            fillArcBand(g, cx, top + rTop8, rTop8 * 0.94, t, 0, 180, brush);
            fillArcBand(g, cx, midY + rBot8, rBot8, t, 180, 360, brush);
            fillArcBand(g, cx, midY + rBot8, rBot8, t, 0, 180, brush);
            if (ch === "B") fillCapsule(g, left, top, left, bot, t, brush);
        } else if (ch === "9") {
            fillArcBand(g, cx, top + rx, rx, t, 180, 360, brush);
            fillArcBand(g, cx, top + rx, rx, t, 0, 180, brush);
            fillCapsule(g, right, top + rx, right, bot - rx, t, brush);
            fillArcBand(g, cx, bot - rx, rx, t, 0, 155, brush);
        } else if (ch === "N") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, top, right, bot, t, brush);
            fillCapsule(g, right, top, right, bot, t, brush);
        } else if (ch === "E") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, top, right, top, t, brush);
            fillCapsule(g, left, midY, right - rx * 0.3, midY, t, brush);
            fillCapsule(g, left, bot, right, bot, t, brush);
        } else if (ch === "X") {
            fillCapsule(g, left, top, right, bot, t, brush);
            fillCapsule(g, right, top, left, bot, t, brush);
        } else if (ch === "T") {
            fillCapsule(g, left, top, right, top, t, brush);
            fillCapsule(g, cx, top, cx, bot, t, brush);
        } else if (ch === "H") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, right, top, right, bot, t, brush);
            fillCapsule(g, left, midY, right, midY, t, brush);
        } else if (ch === "L") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, bot, right, bot, t, brush);
        } else if (ch === "D") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillArcBand(g, left, cy, (bot - top) / 2, t, 270, 450, brush);
        } else if (ch === "C") {
            fillArcBand(g, cx, top + rx, rx, t, 180, 340, brush);
            fillArcBand(g, cx, bot - rx, rx, t, 20, 180, brush);
            fillCapsule(g, left, top + rx, left, bot - rx, t, brush);
        } else if (ch === "R") {
            var rTopR = (midY - top) / 2;
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, top, cx, top, t, brush);
            fillCapsule(g, left, midY, cx, midY, t, brush);
            fillArcBand(g, cx, top + rTopR, rTopR, t, 270, 450, brush);
            fillCapsule(g, cx, midY, right, bot, t, brush);
        } else if (ch === "I") {
            fillCapsule(g, cx, top, cx, bot, t, brush);
            fillCapsule(g, left + rx * 0.3, top, right - rx * 0.3, top, t, brush);
            fillCapsule(g, left + rx * 0.3, bot, right - rx * 0.3, bot, t, brush);
        } else if (ch === "V") {
            fillCapsule(g, left, top, cx, bot, t, brush);
            fillCapsule(g, right, top, cx, bot, t, brush);
        }
    }

    // ==================== 3D TETROMINO BLOCK & HUD RENDERING ====================

    function draw3DBlock(g, x, y, size, typeId, alpha) {
        var p = PIECES[typeId];
        var lipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(p.lip, alpha));
        var faceBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(p.bg, alpha));
        var hiBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 0.28 * (alpha || 1)]);

        fillRoundRect(g, x, y, size, size, 3.5, lipBrush);
        fillRoundRect(g, x, y, size, size - 2.5, 3.5, faceBrush);
        fillRoundRect(g, x + 2.5, y + 1.5, size - 5, 2.5, 1, hiBrush);
    }

    function drawMiniPiece(g, typeId, boxX, boxY, boxW, boxH) {
        if (!typeId || !PIECES[typeId]) return;
        var shape = PIECES[typeId].shapes[0];
        var miniSize = 14;
        var miniStep = 15;

        var minX = 99, maxX = -99, minY = 99, maxY = -99;
        for (var i = 0; i < 4; i++) {
            if (shape[i][0] < minX) minX = shape[i][0];
            if (shape[i][0] > maxX) maxX = shape[i][0];
            if (shape[i][1] < minY) minY = shape[i][1];
            if (shape[i][1] > maxY) maxY = shape[i][1];
        }
        var pw = (maxX - minX + 1) * miniStep;
        var ph = (maxY - minY + 1) * miniStep;
        var startX = boxX + (boxW - pw) / 2;
        var startY = boxY + (boxH - ph) / 2 + 6;

        for (var j = 0; j < 4; j++) {
            var bx = startX + (shape[j][0] - minX) * miniStep;
            var by = startY + (shape[j][1] - minY) * miniStep;
            draw3DBlock(g, bx, by, miniSize, typeId, 1);
        }
    }

    function drawGameCanvas(g) {
        animProgress();
        var frameRgb = darkTheme ? PALETTE.wellFrameDark : PALETTE.wellFrameLight;
        var wellBgRgb = darkTheme ? PALETTE.wellBgDark : PALETTE.wellBgLight;
        var emptyRgb = darkTheme ? PALETTE.cellEmptyDark : PALETTE.cellEmptyLight;
        var cardBgRgb = darkTheme ? PALETTE.cardBgDark : PALETTE.cardBgLight;
        var cardLipRgb = darkTheme ? PALETTE.cardLipDark : PALETTE.cardLipLight;
        var labelRgb = darkTheme ? [175, 168, 185] : [95, 88, 80];

        var frameBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(frameRgb, 1));
        var wellBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(wellBgRgb, 1));
        var emptyBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(emptyRgb, 1));
        var cardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cardBgRgb, 1));
        var cardLipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cardLipRgb, 1));

        // --- 1. Main 10x20 Well Background ---
        fillRoundRect(g, 0, 0, WELL_W, WELL_H, 8, frameBrush);
        fillRoundRect(g, 3, 3, WELL_W - 6, WELL_H - 6, 6, wellBrush);

        // Grid slots & locked blocks
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                var cx = WELL_PAD + c * STEP;
                var cy = WELL_PAD + r * STEP;
                var val = board[r][c];
                if (val === 0) {
                    fillRoundRect(g, cx, cy, CELL, CELL, 2.5, emptyBrush);
                } else {
                    draw3DBlock(g, cx, cy, CELL, val, 1);
                }
            }
        }

        // --- 2. Ghost Piece & Active Falling Tetromino ---
        if (!gameOver) {
            var ghostY = getGhostY();
            if (ghostY > curY) {
                var ghostCells = getCells(curType, curRot, curX, ghostY);
                var ghostPen = g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(PIECES[curType].bg, 0.55), 1.5);
                for (var gi = 0; gi < 4; gi++) {
                    var gx = WELL_PAD + ghostCells[gi].x * STEP;
                    var gy = WELL_PAD + ghostCells[gi].y * STEP;
                    if (ghostCells[gi].y >= 0) {
                        strokeRoundRect(g, gx + 1, gy + 1, CELL - 2, CELL - 2, 3, ghostPen);
                    }
                }
            }

            var activeCells = getCells(curType, curRot, curX, curY);
            // The piece glides to its new row instead of jumping once per tick.
            var cellDY = (animLerp(prevY, curY) - curY) * STEP;
            for (var ai = 0; ai < 4; ai++) {
                if (activeCells[ai].y >= 0) {
                    var ax = WELL_PAD + activeCells[ai].x * STEP;
                    var ay = WELL_PAD + activeCells[ai].y * STEP + cellDY;
                    draw3DBlock(g, ax, ay, CELL, curType, 1);
                }
            }
        }

        // --- 3. Game Over Overlay inside the Well ---
        if (gameOver) {
            var ovBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.1, 0.09, 0.12, 0.86]);
            fillRoundRect(g, 3, 3, WELL_W - 6, WELL_H - 6, 6, ovBrush);

            var boxX = 18;
            var boxY = WELL_H / 2 - 55;
            var boxW = WELL_W - 36;
            fillRoundRect(g, boxX, boxY, boxW, 110, 8, cardBrush);
            drawVectorString(g, "OVER", WELL_W / 2, boxY + 34, 22, [236, 76, 76], 1);
            drawVectorString(g, score, WELL_W / 2, boxY + 78, 18, [255, 255, 255], 1);
        }

        // --- 4. Right Side HUD Column (x = WELL_W + SIDE_GAP) ---
        var sx = WELL_W + SIDE_GAP;

        // Card 1: NEXT (y = 0, h = 82)
        fillRoundRect(g, sx, 3, SIDE_W, 79, 7, cardLipBrush);
        fillRoundRect(g, sx, 0, SIDE_W, 79, 7, cardBrush);
        drawVectorString(g, "NEXT", sx + SIDE_W / 2, 13, 9, labelRgb, 1);
        drawMiniPiece(g, nextType, sx, 16, SIDE_W, 60);

        // Card 2: HOLD (y = 90, h = 82)
        fillRoundRect(g, sx, 93, SIDE_W, 79, 7, cardLipBrush);
        fillRoundRect(g, sx, 90, SIDE_W, 79, 7, cardBrush);
        drawVectorString(g, "HOLD", sx + SIDE_W / 2, 103, 9, labelRgb, 1);
        if (holdType > 0) {
            drawMiniPiece(g, holdType, sx, 106, SIDE_W, 60);
        }

        // Card 3: SCORE (y = 180, h = 62)
        fillRoundRect(g, sx, 183, SIDE_W, 59, 7, cardLipBrush);
        fillRoundRect(g, sx, 180, SIDE_W, 59, 7, cardBrush);
        drawVectorString(g, "SCORE", sx + SIDE_W / 2, 193, 8.5, labelRgb, 1);
        var scStr = String(score);
        var scH = scStr.length > 5 ? 14 : 17;
        drawVectorString(g, scStr, sx + SIDE_W / 2, 218, scH, [255, 255, 255], 1);

        // Card 4: BEST (y = 250, h = 62)
        fillRoundRect(g, sx, 253, SIDE_W, 59, 7, cardLipBrush);
        fillRoundRect(g, sx, 250, SIDE_W, 59, 7, cardBrush);
        drawVectorString(g, "BEST", sx + SIDE_W / 2, 263, 8.5, labelRgb, 1);
        var bsStr = String(bestScore);
        var bsH = bsStr.length > 5 ? 14 : 17;
        drawVectorString(g, bsStr, sx + SIDE_W / 2, 288, bsH, PALETTE.gold, 1);

        // Card 5: LINES (y = 320, h = 58)
        fillRoundRect(g, sx, 323, SIDE_W, 55, 7, cardLipBrush);
        fillRoundRect(g, sx, 320, SIDE_W, 55, 7, cardBrush);
        drawVectorString(g, "LINES", sx + SIDE_W / 2, 333, 8.5, labelRgb, 1);
        drawVectorString(g, lines, sx + SIDE_W / 2, 356, 16, [0, 210, 230], 1);

        // Card 6: LEVEL + Progress Bar (y = 386, h = 65)
        fillRoundRect(g, sx, 389, SIDE_W, 62, 7, cardLipBrush);
        fillRoundRect(g, sx, 386, SIDE_W, 62, 7, cardBrush);
        drawVectorString(g, "LVL", sx + SIDE_W / 2, 399, 8.5, labelRgb, 1);
        drawVectorString(g, level, sx + SIDE_W / 2, 420, 16, [86, 208, 96], 1);

        // Mini progress bar to next level (0..10 lines within current level)
        var lvlProg = (lines % 10) / 10;
        var trackBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(wellBgRgb, 1));
        var barBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([86, 208, 96], 1));
        fillRoundRect(g, sx + 10, 436, SIDE_W - 20, 6, 3, trackBrush);
        if (lvlProg > 0) {
            fillRoundRect(g, sx + 10, 436, Math.max(6, (SIDE_W - 20) * lvlProg), 6, 3, barBrush);
        }
    }

    // ==================== VECTOR EXPORT TO ARTBOARD ====================

    function exportTetrisToArtboard() {
        try {
            var doc;
            if (app.documents.length === 0) {
                doc = app.documents.add(DocumentColorSpace.RGB, 500, 600);
            } else {
                doc = app.activeDocument;
            }

            var abIndex = doc.artboards.getActiveArtboardIndex();
            var abRect = doc.artboards[abIndex].artboardRect;
            var abCenterX = (abRect[0] + abRect[2]) / 2;
            var abCenterY = (abRect[1] + abRect[3]) / 2;

            var layerName = "Tetris_Vector_Board";
            var targetLayer;
            try {
                targetLayer = doc.layers.getByName(layerName);
                targetLayer.locked = false;
                targetLayer.visible = true;
            } catch (e) {
                targetLayer = doc.layers.add();
                targetLayer.name = layerName;
            }

            var grp = targetLayer.groupItems.add();
            grp.name = "Tetris_Score_" + score;

            var startLeft = abCenterX - WELL_W / 2;
            var startTop = abCenterY + WELL_H / 2;

            var bgRect = grp.pathItems.roundedRectangle(startTop, startLeft, WELL_W, WELL_H, 8, 8);
            bgRect.stroked = false;
            bgRect.filled = true;
            bgRect.fillColor = makeRGBColor(PALETTE.wellBgDark);

            var headerTf = grp.textFrames.add();
            headerTf.contents = "TETRIS  |  SCORE: " + score + "  |  LINES: " + lines + "  |  LVL: " + level;
            headerTf.textRange.characterAttributes.size = 12;
            headerTf.textRange.characterAttributes.fillColor = makeRGBColor([80, 75, 90]);
            headerTf.position = [startLeft, startTop + 20];

            // Create combined grid snapshot including active piece
            var snap = createEmptyBoard();
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    snap[r][c] = board[r][c];
                }
            }
            if (!gameOver) {
                var act = getCells(curType, curRot, curX, curY);
                for (var i = 0; i < 4; i++) {
                    if (act[i].y >= 0 && act[i].y < ROWS && act[i].x >= 0 && act[i].x < COLS) {
                        snap[act[i].y][act[i].x] = curType;
                    }
                }
            }

            for (var gr = 0; gr < ROWS; gr++) {
                for (var gc = 0; gc < COLS; gc++) {
                    var bx = startLeft + WELL_PAD + gc * STEP;
                    var by = startTop - WELL_PAD - gr * STEP;
                    var cellVal = snap[gr][gc];

                    var rect = grp.pathItems.roundedRectangle(by, bx, CELL, CELL, 3, 3);
                    rect.stroked = false;
                    rect.filled = true;
                    if (cellVal === 0) {
                        rect.fillColor = makeRGBColor(PALETTE.cellEmptyDark);
                    } else {
                        rect.fillColor = makeRGBColor(PIECES[cellVal].bg);
                    }
                }
            }

            app.redraw();
            setStatus("exportOk", [layerName]);
            return true;
        } catch (err) {
            setStatus("exportErr", [err.message]);
            return false;
        }
    }

    // ==================== WINDOW & GAME UI LAYOUT ====================

    var WIN_TITLE = "TETRIS - Adobe Illustrator Edition";
    var HB = { title: WIN_TITLE, token: "Tetris", tickMs: 40 };

    if (!loadStateFromDisk()) {
        startNewGame();
    } else {
        setStatus("statusRestored");
    }

    var win = new Window("dialog", WIN_TITLE);
    win.orientation = "column";
    win.alignChildren = ["center", "top"];
    win.spacing = 6;
    win.margins = 12;

    // --- 1. Top Bar (Controls Hint + Theme Toggle + Language Selector) ---
    var topBar = win.add("group");
    topBar.orientation = "row";
    topBar.alignChildren = ["fill", "center"];
    topBar.spacing = 6;
    topBar.preferredSize = [CANVAS_W, 24];

    var hintLbl = topBar.add("statictext", undefined, tr("controlsHint"));
    hintLbl.alignment = ["left", "center"];
    hintLbl.preferredSize = [178, 20];

    var rightTopGrp = topBar.add("group");
    rightTopGrp.orientation = "row";
    rightTopGrp.alignment = ["right", "center"];
    rightTopGrp.spacing = 4;

    var btnTheme = rightTopGrp.add("button", undefined, darkTheme ? tr("themeDark") : tr("themeLight"));
    btnTheme.preferredSize = [86, 23];

    var langNames = [];
    var currentLangIndex = 0;
    for (var li = 0; li < LANG_ORDER.length; li++) {
        var code = LANG_ORDER[li];
        langNames.push(I18N[code].langName);
        if (code === currentLang) currentLangIndex = li;
    }
    var langDropdown = rightTopGrp.add("dropdownlist", undefined, langNames);
    langDropdown.selection = currentLangIndex;
    langDropdown.preferredSize = [90, 23];

    // --- 2. Quick Action Toolbar ---
    var actionGrp = win.add("group");
    actionGrp.orientation = "row";
    actionGrp.alignChildren = ["fill", "center"];
    actionGrp.spacing = 5;
    actionGrp.preferredSize = [CANVAS_W, 26];

    var btnNew = actionGrp.add("button", undefined, tr("btnNew"));
    btnNew.preferredSize = [86, 25];
    var btnHold = actionGrp.add("button", undefined, tr("btnHold"));
    btnHold.preferredSize = [86, 25];
    var btnDrop = actionGrp.add("button", undefined, tr("btnDrop"));
    btnDrop.preferredSize = [95, 25];
    var btnVector = actionGrp.add("button", undefined, tr("btnVector"));
    btnVector.preferredSize = [86, 25];

    // --- 3. Unified Game Canvas (10x20 Well + Side HUD) ---
    var gameCanvas = win.add("group");
    gameCanvas.preferredSize = [CANVAS_W, CANVAS_H];
    gameCanvas.minimumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.maximumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.onDraw = function () {
        drawGameCanvas(this.graphics);
    };

    // --- 4. Bottom Arcade Control Pad ---
    var bottomBar = win.add("group");
    bottomBar.orientation = "row";
    bottomBar.alignChildren = ["fill", "center"];
    bottomBar.preferredSize = [CANVAS_W, 28];
    bottomBar.spacing = 4;

    var btnLeft = bottomBar.add("button", undefined, "◄ A");
    btnLeft.preferredSize = [56, 26];
    var btnRotCCW = bottomBar.add("button", undefined, "↶ Z");
    btnRotCCW.preferredSize = [54, 26];
    var btnRotCW = bottomBar.add("button", undefined, "↻ W/▲");
    btnRotCW.preferredSize = [64, 26];
    var btnSoft = bottomBar.add("button", undefined, "▼ S");
    btnSoft.preferredSize = [54, 26];
    var btnRight = bottomBar.add("button", undefined, "► D");
    btnRight.preferredSize = [56, 26];
    var btnClose = bottomBar.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [65, 26];

    // --- 5. Status Footer ---
    var statusLbl = win.add("statictext", undefined, tr(statusKey, statusArgs));
    statusLbl.preferredSize = [CANVAS_W, 20];

    // ==================== THEME & UI REFRESH ====================

    function applyThemeColors() {
        var bgRgb = darkTheme ? PALETTE.winBgDark : PALETTE.winBgLight;
        var fgRgb = darkTheme ? [230, 225, 238] : [90, 84, 78];

        var bgBrush = win.graphics.newBrush(win.graphics.BrushType.SOLID_COLOR, rgbToNorm(bgRgb, 1));
        var fgPen = win.graphics.newPen(win.graphics.PenType.SOLID_COLOR, rgbToNorm(fgRgb, 1), 1);

        win.graphics.backgroundColor = bgBrush;
        try {
            hintLbl.graphics.foregroundColor = fgPen;
            statusLbl.graphics.foregroundColor = fgPen;
        } catch (e) {}

        btnTheme.text = darkTheme ? tr("themeDark") : tr("themeLight");
    }

    function applyLocalization() {
        hintLbl.text = tr("controlsHint");
        btnNew.text = tr("btnNew");
        btnHold.text = tr("btnHold");
        btnDrop.text = tr("btnDrop");
        btnVector.text = tr("btnVector");
        btnClose.text = tr("btnClose");
        btnTheme.text = darkTheme ? tr("themeDark") : tr("themeLight");
        refreshUI();
    }

    function refreshUI() {
        var pf0 = perfNow();
        statusLbl.text = tr(statusKey, statusArgs);
        var pf1 = perfNow();
        try {
            gameCanvas.hide();
            gameCanvas.show();
        } catch (e) {}
        var pf2 = perfNow();
        try {
            gameCanvas.notify("onDraw");
        } catch (e2) {}
        perfFrame(pf1 - pf0, pf2 - pf1, perfNow() - pf2);
    }

    function refocusControl() {
        try {
            btnDrop.active = true;
        } catch (e) {}
    }

    // ==================== EVENT HANDLERS ====================

    btnTheme.onClick = function () {
        darkTheme = !darkTheme;
        saveStateToDisk();
        applyThemeColors();
        refreshUI();
        refocusControl();
    };

    langDropdown.onChange = function () {
        if (langDropdown.selection !== null) {
            var idx = langDropdown.selection.index;
            if (LANG_ORDER[idx]) {
                currentLang = LANG_ORDER[idx];
                saveStateToDisk();
                applyLocalization();
                refocusControl();
            }
        }
    };

    btnNew.onClick = function () {
        startNewGame();
        refreshUI();
        refocusControl();
    };

    btnHold.onClick = function () {
        holdCurrentPiece();
        refreshUI();
        refocusControl();
    };

    btnDrop.onClick = function () {
        if (new Date().getTime() - lastKeyTime < 180) return;
        hardDrop();
        refreshUI();
        refocusControl();
    };

    btnVector.onClick = function () {
        exportTetrisToArtboard();
        refreshUI();
        refocusControl();
    };

    btnLeft.onClick = function () {
        moveHorizontal(-1);
        refreshUI();
        refocusControl();
    };

    btnRight.onClick = function () {
        moveHorizontal(1);
        refreshUI();
        refocusControl();
    };

    btnRotCCW.onClick = function () {
        rotatePiece(-1);
        refreshUI();
        refocusControl();
    };

    btnRotCW.onClick = function () {
        rotatePiece(1);
        refreshUI();
        refocusControl();
    };

    btnSoft.onClick = function () {
        softDrop(true);
        refreshUI();
        refocusControl();
    };

    btnClose.onClick = function () {
        heartbeatStop();
        flushSave(true);
        win.close();
    };

    // Real-time gravity tick when moving mouse over the window or canvas
    win.addEventListener("mousemove", function () {
        if (checkRealtimeGravity()) {
            refreshUI();
        } else if (animDue(33)) {
            refreshUI();
        }
    });
    gameCanvas.addEventListener("mousemove", function () {
        if (checkRealtimeGravity()) {
            refreshUI();
        } else if (animDue(33)) {
            refreshUI();
        }
    });

    // Mouse gestures on the board (Swipe or Zone Click)
    var dragStartX = null;
    var dragStartY = null;

    gameCanvas.addEventListener("mousedown", function (ev) {
        dragStartX = ev.clientX;
        dragStartY = ev.clientY;
    });

    gameCanvas.addEventListener("mouseup", function (ev) {
        if (dragStartX === null || dragStartY === null) return;
        var dx = ev.clientX - dragStartX;
        var dy = ev.clientY - dragStartY;
        var clickX = ev.clientX;
        var clickY = ev.clientY;
        dragStartX = null;
        dragStartY = null;

        // Click on HOLD box in HUD
        if (clickX >= WELL_W + SIDE_GAP && clickY >= 90 && clickY <= 172) {
            holdCurrentPiece();
            refreshUI();
            refocusControl();
            return;
        }

        if (clickX > WELL_W) return;

        var minSwipe = 18;
        if (Math.abs(dx) >= minSwipe || Math.abs(dy) >= minSwipe) {
            if (Math.abs(dx) > Math.abs(dy)) {
                moveHorizontal(dx > 0 ? 1 : -1);
            } else {
                if (dy > 45) hardDrop();
                else if (dy > 0) softDrop(true);
                else rotatePiece(1);
            }
        } else {
            // Zone click inside well: Left third = Left, Right third = Right, Top = Rotate, Bottom = Soft Drop
            if (clickY > WELL_H * 0.78) {
                softDrop(true);
            } else if (clickX < WELL_W * 0.34) {
                moveHorizontal(-1);
            } else if (clickX > WELL_W * 0.66) {
                moveHorizontal(1);
            } else {
                rotatePiece(1);
            }
        }
        refreshUI();
        refocusControl();
    });

    // Keyboard Controls + Autonomous Background Heartbeat (F15)
    var lastKeyTime = 0;
    function canAcceptKey() {
        var now = new Date().getTime();
        if (now - lastKeyTime < 65) return false;
        lastKeyTime = now;
        return true;
    }

    function handleKeyEvent(ev) {
        perfKey();
        var k = ev.keyName ? String(ev.keyName).toUpperCase() : "";

        if (k === "F15") {
            ev.preventDefault();
            if (checkRealtimeGravity()) {
                refreshUI();
            } else if (animDue(33)) {
                refreshUI();
            }
            return;
        }

        if (checkRealtimeGravity()) {
            refreshUI();
        }

        if (k === "LEFT" || k === "A") {
            if (!canAcceptKey()) return;
            ev.preventDefault();
            moveHorizontal(-1);
            refreshUI();
            refocusControl();
        } else if (k === "RIGHT" || k === "D") {
            if (!canAcceptKey()) return;
            ev.preventDefault();
            moveHorizontal(1);
            refreshUI();
            refocusControl();
        } else if (k === "UP" || k === "W" || k === "X") {
            if (!canAcceptKey()) return;
            ev.preventDefault();
            rotatePiece(1);
            refreshUI();
            refocusControl();
        } else if (k === "Z" || k === "Y" || k === "Q") {
            if (!canAcceptKey()) return;
            ev.preventDefault();
            rotatePiece(-1);
            refreshUI();
            refocusControl();
        } else if (k === "DOWN" || k === "S") {
            if (!canAcceptKey()) return;
            ev.preventDefault();
            softDrop(true);
            refreshUI();
            refocusControl();
        } else if (k === "SPACE" || k === "F") {
            if (!canAcceptKey()) return;
            ev.preventDefault();
            hardDrop();
            refreshUI();
            refocusControl();
        } else if (k === "C" || k === "H" || k === "R") {
            if (!canAcceptKey()) return;
            ev.preventDefault();
            holdCurrentPiece();
            refreshUI();
            refocusControl();
        } else if (k === "N") {
            if (!canAcceptKey()) return;
            ev.preventDefault();
            startNewGame();
            refreshUI();
            refocusControl();
        }
    }

    var focusTargets = [
        win, btnLeft, btnRight, btnRotCCW, btnRotCW, btnSoft,
        btnNew, btnHold, btnDrop, btnVector, btnTheme, btnClose, langDropdown
    ];
    for (var fi = 0; fi < focusTargets.length; fi++) {
        focusTargets[fi].addEventListener("keydown", handleKeyEvent);
    }

    win.onShow = function () {
        applyThemeColors();
        refocusControl();
        if (!heartbeatStart(HB)) {
            perfNote("heartbeat failed: " + heartbeatLastError());
            setStatus("statusNoHeartbeat");
            refreshUI();
        }
    };

    win.onClose = function () {
        perfClose();
        heartbeatStop();
        flushSave(true);
    };

    perfInit({ token: "Tetris", canvases: 1, canvasW: CANVAS_W, canvasH: CANVAS_H, tickMs: HB.tickMs, theme: darkTheme ? "dark" : "light", lang: currentLang });
    applyThemeColors();
    win.center();
    win.show();
    heartbeatStop();
})();
