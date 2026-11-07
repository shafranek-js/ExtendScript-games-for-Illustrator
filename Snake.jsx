#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"

/**
 * SNAKE — Designer Edition for Adobe Illustrator (ExtendScript / ScriptUI)
 *
 * Features:
 * - Autonomous Real-Time Game Loop via Win32Heartbeat (moves continuously on its own)
 * - 2-Step Buffered Turn Queue (prevents accidental 180-degree self-collisions on fast U-turns)
 * - 3 Arena Modes: [1] Classic Walls   [2] Portal Wrap-Around   [3] Labyrinth Obstacles
 * - Smooth Color-Gradient Snake Body with directional eyes, 3D apples with leaf, and timed Golden Bonus fruit
 * - Particle sparks on eating apples & bonus fruits
 * - Bespoke Smooth Vector Numeral & Glyph Engine (100% pixel-perfect HUD)
 * - Dark & Light themes, 4 Localizations (EN, CS, RO, HI), Auto-Saved Settings, and 1-Click Vector Artboard Export
 */

(function () {
    var GRID = 18;
    var CELL = 19;
    var GAP = 1;
    var STEP = CELL + GAP; // 20 px
    var PAD = 6;
    var BOARD_SIZE = GRID * STEP - GAP + PAD * 2; // 371 px
    var HUD_H = 48;
    var PLAY_Y = HUD_H + 6;
    var CANVAS_W = BOARD_SIZE;
    var CANVAS_H = PLAY_Y + BOARD_SIZE; // 425 px

    // ==================== LOCALIZATION (EN, CS, RO, HI) ====================

    var LANG_ORDER = ["en", "cs", "ro", "hi"];
    var currentLang = "en";
    var darkTheme = true;

    var I18N = {
        en: {
            langName: "English",
            btnNew: "↻ New (N)",
            btnMode: "◈ Mode: {0}",
            btnPause: "❚❚ Pause (Space)",
            btnResume: "► Play (Space)",
            btnVector: "❖ To Artboard",
            btnClose: "Close (Esc)",
            modeWalls: "Walls",
            modePortal: "Portals",
            modeMaze: "Maze",
            themeDark: "◐ Dark",
            themeLight: "☀ Light",
            controlsHint: "WASD / Arrows • Space: Pause",
            statusReady: "Press any Arrow / WASD key or Space to start!",
            statusNoHeartbeat: "Timer unavailable - move the mouse to advance.",
            statusPlaying: "Eat red apples (+10) and golden fruits (+50)!",
            statusPaused: "Game paused. Press Space or any direction to continue.",
            statusBonus: "★ GOLDEN FRUIT! +50 pts!",
            statusGameOver: "Game Over! Score: {0} (Length: {1}). Press Space or 'New'.",
            exportOk: "✓ Vector Snake board created on layer '{0}'!",
            exportErr: "Export error: {0}"
        },
        cs: {
            langName: "Čeština",
            btnNew: "↻ Nová (N)",
            btnMode: "◈ Režim: {0}",
            btnPause: "❚❚ Pauza (Space)",
            btnResume: "► Hrát (Space)",
            btnVector: "❖ Do křivek",
            btnClose: "Zavřít (Esc)",
            modeWalls: "Zdi",
            modePortal: "Portály",
            modeMaze: "Labyrint",
            themeDark: "◐ Tmavý",
            themeLight: "☀ Světlý",
            controlsHint: "WASD / Šipky • Space: Pauza",
            statusReady: "Stiskněte šipku / WASD nebo Space pro start!",
            statusNoHeartbeat: "Časovač nedostupný - posun myší.",
            statusPlaying: "Sbírejte jablka (+10) a zlaté bonusy (+50)!",
            statusPaused: "Hra pozastavena. Stiskněte Space pro pokračování.",
            statusBonus: "★ ZLATÝ BONUS! +50 b.!",
            statusGameOver: "Konec hry! Skóre: {0} (Délka: {1}). Stiskněte Space.",
            exportOk: "✓ Had vykreslen do vrstvy '{0}'!",
            exportErr: "Chyba exportu: {0}"
        },
        ro: {
            langName: "Română",
            btnNew: "↻ Nou (N)",
            btnMode: "◈ Mod: {0}",
            btnPause: "❚❚ Pauză (Space)",
            btnResume: "► Joacă (Space)",
            btnVector: "❖ Pe Artboard",
            btnClose: "Închide (Esc)",
            modeWalls: "Ziduri",
            modePortal: "Portal",
            modeMaze: "Labirint",
            themeDark: "◐ Întunecat",
            themeLight: "☀ Luminos",
            controlsHint: "WASD / Săgeți • Space: Pauză",
            statusReady: "Apăsați o săgeată / WASD sau Space pentru start!",
            statusNoHeartbeat: "Cronometru indisponibil - mișcă mouse-ul.",
            statusPlaying: "Adună merele roșii (+10) și fructele de aur (+50)!",
            statusPaused: "Joc în pauză. Apăsați Space pentru a continua.",
            statusBonus: "★ FRUCT DE AUR! +50 pct.!",
            statusGameOver: "Joc încheiat! Scor: {0} (Lungime: {1}). Apăsați Space.",
            exportOk: "✓ Tabla Snake desenată în stratul '{0}'!",
            exportErr: "Eroare la export: {0}"
        },
        hi: {
            langName: "हिन्दी",
            btnNew: "↻ नया (N)",
            btnMode: "◈ मोड: {0}",
            btnPause: "❚❚ पॉज़ (Space)",
            btnResume: "► खेलें (Space)",
            btnVector: "❖ आर्टबोर्ड पर",
            btnClose: "बंद करें (Esc)",
            modeWalls: "दीवार",
            modePortal: "पोर्टल",
            modeMaze: "भूलभुलैया",
            themeDark: "◐ डार्क",
            themeLight: "☀ लाइट",
            controlsHint: "WASD / तीर • Space: पॉज़",
            statusReady: "शुरू करने के लिए कोई भी तीर / WASD या Space दबाएँ!",
            statusNoHeartbeat: "टाइमर अनुपलब्ध - माउस हिलाएँ।",
            statusPlaying: "लाल सेब (+10) और सुनहरे फल (+50) खाएँ!",
            statusPaused: "खेल रुका हुआ है। जारी रखने के लिए Space दबाएँ।",
            statusBonus: "★ सुनहरा फल! +50 अंक!",
            statusGameOver: "खेल समाप्त! स्कोर: {0} (लंबाई: {1})। Space दबाएँ।",
            exportOk: "✓ वेक्टर बोर्ड '{0}' लेयर पर बनाया गया!",
            exportErr: "निर्यात त्रुटि: {0}"
        }
    };

    function tr(key, args) {
        return translateString(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    // ==================== PALETTE ====================

    var PALETTE = {
        winBgDark: [28, 34, 30],
        winBgLight: [242, 244, 235],
        frameDark: [48, 60, 52],
        frameLight: [168, 178, 162],
        boardBgDark: [20, 25, 22],
        boardBgLight: [222, 228, 214],
        cellAltDark: [25, 31, 27],
        cellAltLight: [214, 220, 205],
        hudCardDark: [42, 52, 46],
        hudCardLight: [188, 196, 180],
        hudLipDark: [26, 32, 28],
        hudLipLight: [158, 166, 150],
        wallBrick: [115, 128, 118],
        wallLip: [75, 86, 78],
        headRgb: [72, 232, 115],
        tailRgb: [36, 148, 225],
        appleRgb: [240, 68, 68],
        appleLip: [178, 36, 36],
        leafRgb: [90, 220, 100],
        goldRgb: [248, 206, 46],
        goldLip: [192, 146, 16]
    };

    // ==================== GAME STATE ====================

    // arenaMode: 0 = Walls, 1 = Portal Wrap, 2 = Maze + Portal
    var arenaMode = 0;
    var snake = []; // Array of {x, y}, index 0 is Head
    var walls = []; // Array of {x, y}
    var curDir = { dx: 1, dy: 0 };
    var dirQueue = [];

    var apple = { x: 12, y: 9 };
    var bonus = null; // { x, y, ticksLeft, maxTicks }
    var sparks = [];  // { x, y, vx, vy, color, life }

    var score = 0;
    var bestScore = 0;
    var applesEaten = 0;
    var paused = true;
    var gameOver = false;
    var lastStepTime = new Date().getTime();

    var statusKey = "statusReady";
    var statusArgs = [];

    function setStatus(key, args) {
        statusKey = key;
        statusArgs = args || [];
    }

    // ==================== PERSISTENCE ====================

    function getSaveFile() {
        return getGameSaveFile("Snake");
    }

    function saveSettings() {
        writeKeyValueFile(getSaveFile(), [
            "lang=" + currentLang,
            "dark=" + (darkTheme ? 1 : 0),
            "mode=" + arenaMode,
            "best=" + bestScore
        ]);
    }

    function loadSettings() {
        var map = readKeyValueFile(getSaveFile());
        if (!map) return;
        if (map.lang && I18N[map.lang]) currentLang = map.lang;
        if (map.dark !== undefined) darkTheme = (map.dark === "1");
        if (map.mode !== undefined) arenaMode = parseInt(map.mode, 10) || 0;
        if (map.best) bestScore = parseInt(map.best, 10) || 0;
    }

    // ==================== SNAKE LOGIC ====================

    function getModeName() {
        var keys = ["modeWalls", "modePortal", "modeMaze"];
        return tr(keys[arenaMode % 3]);
    }

    function buildWalls() {
        walls = [];
        if (arenaMode === 2) {
            // Symmetric Labyrinth Obstacles
            var coords = [
                [4, 4], [5, 4], [6, 4], [4, 5], [4, 6],
                [13, 4], [12, 4], [11, 4], [13, 5], [13, 6],
                [4, 13], [5, 13], [6, 13], [4, 12], [4, 11],
                [13, 13], [12, 13], [11, 13], [13, 12], [13, 11]
            ];
            for (var i = 0; i < coords.length; i++) {
                walls.push({ x: coords[i][0], y: coords[i][1] });
            }
        }
    }

    function isCellWall(x, y) {
        for (var i = 0; i < walls.length; i++) {
            if (walls[i].x === x && walls[i].y === y) return true;
        }
        return false;
    }

    function isCellSnake(x, y, ignoreTail) {
        var limit = ignoreTail ? snake.length - 1 : snake.length;
        for (var i = 0; i < limit; i++) {
            if (snake[i].x === x && snake[i].y === y) return true;
        }
        return false;
    }

    function findFreeCell() {
        var free = [];
        for (var y = 0; y < GRID; y++) {
            for (var x = 0; x < GRID; x++) {
                if (!isCellWall(x, y) && !isCellSnake(x, y, false)) {
                    if (!bonus || bonus.x !== x || bonus.y !== y) {
                        if (!apple || apple.x !== x || apple.y !== y) {
                            free.push({ x: x, y: y });
                        }
                    }
                }
            }
        }
        if (free.length === 0) return { x: 0, y: 0 };
        return free[Math.floor(Math.random() * free.length)];
    }

    function spawnSparksAtCell(gx, gy, rgbColor) {
        var cx = PAD + gx * STEP + CELL / 2;
        var cy = PLAY_Y + PAD + gy * STEP + CELL / 2;
        for (var i = 0; i < 6; i++) {
            var ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
            var spd = 2.2 + Math.random() * 2.5;
            sparks.push({
                x: cx,
                y: cy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                color: rgbColor,
                life: 7
            });
        }
    }

    function startNewGame() {
        buildWalls();
        snake = [
            { x: 6, y: 9 },
            { x: 5, y: 9 },
            { x: 4, y: 9 },
            { x: 3, y: 9 }
        ];
        curDir = { dx: 1, dy: 0 };
        dirQueue = [];
        score = 0;
        applesEaten = 0;
        bonus = null;
        sparks = [];
        gameOver = false;
        paused = true;
        apple = { x: 12, y: 9 };
        if (isCellWall(apple.x, apple.y)) apple = findFreeCell();
        lastStepTime = new Date().getTime();
        setStatus("statusReady");
        saveSettings();
    }

    function getStepIntervalMs() {
        // Starts at 135ms and speeds up to 75ms as snake grows
        return Math.max(75, 138 - Math.floor(applesEaten * 1.6));
    }

    function queueDirection(dx, dy) {
        if (gameOver) {
            startNewGame();
            paused = false;
            setStatus("statusPlaying");
            return;
        }
        if (paused) {
            paused = false;
            setStatus("statusPlaying");
        }
        var lastDir = dirQueue.length > 0 ? dirQueue[dirQueue.length - 1] : curDir;
        // Prevent 180-degree self-reversal or duplicate direction
        if (lastDir.dx + dx === 0 && lastDir.dy + dy === 0) return;
        if (lastDir.dx === dx && lastDir.dy === dy) return;
        if (dirQueue.length < 2) {
            dirQueue.push({ dx: dx, dy: dy });
        }
    }

    function stepSnakeOnce() {
        // Update sparks even if paused
        var sparksMoved = false;
        for (var si = sparks.length - 1; si >= 0; si--) {
            sparksMoved = true;
            sparks[si].x += sparks[si].vx;
            sparks[si].y += sparks[si].vy;
            sparks[si].life--;
            if (sparks[si].life <= 0) sparks.splice(si, 1);
        }

        if (gameOver || paused) return sparksMoved;

        if (dirQueue.length > 0) {
            curDir = dirQueue.shift();
        }

        var head = snake[0];
        var nx = head.x + curDir.dx;
        var ny = head.y + curDir.dy;

        // Check Arena Walls vs Portal Wrap
        if (arenaMode === 0) {
            if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
                gameOver = true;
                setStatus("statusGameOver", [score, snake.length]);
                saveSettings();
                return true;
            }
        } else {
            if (nx < 0) nx = GRID - 1;
            else if (nx >= GRID) nx = 0;
            if (ny < 0) ny = GRID - 1;
            else if (ny >= GRID) ny = 0;
        }

        var eatingApple = (nx === apple.x && ny === apple.y);
        var eatingBonus = (bonus !== null && nx === bonus.x && ny === bonus.y);

        // Collision with obstacle wall or snake body
        if (isCellWall(nx, ny) || isCellSnake(nx, ny, !eatingApple && !eatingBonus)) {
            gameOver = true;
            setStatus("statusGameOver", [score, snake.length]);
            saveSettings();
            return true;
        }

        // Advance snake head
        snake.unshift({ x: nx, y: ny });

        if (eatingApple) {
            score += 10;
            applesEaten++;
            if (score > bestScore) bestScore = score;
            spawnSparksAtCell(nx, ny, PALETTE.appleRgb);
            apple = findFreeCell();

            // Every 5 apples, spawn a timed Golden Bonus fruit
            if (applesEaten % 5 === 0 && bonus === null) {
                var bf = findFreeCell();
                bonus = { x: bf.x, y: bf.y, ticksLeft: 38, maxTicks: 38 };
            }
            saveSettings();
        } else if (eatingBonus) {
            score += 50;
            if (score > bestScore) bestScore = score;
            spawnSparksAtCell(nx, ny, PALETTE.goldRgb);
            bonus = null;
            setStatus("statusBonus");
            saveSettings();
        } else {
            snake.pop();
        }

        // Tick bonus timer
        if (bonus !== null) {
            bonus.ticksLeft--;
            if (bonus.ticksLeft <= 0) {
                bonus = null;
            }
        }

        return true;
    }

    // ==================== VECTOR GRAPHICS ENGINE ====================

    function lerpRgb(c1, c2, t) {
        return [
            Math.round(c1[0] + (c2[0] - c1[0]) * t),
            Math.round(c1[1] + (c2[1] - c1[1]) * t),
            Math.round(c1[2] + (c2[2] - c1[2]) * t)
        ];
    }

    function fillCircle(g, cx, cy, r, brush) {
        g.newPath();
        g.ellipsePath(cx - r, cy - r, r * 2, r * 2);
        g.fillPath(brush);
    }

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

        if (ch === "0" || ch === "O") {
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
        } else if (ch === "6" || ch === "G") {
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
        } else if (ch === "E") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, top, right, top, t, brush);
            fillCapsule(g, left, midY, right - rx * 0.3, midY, t, brush);
            fillCapsule(g, left, bot, right, bot, t, brush);
        } else if (ch === "T") {
            fillCapsule(g, left, top, right, top, t, brush);
            fillCapsule(g, cx, top, cx, bot, t, brush);
        } else if (ch === "L") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, bot, right, bot, t, brush);
        } else if (ch === "N") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, top, right, bot, t, brush);
            fillCapsule(g, right, top, right, bot, t, brush);
        } else if (ch === "P") {
            var rTopP = (midY - top) / 2;
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, top, cx, top, t, brush);
            fillCapsule(g, left, midY, cx, midY, t, brush);
            fillArcBand(g, cx, top + rTopP, rTopP, t, 270, 450, brush);
        } else if (ch === "A") {
            fillCapsule(g, cx, top, left, bot, t, brush);
            fillCapsule(g, cx, top, right, bot, t, brush);
            fillCapsule(g, left + rx * 0.3, midY + h * 0.1, right - rx * 0.3, midY + h * 0.1, t, brush);
        } else if (ch === "U") {
            fillCapsule(g, left, top, left, bot - rx, t, brush);
            fillCapsule(g, right, top, right, bot - rx, t, brush);
            fillArcBand(g, cx, bot - rx, rx, t, 0, 180, brush);
        } else if (ch === "V") {
            fillCapsule(g, left, top, cx, bot, t, brush);
            fillCapsule(g, right, top, cx, bot, t, brush);
        }
    }

    // ==================== GAME SCENE RENDERING ====================

    function drawSnakeScene(g) {
        var cardRgb = darkTheme ? PALETTE.hudCardDark : PALETTE.hudCardLight;
        var lipRgb = darkTheme ? PALETTE.hudLipDark : PALETTE.hudLipLight;
        var labelRgb = darkTheme ? [168, 190, 174] : [80, 92, 82];
        var frameRgb = darkTheme ? PALETTE.frameDark : PALETTE.frameLight;
        var boardRgb = darkTheme ? PALETTE.boardBgDark : PALETTE.boardBgLight;
        var cellAltRgb = darkTheme ? PALETTE.cellAltDark : PALETTE.cellAltLight;

        var cardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cardRgb, 1));
        var lipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(lipRgb, 1));
        var frameBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(frameRgb, 1));
        var boardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(boardRgb, 1));
        var cellAltBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cellAltRgb, 1));
        var hiBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 0.26]);

        // --- 1. Top HUD Cards (y = 0..48) ---
        // Card 1: SCORE (x=0, w=122)
        fillRoundRect(g, 0, 3, 122, 45, 7, lipBrush);
        fillRoundRect(g, 0, 0, 122, 45, 7, cardBrush);
        drawVectorString(g, "SCORE", 61, 11, 8, labelRgb, 1);
        drawVectorString(g, score, 61, 29, 15, [255, 255, 255], 1);

        // Card 2: BEST (x=129, w=122)
        fillRoundRect(g, 129, 3, 122, 45, 7, lipBrush);
        fillRoundRect(g, 129, 0, 122, 45, 7, cardBrush);
        drawVectorString(g, "BEST", 190, 11, 8, labelRgb, 1);
        drawVectorString(g, bestScore, 190, 29, 15, PALETTE.goldRgb, 1);

        // Card 3: LENGTH (x=258, w=113)
        fillRoundRect(g, 258, 3, 113, 45, 7, lipBrush);
        fillRoundRect(g, 258, 0, 113, 45, 7, cardBrush);
        drawVectorString(g, "LEN", 314, 11, 8, labelRgb, 1);
        drawVectorString(g, snake.length, 314, 29, 15, PALETTE.headRgb, 1);

        // --- 2. Main Board Container & Subtle Checkerboard Grid ---
        fillRoundRect(g, 0, PLAY_Y, BOARD_SIZE, BOARD_SIZE, 9, frameBrush);
        fillRoundRect(g, 4, PLAY_Y + 4, BOARD_SIZE - 8, BOARD_SIZE - 8, 6, boardBrush);

        for (var r = 0; r < GRID; r++) {
            for (var c = 0; c < GRID; c++) {
                if ((r + c) % 2 === 1) {
                    var cx = PAD + c * STEP;
                    var cy = PLAY_Y + PAD + r * STEP;
                    fillRoundRect(g, cx, cy, CELL, CELL, 2.5, cellAltBrush);
                }
            }
        }

        // --- 3. Obstacle Walls (in Labyrinth Mode) ---
        if (walls.length > 0) {
            var wBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.wallBrick, 1));
            var wLip = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.wallLip, 1));
            for (var wi = 0; wi < walls.length; wi++) {
                var wx = PAD + walls[wi].x * STEP;
                var wy = PLAY_Y + PAD + walls[wi].y * STEP;
                fillRoundRect(g, wx, wy, CELL, CELL, 3.5, wLip);
                fillRoundRect(g, wx, wy, CELL, CELL - 2.5, 3.5, wBrush);
            }
        }

        // --- 4. Red Apple ---
        var ax = PAD + apple.x * STEP;
        var ay = PLAY_Y + PAD + apple.y * STEP;
        var apLip = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.appleLip, 1));
        var apBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.appleRgb, 1));
        var leafBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.leafRgb, 1));

        fillCircle(g, ax + CELL / 2, ay + CELL / 2 + 1.5, CELL * 0.44, apLip);
        fillCircle(g, ax + CELL / 2, ay + CELL / 2, CELL * 0.44, apBrush);
        fillCircle(g, ax + CELL / 2 - 2.5, ay + CELL / 2 - 2.5, 2.2, hiBrush);
        fillRoundRect(g, ax + CELL / 2, ay + 1, 5, 3.5, 1.5, leafBrush);

        // --- 5. Timed Golden Bonus Fruit ---
        if (bonus !== null) {
            var bx = PAD + bonus.x * STEP;
            var by = PLAY_Y + PAD + bonus.y * STEP;
            var gLip = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.goldLip, 1));
            var gBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.goldRgb, 1));
            fillRoundRect(g, bx + 1, by + 1, CELL - 2, CELL - 2, 5, gLip);
            fillRoundRect(g, bx + 1, by + 1, CELL - 2, CELL - 4, 5, gBrush);
            fillCircle(g, bx + CELL / 2 - 2, by + CELL / 2 - 2, 2.5, hiBrush);
        }

        // --- 6. Gradient Snake Body (drawn from Tail to Head) ---
        for (var i = snake.length - 1; i >= 0; i--) {
            var seg = snake[i];
            var tRatio = snake.length > 1 ? (i / (snake.length - 1)) : 0;
            var segRgb = lerpRgb(PALETTE.headRgb, PALETTE.tailRgb, tRatio);
            var segLipRgb = [
                Math.max(0, segRgb[0] - 42),
                Math.max(0, segRgb[1] - 42),
                Math.max(0, segRgb[2] - 42)
            ];
            var sx = PAD + seg.x * STEP;
            var sy = PLAY_Y + PAD + seg.y * STEP;
            var rad = (i === 0) ? 6 : (i === snake.length - 1 ? 5.5 : 4);

            var sLip = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(segLipRgb, 1));
            var sFace = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(segRgb, 1));

            fillRoundRect(g, sx, sy, CELL, CELL, rad, sLip);
            fillRoundRect(g, sx, sy, CELL, CELL - 2.5, rad, sFace);

            if (i === 0) {
                // Draw directional eyes on the Snake Head
                var eyeWhite = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
                var eyePupil = g.newBrush(g.BrushType.SOLID_COLOR, [0.1, 0.12, 0.1, 1]);
                var cxHead = sx + CELL / 2;
                var cyHead = sy + (CELL - 2) / 2;
                var ex1, ey1, ex2, ey2;

                if (curDir.dx !== 0) {
                    ex1 = cxHead + curDir.dx * 3.5;
                    ex2 = ex1;
                    ey1 = cyHead - 4;
                    ey2 = cyHead + 4;
                } else {
                    ey1 = cyHead + curDir.dy * 3.5;
                    ey2 = ey1;
                    ex1 = cxHead - 4;
                    ex2 = cxHead + 4;
                }
                fillCircle(g, ex1, ey1, 2.6, eyeWhite);
                fillCircle(g, ex2, ey2, 2.6, eyeWhite);
                fillCircle(g, ex1 + curDir.dx * 0.8, ey1 + curDir.dy * 0.8, 1.3, eyePupil);
                fillCircle(g, ex2 + curDir.dx * 0.8, ey2 + curDir.dy * 0.8, 1.3, eyePupil);
            } else {
                fillRoundRect(g, sx + 3, sy + 1.5, CELL - 6, 2, 1, hiBrush);
            }
        }

        // --- 7. Sparks ---
        for (var si = 0; si < sparks.length; si++) {
            var sp = sparks[si];
            var spBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(sp.color, sp.life / 7));
            fillCircle(g, sp.x, sp.y, 2.2, spBrush);
        }

        // --- 8. Pause / Game Over Overlay ---
        if (gameOver || (paused && score > 0)) {
            var ovBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.07, 0.09, 0.08, 0.82]);
            fillRoundRect(g, 4, PLAY_Y + 4, BOARD_SIZE - 8, BOARD_SIZE - 8, 6, ovBrush);

            var cardX = 56;
            var cardY = PLAY_Y + BOARD_SIZE / 2 - 52;
            fillRoundRect(g, cardX, cardY, BOARD_SIZE - 112, 104, 8, cardBrush);
            if (gameOver) {
                drawVectorString(g, "OVER", BOARD_SIZE / 2, cardY + 34, 22, PALETTE.appleRgb, 1);
                drawVectorString(g, score, BOARD_SIZE / 2, cardY + 74, 18, [255, 255, 255], 1);
            } else {
                drawVectorString(g, "PAUSE", BOARD_SIZE / 2, cardY + 52, 22, PALETTE.goldRgb, 1);
            }
        }
    }

    // ==================== VECTOR EXPORT TO ARTBOARD ====================

    function exportSnakeToArtboard() {
        try {
            var doc;
            if (app.documents.length === 0) {
                doc = app.documents.add(DocumentColorSpace.RGB, 500, 560);
            } else {
                doc = app.activeDocument;
            }

            var abIndex = doc.artboards.getActiveArtboardIndex();
            var abRect = doc.artboards[abIndex].artboardRect;
            var abCenterX = (abRect[0] + abRect[2]) / 2;
            var abCenterY = (abRect[1] + abRect[3]) / 2;

            var layerName = "Snake_Vector_Board";
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
            grp.name = "Snake_Score_" + score;

            var startLeft = abCenterX - BOARD_SIZE / 2;
            var startTop = abCenterY + BOARD_SIZE / 2;

            var bgRect = grp.pathItems.roundedRectangle(startTop, startLeft, BOARD_SIZE, BOARD_SIZE, 9, 9);
            bgRect.stroked = false;
            bgRect.filled = true;
            bgRect.fillColor = makeRGBColor(PALETTE.boardBgDark);

            var headerTf = grp.textFrames.add();
            headerTf.contents = "SNAKE  |  SCORE: " + score + "  |  BEST: " + bestScore + "  |  LENGTH: " + snake.length;
            headerTf.textRange.characterAttributes.size = 12;
            headerTf.textRange.characterAttributes.fillColor = makeRGBColor([85, 100, 90]);
            headerTf.position = [startLeft, startTop + 20];

            // Walls
            for (var wi = 0; wi < walls.length; wi++) {
                var wx = startLeft + PAD + walls[wi].x * STEP;
                var wy = startTop - PAD - walls[wi].y * STEP;
                var wRect = grp.pathItems.roundedRectangle(wy, wx, CELL, CELL, 3, 3);
                wRect.stroked = false;
                wRect.filled = true;
                wRect.fillColor = makeRGBColor(PALETTE.wallBrick);
            }

            // Apple
            var apX = startLeft + PAD + apple.x * STEP + 1;
            var apY = startTop - PAD - apple.y * STEP - 1;
            var apItem = grp.pathItems.ellipse(apY, apX, CELL - 2, CELL - 2);
            apItem.stroked = false;
            apItem.filled = true;
            apItem.fillColor = makeRGBColor(PALETTE.appleRgb);

            // Snake segments
            for (var i = snake.length - 1; i >= 0; i--) {
                var seg = snake[i];
                var tRatio = snake.length > 1 ? (i / (snake.length - 1)) : 0;
                var segRgb = lerpRgb(PALETTE.headRgb, PALETTE.tailRgb, tRatio);
                var sx = startLeft + PAD + seg.x * STEP;
                var sy = startTop - PAD - seg.y * STEP;
                var sRect = grp.pathItems.roundedRectangle(sy, sx, CELL, CELL, 4, 4);
                sRect.stroked = false;
                sRect.filled = true;
                sRect.fillColor = makeRGBColor(segRgb);
            }

            app.redraw();
            setStatus("exportOk", [layerName]);
            return true;
        } catch (err) {
            setStatus("exportErr", [err.message]);
            return false;
        }
    }

    // ==================== BACKGROUND HEARTBEAT & WINDOW ====================

    var WIN_TITLE = "SNAKE - Adobe Illustrator Edition";
    var HB = { title: WIN_TITLE, token: "Snake", tickMs: 35 };

    loadSettings();
    startNewGame();

    var win = new Window("dialog", WIN_TITLE);
    win.orientation = "column";
    win.alignChildren = ["center", "top"];
    win.spacing = 6;
    win.margins = 12;

    // --- 1. Top Bar (Hint + Theme + Language) ---
    var topBar = win.add("group");
    topBar.orientation = "row";
    topBar.alignChildren = ["fill", "center"];
    topBar.spacing = 6;
    topBar.preferredSize = [CANVAS_W, 24];

    var hintLbl = topBar.add("statictext", undefined, tr("controlsHint"));
    hintLbl.alignment = ["left", "center"];
    hintLbl.preferredSize = [182, 20];

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
    btnNew.preferredSize = [82, 25];
    var btnMode = actionGrp.add("button", undefined, tr("btnMode", [getModeName()]));
    btnMode.preferredSize = [104, 25];
    var btnVector = actionGrp.add("button", undefined, tr("btnVector"));
    btnVector.preferredSize = [92, 25];
    var btnClose = actionGrp.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [78, 25];

    // --- 3. Interactive Game Canvas ---
    var gameCanvas = win.add("group");
    gameCanvas.preferredSize = [CANVAS_W, CANVAS_H];
    gameCanvas.minimumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.maximumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.onDraw = function () {
        drawSnakeScene(this.graphics);
    };

    // --- 4. Bottom Arcade Control Pad ---
    var bottomBar = win.add("group");
    bottomBar.orientation = "row";
    bottomBar.alignChildren = ["fill", "center"];
    bottomBar.preferredSize = [CANVAS_W, 28];
    bottomBar.spacing = 4;

    var btnLeft = bottomBar.add("button", undefined, "◄ A");
    btnLeft.preferredSize = [56, 26];
    var btnUp = bottomBar.add("button", undefined, "▲ W");
    btnUp.preferredSize = [56, 26];
    var btnDown = bottomBar.add("button", undefined, "▼ S");
    btnDown.preferredSize = [56, 26];
    var btnRight = bottomBar.add("button", undefined, "► D");
    btnRight.preferredSize = [56, 26];
    var btnPause = bottomBar.add("button", undefined, tr("btnResume"));
    btnPause.preferredSize = [131, 26];

    // --- 5. Status Footer ---
    var statusLbl = win.add("statictext", undefined, tr(statusKey, statusArgs));
    statusLbl.preferredSize = [CANVAS_W, 20];

    // ==================== THEME & UI REFRESH ====================

    function applyThemeColors() {
        var bgRgb = darkTheme ? PALETTE.winBgDark : PALETTE.winBgLight;
        var fgRgb = darkTheme ? [225, 238, 228] : [78, 88, 80];

        var bgBrush = win.graphics.newBrush(win.graphics.BrushType.SOLID_COLOR, rgbToNorm(bgRgb, 1));
        var fgPen = win.graphics.newPen(win.graphics.PenType.SOLID_COLOR, rgbToNorm(fgRgb, 1), 1);

        win.graphics.backgroundColor = bgBrush;
        try {
            hintLbl.graphics.foregroundColor = fgPen;
            statusLbl.graphics.foregroundColor = fgPen;
        } catch (e) {}

        btnTheme.text = darkTheme ? tr("themeDark") : tr("themeLight");
    }

    function updatePauseBtnLabel() {
        btnPause.text = (paused || gameOver) ? tr("btnResume") : tr("btnPause");
    }

    function applyLocalization() {
        hintLbl.text = tr("controlsHint");
        btnNew.text = tr("btnNew");
        btnMode.text = tr("btnMode", [getModeName()]);
        btnVector.text = tr("btnVector");
        btnClose.text = tr("btnClose");
        btnTheme.text = darkTheme ? tr("themeDark") : tr("themeLight");
        updatePauseBtnLabel();
        refreshUI();
    }

    function refreshUI() {
        var pf0 = perfNow();
        statusLbl.text = tr(statusKey, statusArgs);
        updatePauseBtnLabel();
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
            btnPause.active = true;
        } catch (e) {}
    }

    function checkAutoStep() {
        var now = new Date().getTime();
        if (now - lastStepTime >= getStepIntervalMs()) {
            lastStepTime = now;
            if (stepSnakeOnce()) {
                refreshUI();
            }
        }
    }

    // ==================== EVENT HANDLERS ====================

    win.addEventListener("mousemove", checkAutoStep);
    gameCanvas.addEventListener("mousemove", checkAutoStep);

    // Click on board steers the snake toward clicked position relative to head
    gameCanvas.addEventListener("mousedown", function (ev) {
        if (ev.clientY < PLAY_Y) return;
        var head = snake[0];
        var hx = PAD + head.x * STEP + CELL / 2;
        var hy = PLAY_Y + PAD + head.y * STEP + CELL / 2;
        var dx = ev.clientX - hx;
        var dy = ev.clientY - hy;

        if (curDir.dx !== 0) {
            queueDirection(0, dy >= 0 ? 1 : -1);
        } else {
            queueDirection(dx >= 0 ? 1 : -1, 0);
        }
        lastStepTime = new Date().getTime();
        stepSnakeOnce();
        refreshUI();
        refocusControl();
    });

    btnTheme.onClick = function () {
        darkTheme = !darkTheme;
        saveSettings();
        applyThemeColors();
        refreshUI();
        refocusControl();
    };

    langDropdown.onChange = function () {
        if (langDropdown.selection !== null) {
            var idx = langDropdown.selection.index;
            if (LANG_ORDER[idx]) {
                currentLang = LANG_ORDER[idx];
                saveSettings();
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

    btnMode.onClick = function () {
        arenaMode = (arenaMode + 1) % 3;
        btnMode.text = tr("btnMode", [getModeName()]);
        startNewGame();
        refreshUI();
        refocusControl();
    };

    btnVector.onClick = function () {
        exportSnakeToArtboard();
        refreshUI();
        refocusControl();
    };

    btnClose.onClick = function () {
        heartbeatStop();
        saveSettings();
        win.close();
    };

    var lastKeyTime = 0;

    btnPause.onClick = function () {
        if (new Date().getTime() - lastKeyTime < 160) return;
        if (gameOver) {
            startNewGame();
            paused = false;
            setStatus("statusPlaying");
        } else {
            paused = !paused;
            setStatus(paused ? "statusPaused" : "statusPlaying");
        }
        lastStepTime = new Date().getTime();
        refreshUI();
        refocusControl();
    };

    btnUp.onClick = function () {
        queueDirection(0, -1);
        lastStepTime = new Date().getTime();
        stepSnakeOnce();
        refreshUI();
        refocusControl();
    };

    btnDown.onClick = function () {
        queueDirection(0, 1);
        lastStepTime = new Date().getTime();
        stepSnakeOnce();
        refreshUI();
        refocusControl();
    };

    btnLeft.onClick = function () {
        queueDirection(-1, 0);
        lastStepTime = new Date().getTime();
        stepSnakeOnce();
        refreshUI();
        refocusControl();
    };

    btnRight.onClick = function () {
        queueDirection(1, 0);
        lastStepTime = new Date().getTime();
        stepSnakeOnce();
        refreshUI();
        refocusControl();
    };

    function handleKeyEvent(ev) {
        perfKey();
        var k = ev.keyName ? String(ev.keyName).toUpperCase() : "";

        if (k === "F15") {
            ev.preventDefault();
            checkAutoStep();
            return;
        }

        var now = new Date().getTime();
        if (now - lastKeyTime < 35) return;
        lastKeyTime = now;

        if (k === "UP" || k === "W") {
            ev.preventDefault();
            queueDirection(0, -1);
            if (now - lastStepTime >= 55) {
                lastStepTime = now;
                stepSnakeOnce();
                refreshUI();
            }
        } else if (k === "DOWN" || k === "S") {
            ev.preventDefault();
            queueDirection(0, 1);
            if (now - lastStepTime >= 55) {
                lastStepTime = now;
                stepSnakeOnce();
                refreshUI();
            }
        } else if (k === "LEFT" || k === "A") {
            ev.preventDefault();
            queueDirection(-1, 0);
            if (now - lastStepTime >= 55) {
                lastStepTime = now;
                stepSnakeOnce();
                refreshUI();
            }
        } else if (k === "RIGHT" || k === "D") {
            ev.preventDefault();
            queueDirection(1, 0);
            if (now - lastStepTime >= 55) {
                lastStepTime = now;
                stepSnakeOnce();
                refreshUI();
            }
        } else if (k === "SPACE" || k === "P") {
            ev.preventDefault();
            if (gameOver) {
                startNewGame();
                paused = false;
                setStatus("statusPlaying");
            } else {
                paused = !paused;
                setStatus(paused ? "statusPaused" : "statusPlaying");
            }
            lastStepTime = now;
            refreshUI();
        } else if (k === "M") {
            ev.preventDefault();
            arenaMode = (arenaMode + 1) % 3;
            btnMode.text = tr("btnMode", [getModeName()]);
            startNewGame();
            refreshUI();
        } else if (k === "N") {
            ev.preventDefault();
            startNewGame();
            refreshUI();
        }
        refocusControl();
    }

    var focusTargets = [
        win, btnLeft, btnUp, btnDown, btnRight, btnPause,
        btnNew, btnMode, btnVector, btnTheme, btnClose, langDropdown
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
        saveSettings();
    };

    perfInit({ token: "Snake", canvases: 1, canvasW: CANVAS_W, canvasH: CANVAS_H, tickMs: HB.tickMs, theme: darkTheme ? "dark" : "light", lang: currentLang });
    applyThemeColors();
    win.center();
    win.show();
    heartbeatStop();
})();
