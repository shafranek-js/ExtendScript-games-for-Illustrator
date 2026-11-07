#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"
#include "lib/GameAnim.jsx"

/**
 * PAC-MAN — Designer Edition for Adobe Illustrator (ExtendScript / ScriptUI)
 *
 * Features:
 * - Autonomous Real-Time Game Loop via Win32Heartbeat (Pac-Man & 4 Ghosts move continuously)
 * - Classic 19x21 Neon Maze with Side Warp Tunnels, Ghost House, Dots, 4 Power Pellets & Bonus Cherries
 * - Pre-Turn Corner Buffering: queue your next turn before reaching an intersection
 * - 4 Ghosts with distinct AI personalities: Blinky (Red), Pinky (Pink), Inky (Cyan), Clyde (Orange)
 * - Frightened Blue Ghost mode (200 / 400 / 800 / 1600 cascading points)
 * - Dark & Light themes, 4 Localizations (EN, CS, RO, HI), Auto-Saved Settings, and 1-Click Vector Artboard Export
 */

(function () {
    var COLS = 19;
    var ROWS = 21;
    var CELL = 19;
    var PAD = 8;
    var BOARD_W = COLS * CELL + PAD * 2; // 377 px
    var BOARD_H = ROWS * CELL + PAD * 2; // 415 px
    var HUD_H = 48;
    var PLAY_Y = HUD_H + 6;
    var CANVAS_W = BOARD_W;
    var CANVAS_H = PLAY_Y + BOARD_H; // 469 px

    // ==================== LOCALIZATION (EN, CS, RO, HI) ====================

    var LANG_ORDER = ["en", "cs", "ro", "hi"];
    var currentLang = "en";
    var darkTheme = true;

    var I18N = {
        en: {
            langName: "English",
            btnNew: "↻ New (N)",
            btnPause: "❚❚ Pause (Space)",
            btnResume: "► Play (Space)",
            btnVector: "❖ To Artboard",
            btnClose: "Close (Esc)",
            themeDark: "◐ Dark",
            themeLight: "☀ Light",
            controlsHint: "WASD / Arrows • Space: Pause",
            statusReady: "Press any Arrow / WASD key or Space to start!",
            statusNoHeartbeat: "Timer unavailable - move the mouse to advance.",
            statusPlaying: "Stage {0} — Eat all dots! Power Pellets turn ghosts blue!",
            statusPower: "★ POWER PELLET! Eat the blue ghosts (+{0} pts)!",
            statusCherry: "★ BONUS CHERRY! +300 pts!",
            statusLifeLost: "Caught by a ghost! {0} lives left. Press Space.",
            statusStageClear: "✓ Stage {0} Cleared! Entering Stage {1}...",
            statusPaused: "Game paused. Press Space or any direction to continue.",
            statusGameOver: "Game Over! Score: {0} (Stage {1}). Press Space or 'New'.",
            exportOk: "✓ Vector Pac-Man maze created on layer '{0}'!",
            exportErr: "Export error: {0}"
        },
        cs: {
            langName: "Čeština",
            btnNew: "↻ Nová (N)",
            btnPause: "❚❚ Pauza (Space)",
            btnResume: "► Hrát (Space)",
            btnVector: "❖ Do křivek",
            btnClose: "Zavřít (Esc)",
            themeDark: "◐ Tmavý",
            themeLight: "☀ Světlý",
            controlsHint: "WASD / Šipky • Space: Pauza",
            statusReady: "Stiskněte šipku / WASD nebo Space pro start!",
            statusNoHeartbeat: "Časovač nedostupný - posun myší.",
            statusPlaying: "Úroveň {0} — Snězte všechny tečky!",
            statusPower: "★ ENERGETICKÁ KULIČKA! Duchové jsou zranitelní (+{0} b.)!",
            statusCherry: "★ BONUSOVÁ TŘEŠEŇ! +300 b.!",
            statusLifeLost: "Chytil vás duch! Zbývají {0} životy. Stiskněte Space.",
            statusStageClear: "✓ Úroveň {0} dokončena! Další úroveň {1}...",
            statusPaused: "Hra pozastavena. Stiskněte Space pro pokračování.",
            statusGameOver: "Konec hry! Skóre: {0} (Úroveň {1}). Stiskněte Space.",
            exportOk: "✓ Pac-Man vykreslen do vrstvy '{0}'!",
            exportErr: "Chyba exportu: {0}"
        },
        ro: {
            langName: "Română",
            btnNew: "↻ Nou (N)",
            btnPause: "❚❚ Pauză (Space)",
            btnResume: "► Joacă (Space)",
            btnVector: "❖ Pe Artboard",
            btnClose: "Închide (Esc)",
            themeDark: "◐ Întunecat",
            themeLight: "☀ Luminos",
            controlsHint: "WASD / Săgeți • Space: Pauză",
            statusReady: "Apăsați o săgeată / WASD sau Space pentru start!",
            statusNoHeartbeat: "Cronometru indisponibil - mișcă mouse-ul.",
            statusPlaying: "Nivelul {0} — Adună toate punctele din labirint!",
            statusPower: "★ SUPER-BILĂ! Fantomele albastre pot fi mâncate (+{0})!",
            statusCherry: "★ CIREAȘĂ BONUS! +300 pct.!",
            statusLifeLost: "Prins de o fantomă! Mai ai {0} vieți. Apasă Space.",
            statusStageClear: "✓ Nivelul {0} complet! Urmează nivelul {1}...",
            statusPaused: "Joc în pauză. Apăsați Space pentru a continua.",
            statusGameOver: "Joc încheiat! Scor: {0} (Nivel {1}). Apăsați Space.",
            exportOk: "✓ Labirintul Pac-Man desenat în stratul '{0}'!",
            exportErr: "Eroare la export: {0}"
        },
        hi: {
            langName: "हिन्दी",
            btnNew: "↻ नया (N)",
            btnPause: "❚❚ पॉज़ (Space)",
            btnResume: "► खेलें (Space)",
            btnVector: "❖ आर्टबोर्ड पर",
            btnClose: "बंद करें (Esc)",
            themeDark: "◐ डार्क",
            themeLight: "☀ लाइट",
            controlsHint: "WASD / तीर • Space: पॉज़",
            statusReady: "शुरू करने के लिए कोई भी तीर / WASD या Space दबाएँ!",
            statusNoHeartbeat: "टाइमर अनुपलब्ध - माउस हिलाएँ।",
            statusPlaying: "स्टेज {0} — सभी डॉट्स खाएँ!",
            statusPower: "★ पावर पेलेट! नीले भूतों को पकड़ें (+{0} अंक)!",
            statusCherry: "★ बोनस चेरी! +300 अंक!",
            statusLifeLost: "भूत ने पकड़ लिया! {0} जीवन शेष। Space दबाएँ।",
            statusStageClear: "✓ स्टेज {0} पूरा! अगला स्टेज {1}...",
            statusPaused: "खेल रुका हुआ है। जारी रखने के लिए Space दबाएँ।",
            statusGameOver: "खेल समाप्त! स्कोर: {0} (स्टेज {1})। Space दबाएँ।",
            exportOk: "✓ वेक्टर Pac-Man '{0}' लेयर पर बनाया गया!",
            exportErr: "निर्यात त्रुटि: {0}"
        }
    };

    function tr(key, args) {
        return translateString(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    // ==================== PALETTE ====================

    var PALETTE = {
        winBgDark: [18, 20, 32],
        winBgLight: [238, 240, 248],
        frameDark: [38, 52, 118],
        frameLight: [148, 160, 204],
        boardBgDark: [10, 12, 22],
        boardBgLight: [24, 28, 46],
        wallFaceDark: [36, 68, 210],
        wallLipDark: [20, 38, 132],
        wallFaceLight: [56, 94, 232],
        wallLipLight: [30, 54, 152],
        doorRgb: [255, 184, 222],
        hudCardDark: [30, 34, 54],
        hudCardLight: [186, 192, 212],
        hudLipDark: [18, 20, 34],
        hudLipLight: [152, 158, 180],
        pacYellow: [255, 220, 36],
        pacLip: [204, 158, 12],
        dotRgb: [255, 214, 168],
        powerRgb: [255, 240, 130],
        cherryRgb: [244, 48, 72],
        stemRgb: [92, 224, 98],
        blinkyRed: [255, 58, 76],
        pinkyPink: [255, 142, 218],
        inkyCyan: [52, 228, 255],
        clydeOrange: [255, 166, 52],
        frightBlue: [44, 92, 255],
        frightFlash: [235, 242, 255]
    };

    // ==================== CLASSIC 19x21 MAZE TEMPLATE ====================

    var MAZE_TEMPLATE = [
        "###################",
        "#o.......#.......o#",
        "#.##.###.#.###.##.#",
        "#.................#",
        "#.##.#.#####.#.##.#",
        "#....#...#...#....#",
        "####.### # ###.####",
        "   #.#       #.#   ",
        "####.# ##-## #.####",
        "    .  #   #  .    ",
        "####.# ##### #.####",
        "   #.#       #.#   ",
        "####.# ##### #.####",
        "#........#........#",
        "#.##.###.#.###.##.#",
        "#o.#..... .....#.o#",
        "##.#.#.#####.#.#.##",
        "#....#...#...#....#",
        "#.######.#.######.#",
        "#.................#",
        "###################"
    ];

    // ==================== GAME STATE ====================

    var grid = []; // 2D array [r][c]: '#' wall, '.' dot, 'o' power pellet, '-' door, ' ' empty
    var dotsRemaining = 0;
    var dotsEatenStage = 0;

    var pac = {
        x: 9,
        y: 15,
        px: 9,          // previous cell, for smooth rendering
        py: 15,
        dx: 0,
        dy: 0,
        nextDx: -1,
        nextDy: 0,
        facingDx: -1,
        facingDy: 0,
        mouthOpen: true
    };

    var ghosts = []; // Array of 4 ghost objects
    var frightenedTicks = 0;
    var ghostCombo = 0;
    var cherry = null; // { x: 9, y: 11, ticksLeft: 45 }
    var sparks = [];   // { x, y, vx, vy, color, life }

    var score = 0;
    var bestScore = 0;
    var stage = 1;
    var lives = 3;
    var paused = true;
    var gameOver = false;
    var tickCounter = 0;
    var lastStepTime = new Date().getTime();

    var statusKey = "statusReady";
    var statusArgs = [];

    function setStatus(key, args) {
        statusKey = key;
        statusArgs = args || [];
    }

    // ==================== PERSISTENCE ====================

    function getSaveFile() {
        return getGameSaveFile("PacMan");
    }

    function saveSettings() {
        writeKeyValueFile(getSaveFile(), [
            "lang=" + currentLang,
            "dark=" + (darkTheme ? 1 : 0),
            "best=" + bestScore
        ]);
    }

    function loadSettings() {
        var map = readKeyValueFile(getSaveFile());
        if (!map) return;
        if (map.lang && I18N[map.lang]) currentLang = map.lang;
        if (map.dark !== undefined) darkTheme = (map.dark === "1");
        if (map.best) bestScore = parseInt(map.best, 10) || 0;
    }

    // ==================== MAZE & ENTITY INITIALIZATION ====================

    function resetPositions() {
        pac.x = 9;
        pac.y = 15;
        pac.dx = -1;
        pac.dy = 0;
        pac.nextDx = -1;
        pac.nextDy = 0;
        pac.facingDx = -1;
        pac.facingDy = 0;
        pac.mouthOpen = true;

        frightenedTicks = 0;
        ghostCombo = 0;
        cherry = null;

        ghosts = [
            { name: "Blinky", color: PALETTE.blinkyRed, x: 9,  y: 7, dx: -1, dy: 0, inHouse: false, releaseDelay: 0,  scatterX: 17, scatterY: 0 },
            { name: "Pinky",  color: PALETTE.pinkyPink, x: 9,  y: 9, dx: 0,  dy: -1, inHouse: true,  releaseDelay: 4,  scatterX: 1,  scatterY: 0 },
            { name: "Inky",   color: PALETTE.inkyCyan,  x: 8,  y: 9, dx: 0,  dy: -1, inHouse: true,  releaseDelay: 12, scatterX: 17, scatterY: 20 },
            { name: "Clyde",  color: PALETTE.clydeOrange, x: 10, y: 9, dx: 0, dy: -1, inHouse: true, releaseDelay: 20, scatterX: 1,  scatterY: 20 }
        ];

        // Interpolation state: previous cells for the smooth renderer.
        pac.px = pac.x;
        pac.py = pac.y;
        for (var rg = 0; rg < ghosts.length; rg++) {
            ghosts[rg].px = ghosts[rg].x;
            ghosts[rg].py = ghosts[rg].y;
        }
        animBegin(getStepIntervalMs());
    }

    function loadMazeStage() {
        grid = [];
        dotsRemaining = 0;
        dotsEatenStage = 0;
        for (var r = 0; r < ROWS; r++) {
            var rowArr = [];
            var line = MAZE_TEMPLATE[r];
            for (var c = 0; c < COLS; c++) {
                var ch = line.charAt(c);
                rowArr.push(ch);
                if (ch === "." || ch === "o") {
                    dotsRemaining++;
                }
            }
            grid.push(rowArr);
        }
        resetPositions();
    }

    function startNewGame() {
        score = 0;
        stage = 1;
        lives = 3;
        gameOver = false;
        paused = true;
        tickCounter = 0;
        sparks = [];
        loadMazeStage();
        setStatus("statusReady");
        saveSettings();
    }

    function getStepIntervalMs() {
        return Math.max(95, 145 - (stage - 1) * 8);
    }

    function wrapX(x) {
        if (x < 0) return COLS - 1;
        if (x >= COLS) return 0;
        return x;
    }

    function canPacMove(nx, ny) {
        if (ny < 0 || ny >= ROWS) return false;
        var wx = wrapX(nx);
        var tile = grid[ny][wx];
        return tile !== "#" && tile !== "-";
    }

    function canGhostMove(nx, ny, allowDoor) {
        if (ny < 0 || ny >= ROWS) return false;
        var wx = wrapX(nx);
        var tile = grid[ny][wx];
        if (tile === "#") return false;
        if (tile === "-" && !allowDoor) return false;
        return true;
    }

    function spawnSparksAtCell(gx, gy, rgbColor) {
        var cx = PAD + gx * CELL + CELL / 2;
        var cy = PLAY_Y + PAD + gy * CELL + CELL / 2;
        for (var i = 0; i < 6; i++) {
            var ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
            var spd = 2.0 + Math.random() * 2.5;
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

    function setPacDirection(dx, dy) {
        if (gameOver) {
            startNewGame();
            paused = false;
            setStatus("statusPlaying", [stage]);
            return;
        }
        if (paused) {
            paused = false;
            setStatus("statusPlaying", [stage]);
        }
        pac.nextDx = dx;
        pac.nextDy = dy;
        // Immediate reversal allowed anytime
        if (pac.dx + dx === 0 && pac.dy + dy === 0 && canPacMove(pac.x + dx, pac.y + dy)) {
            pac.dx = dx;
            pac.dy = dy;
            pac.facingDx = dx;
            pac.facingDy = dy;
        }
    }

    // ==================== GHOST AI & GAME STEP ====================

    function moveSingleGhost(g, idx) {
        if (g.releaseDelay > 0) {
            g.releaseDelay--;
            return;
        }

        // If inside Ghost House, navigate straight out through door (9, 8) -> (9, 7)
        if (g.inHouse) {
            if (g.x < 9) {
                g.x++;
                g.dx = 1; g.dy = 0;
            } else if (g.x > 9) {
                g.x--;
                g.dx = -1; g.dy = 0;
            } else if (g.y > 7) {
                g.y--;
                g.dx = 0; g.dy = -1;
            }
            if (g.x === 9 && g.y === 7) {
                g.inHouse = false;
                g.dx = (idx % 2 === 0) ? -1 : 1;
                g.dy = 0;
            }
            return;
        }

        var dirs = [
            { dx: 0, dy: -1 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 1, dy: 0 }
        ];

        var valid = [];
        for (var i = 0; i < dirs.length; i++) {
            var d = dirs[i];
            // Ghosts don't reverse 180 degrees unless stuck
            if (d.dx === -g.dx && d.dy === -g.dy) continue;
            var nx = wrapX(g.x + d.dx);
            var ny = g.y + d.dy;
            if (canGhostMove(nx, ny, false)) {
                valid.push(d);
            }
        }

        if (valid.length === 0) {
            // Dead end fallback: reverse
            if (canGhostMove(wrapX(g.x - g.dx), g.y - g.dy, false)) {
                valid.push({ dx: -g.dx, dy: -g.dy });
            } else {
                return;
            }
        }

        var chosen = valid[0];

        if (frightenedTicks > 0) {
            // Frightened ghosts pick a random valid turn or flee Pac-Man
            chosen = valid[Math.floor(Math.random() * valid.length)];
        } else {
            // Target tile based on ghost personality
            var tx = pac.x;
            var ty = pac.y;

            if (idx === 1) {
                // Pinky targets 4 tiles ahead of Pac-Man
                tx = pac.x + pac.facingDx * 4;
                ty = pac.y + pac.facingDy * 4;
            } else if (idx === 2) {
                // Inky flanks relative to Pac-Man
                tx = pac.x + pac.facingDx * 2 + (pac.x - ghosts[0].x);
                ty = pac.y + pac.facingDy * 2 + (pac.y - ghosts[0].y);
            } else if (idx === 3) {
                // Clyde chases when far, scatters to bottom-left corner when close
                var distSq = (g.x - pac.x) * (g.x - pac.x) + (g.y - pac.y) * (g.y - pac.y);
                if (distSq < 36) {
                    tx = g.scatterX;
                    ty = g.scatterY;
                }
            }

            var bestDist = 999999;
            for (var vi = 0; vi < valid.length; vi++) {
                var vd = valid[vi];
                var vx = wrapX(g.x + vd.dx);
                var vy = g.y + vd.dy;
                var d2 = (vx - tx) * (vx - tx) + (vy - ty) * (vy - ty);
                if (d2 < bestDist) {
                    bestDist = d2;
                    chosen = vd;
                }
            }
        }

        g.dx = chosen.dx;
        g.dy = chosen.dy;
        g.x = wrapX(g.x + g.dx);
        g.y = g.y + g.dy;
    }

    function checkPacGhostCollisions() {
        for (var i = 0; i < ghosts.length; i++) {
            var g = ghosts[i];
            if (g.x === pac.x && g.y === pac.y) {
                if (frightenedTicks > 0 && !g.inHouse) {
                    ghostCombo++;
                    var bonusPts = 200 * Math.pow(2, Math.min(3, ghostCombo - 1));
                    score += bonusPts;
                    if (score > bestScore) bestScore = score;
                    spawnSparksAtCell(g.x, g.y, PALETTE.inkyCyan);
                    setStatus("statusPower", [bonusPts]);
                    // Send eaten ghost back to Ghost House
                    g.x = 9;
                    g.y = 9;
                    g.inHouse = true;
                    g.releaseDelay = 6;
                    saveSettings();
                } else if (!g.inHouse) {
                    // Pac-Man caught!
                    lives--;
                    spawnSparksAtCell(pac.x, pac.y, PALETTE.pacYellow);
                    if (lives <= 0) {
                        gameOver = true;
                        setStatus("statusGameOver", [score, stage]);
                        saveSettings();
                    } else {
                        paused = true;
                        resetPositions();
                        setStatus("statusLifeLost", [lives]);
                    }
                    return true;
                }
            }
        }
        return false;
    }

    function stepPacManGame() {
        var sparksMoved = false;
        for (var si = sparks.length - 1; si >= 0; si--) {
            sparksMoved = true;
            sparks[si].x += sparks[si].vx;
            sparks[si].y += sparks[si].vy;
            sparks[si].life--;
            if (sparks[si].life <= 0) sparks.splice(si, 1);
        }

        if (paused || gameOver) return sparksMoved;

        tickCounter++;

        // Remember where everything was, so the renderer can interpolate.
        pac.px = pac.x;
        pac.py = pac.y;
        for (var gp = 0; gp < ghosts.length; gp++) {
            ghosts[gp].px = ghosts[gp].x;
            ghosts[gp].py = ghosts[gp].y;
        }
        animBegin(getStepIntervalMs());

        // 1. Try queued pre-turn first
        if (canPacMove(pac.x + pac.nextDx, pac.y + pac.nextDy)) {
            pac.dx = pac.nextDx;
            pac.dy = pac.nextDy;
        }

        // 2. Move Pac-Man if corridor ahead is open
        if ((pac.dx !== 0 || pac.dy !== 0) && canPacMove(pac.x + pac.dx, pac.y + pac.dy)) {
            pac.x = wrapX(pac.x + pac.dx);
            pac.y = pac.y + pac.dy;
            pac.facingDx = pac.dx;
            pac.facingDy = pac.dy;
            pac.mouthOpen = !pac.mouthOpen;
        } else {
            pac.mouthOpen = true;
        }

        // 3. Eat Dot / Power Pellet
        var tile = grid[pac.y][pac.x];
        if (tile === ".") {
            grid[pac.y][pac.x] = " ";
            score += 10;
            dotsRemaining--;
            dotsEatenStage++;
            if (score > bestScore) bestScore = score;

            if ((dotsEatenStage === 35 || dotsEatenStage === 90) && cherry === null) {
                cherry = { x: 9, y: 11, ticksLeft: 50 };
            }
            saveSettings();
        } else if (tile === "o") {
            grid[pac.y][pac.x] = " ";
            score += 50;
            dotsRemaining--;
            dotsEatenStage++;
            if (score > bestScore) bestScore = score;
            frightenedTicks = 34;
            ghostCombo = 0;
            // Reverse ghosts on Power Pellet activation
            for (var gi = 0; gi < ghosts.length; gi++) {
                ghosts[gi].dx = -ghosts[gi].dx;
                ghosts[gi].dy = -ghosts[gi].dy;
            }
            spawnSparksAtCell(pac.x, pac.y, PALETTE.powerRgb);
            setStatus("statusPower", [200]);
            saveSettings();
        }

        // 4. Eat Bonus Cherry
        if (cherry !== null) {
            if (pac.x === cherry.x && pac.y === cherry.y) {
                score += 300;
                if (score > bestScore) bestScore = score;
                spawnSparksAtCell(cherry.x, cherry.y, PALETTE.cherryRgb);
                cherry = null;
                setStatus("statusCherry");
                saveSettings();
            } else {
                cherry.ticksLeft--;
                if (cherry.ticksLeft <= 0) cherry = null;
            }
        }

        // 5. Check Stage Clear
        if (dotsRemaining <= 0) {
            var prevStg = stage;
            stage++;
            loadMazeStage();
            paused = true;
            setStatus("statusStageClear", [prevStg, stage]);
            saveSettings();
            return true;
        }

        // 6. Check collision right after Pac-Man steps
        if (checkPacGhostCollisions()) return true;

        // 7. Move Ghosts (slow down slightly when frightened)
        var skipFrightMove = (frightenedTicks > 0 && (tickCounter % 3 === 0));
        if (!skipFrightMove) {
            for (var i = 0; i < ghosts.length; i++) {
                moveSingleGhost(ghosts[i], i);
            }
        }

        if (frightenedTicks > 0) {
            frightenedTicks--;
            if (frightenedTicks === 0) {
                setStatus("statusPlaying", [stage]);
            }
        }

        // 8. Check collision after Ghosts step
        checkPacGhostCollisions();

        return true;
    }

    // ==================== VECTOR GRAPHICS ENGINE ====================

    function fillCircle(g, cx, cy, r, brush) {
        g.newPath();
        g.ellipsePath(cx - r, cy - r, r * 2, r * 2);
        g.fillPath(brush);
    }

    function fillPieSector(g, cx, cy, r, startDeg, endDeg, brush) {
        var a0 = (startDeg * Math.PI) / 180;
        var a1 = (endDeg * Math.PI) / 180;
        var steps = 16;
        g.newPath();
        g.moveTo(cx, cy);
        for (var i = 0; i <= steps; i++) {
            var ang = a0 + (a1 - a0) * (i / steps);
            g.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        }
        g.closePath();
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
        } else if (ch === "1" || ch === "I") {
            fillCapsule(g, cx, top, cx, bot, t, brush);
            fillCapsule(g, cx - rx * 0.55, bot, cx + rx * 0.55, bot, t, brush);
            if (ch === "1") {
                fillCapsule(g, cx, top, cx - rx * 0.55, top + rx * 0.65, t, brush);
            } else {
                fillCapsule(g, cx - rx * 0.55, top, cx + rx * 0.55, top, t, brush);
            }
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
        } else if (ch === "V") {
            fillCapsule(g, left, top, cx, bot, t, brush);
            fillCapsule(g, right, top, cx, bot, t, brush);
        } else if (ch === "A") {
            fillCapsule(g, cx, top, left, bot, t, brush);
            fillCapsule(g, cx, top, right, bot, t, brush);
            fillCapsule(g, left + rx * 0.3, midY + h * 0.1, right - rx * 0.3, midY + h * 0.1, t, brush);
        } else if (ch === "P") {
            var rTopP = (midY - top) / 2;
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, top, cx, top, t, brush);
            fillCapsule(g, left, midY, cx, midY, t, brush);
            fillArcBand(g, cx, top + rTopP, rTopP, t, 270, 450, brush);
        } else if (ch === "U") {
            fillCapsule(g, left, top, left, bot - rx, t, brush);
            fillCapsule(g, right, top, right, bot - rx, t, brush);
            fillArcBand(g, cx, bot - rx, rx, t, 0, 180, brush);
        }
    }

    // ==================== PAC-MAN & GHOST SPRITES ====================

    function drawPacManCharacter(g, cx, cy, r) {
        var pacMainB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.pacYellow, 1));
        var pacLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.pacLip, 1));

        if (!pac.mouthOpen) {
            fillCircle(g, cx, cy + 1, r, pacLipB);
            fillCircle(g, cx, cy, r, pacMainB);
            return;
        }

        var baseDeg = 0;
        if (pac.facingDx === 1) baseDeg = 0;
        else if (pac.facingDy === 1) baseDeg = 90;
        else if (pac.facingDx === -1) baseDeg = 180;
        else if (pac.facingDy === -1) baseDeg = 270;

        var mouthHalf = 38;
        fillPieSector(g, cx, cy + 1, r, baseDeg + mouthHalf, baseDeg + 360 - mouthHalf, pacLipB);
        fillPieSector(g, cx, cy, r, baseDeg + mouthHalf, baseDeg + 360 - mouthHalf, pacMainB);
    }

    function drawGhostCharacter(g, ghost) {
        var x = PAD + animLerp(ghost.px, ghost.x) * CELL + 1.5;
        var y = PLAY_Y + PAD + animLerp(ghost.py, ghost.y) * CELL + 1.5;
        var w = CELL - 3;
        var h = CELL - 3;

        var bodyRgb = ghost.color;
        var isFright = (frightenedTicks > 0 && !ghost.inHouse);
        if (isFright) {
            bodyRgb = (frightenedTicks <= 8 && (frightenedTicks % 2 === 1)) ? PALETTE.frightFlash : PALETTE.frightBlue;
        }

        var bodyBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(bodyRgb, 1));
        var r = w / 2;

        // Domed head + body + 3-scallop skirt
        fillCircle(g, x + r, y + r, r, bodyBrush);
        fillRoundRect(g, x, y + r - 1, w, h - r - 2, 1, bodyBrush);

        var footW = w / 3;
        for (var f = 0; f < 3; f++) {
            fillCircle(g, x + footW * (f + 0.5), y + h - 2.2, footW * 0.52, bodyBrush);
        }

        // Eyes
        var eyeWhite = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
        var pupilBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.1, 0.2, 0.65, 1]);

        var ex1 = x + w * 0.33 + ghost.dx * 1.2;
        var ex2 = x + w * 0.68 + ghost.dx * 1.2;
        var ey = y + h * 0.40 + ghost.dy * 1.2;

        fillCircle(g, ex1, ey, 2.7, eyeWhite);
        fillCircle(g, ex2, ey, 2.7, eyeWhite);
        fillCircle(g, ex1 + ghost.dx * 1.0, ey + ghost.dy * 1.0, 1.4, pupilBrush);
        fillCircle(g, ex2 + ghost.dx * 1.0, ey + ghost.dy * 1.0, 1.4, pupilBrush);
    }

    // ==================== FULL SCENE RENDERER ====================

    function drawPacManScene(g) {
        animProgress();
        var cardRgb = darkTheme ? PALETTE.hudCardDark : PALETTE.hudCardLight;
        var lipRgb = darkTheme ? PALETTE.hudLipDark : PALETTE.hudLipLight;
        var labelRgb = darkTheme ? [170, 180, 214] : [68, 76, 102];
        var frameRgb = darkTheme ? PALETTE.frameDark : PALETTE.frameLight;
        var boardRgb = darkTheme ? PALETTE.boardBgDark : PALETTE.boardBgLight;
        var wallFaceRgb = darkTheme ? PALETTE.wallFaceDark : PALETTE.wallFaceLight;
        var wallLipRgb = darkTheme ? PALETTE.wallLipDark : PALETTE.wallLipLight;

        var cardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cardRgb, 1));
        var lipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(lipRgb, 1));
        var frameBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(frameRgb, 1));
        var boardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(boardRgb, 1));
        var wallFaceB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(wallFaceRgb, 1));
        var wallLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(wallLipRgb, 1));
        var doorBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.doorRgb, 1));
        var dotBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.dotRgb, 1));
        var powerBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.powerRgb, 1));

        // --- 1. Top HUD Cards (y = 0..48) ---
        var cards = [
            { x: 0,   w: 98, title: "SCORE", val: score, col: [255, 255, 255] },
            { x: 103, w: 98, title: "BEST",  val: bestScore, col: PALETTE.pacYellow },
            { x: 206, w: 82, title: "STAGE", val: stage, col: PALETTE.inkyCyan },
            { x: 293, w: 84, title: "LIVES", val: lives, col: PALETTE.blinkyRed }
        ];
        for (var ci = 0; ci < cards.length; ci++) {
            var c = cards[ci];
            fillRoundRect(g, c.x, 3, c.w, 45, 7, lipBrush);
            fillRoundRect(g, c.x, 0, c.w, 45, 7, cardBrush);
            drawVectorString(g, c.title, c.x + c.w / 2, 11, 8, labelRgb, 1);
            drawVectorString(g, c.val, c.x + c.w / 2, 29, 15, c.col, 1);
        }

        // --- 2. Maze Container ---
        fillRoundRect(g, 0, PLAY_Y, BOARD_W, BOARD_H, 9, frameBrush);
        fillRoundRect(g, 4, PLAY_Y + 4, BOARD_W - 8, BOARD_H - 8, 6, boardBrush);

        // --- 3. Maze Walls, Ghost Door, Dots & Power Pellets ---
        var pulseRadius = (tickCounter % 2 === 0) ? 4.8 : 3.6;

        // Collect geometry, then fill in a few batches: the maze is ~100 walls
        // and ~240 dots, and per-cell fills cannot keep up with 30 fps.
        var wallLipRects = [];
        var wallFaceRects = [];
        var dotCircles = [];
        var powerCircles = [];

        for (var r = 0; r < ROWS; r++) {
            for (var col = 0; col < COLS; col++) {
                var ch = grid[r][col];
                var tx = PAD + col * CELL;
                var ty = PLAY_Y + PAD + r * CELL;

                if (ch === "#") {
                    wallLipRects.push([tx + 0.5, ty + 0.5, CELL - 1, CELL - 1]);
                    wallFaceRects.push([tx + 0.5, ty + 0.5, CELL - 1, CELL - 3]);
                } else if (ch === "-") {
                    fillRoundRect(g, tx, ty + CELL / 2 - 2, CELL, 4, 1.5, doorBrush);
                } else if (ch === ".") {
                    dotCircles.push([tx + CELL / 2, ty + CELL / 2, 2.2]);
                } else if (ch === "o") {
                    powerCircles.push([tx + CELL / 2, ty + CELL / 2, pulseRadius]);
                }
            }
        }

        fillBatchRects(g, wallLipRects, 3.5, wallLipB);
        fillBatchRects(g, wallFaceRects, 3.5, wallFaceB);
        fillBatchCircles(g, dotCircles, dotBrush);
        fillBatchCircles(g, powerCircles, powerBrush);

        // --- 4. Bonus Cherry ---
        if (cherry !== null) {
            var chX = PAD + cherry.x * CELL + CELL / 2;
            var chY = PLAY_Y + PAD + cherry.y * CELL + CELL / 2;
            var chBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.cherryRgb, 1));
            var stBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.stemRgb, 1));
            fillCapsule(g, chX - 3, chY + 2, chX + 2, chY - 5, 1.1, stBrush);
            fillCapsule(g, chX + 3, chY + 3, chX + 2, chY - 5, 1.1, stBrush);
            fillCircle(g, chX - 3.2, chY + 2.5, 3.6, chBrush);
            fillCircle(g, chX + 3.2, chY + 3.2, 3.6, chBrush);
        }

        // --- 5. Pac-Man ---
        var pacCx = PAD + animLerp(pac.px, pac.x) * CELL + CELL / 2;
        var pacCy = PLAY_Y + PAD + animLerp(pac.py, pac.y) * CELL + CELL / 2;
        drawPacManCharacter(g, pacCx, pacCy, CELL * 0.45);

        // --- 6. Ghosts ---
        for (var gi = 0; gi < ghosts.length; gi++) {
            drawGhostCharacter(g, ghosts[gi]);
        }

        // --- 7. Sparks ---
        for (var si = 0; si < sparks.length; si++) {
            var sp = sparks[si];
            var spBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(sp.color, sp.life / 7));
            fillCircle(g, sp.x, sp.y, 2.2, spBrush);
        }

        // --- 8. Pause / Game Over Overlay ---
        if (gameOver || (paused && score > 0)) {
            var ovBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.05, 0.06, 0.12, 0.82]);
            fillRoundRect(g, 4, PLAY_Y + 4, BOARD_W - 8, BOARD_H - 8, 6, ovBrush);

            var cardX = 58;
            var cardY = PLAY_Y + BOARD_H / 2 - 52;
            fillRoundRect(g, cardX, cardY, BOARD_W - 116, 104, 8, cardBrush);
            if (gameOver) {
                drawVectorString(g, "OVER", BOARD_W / 2, cardY + 34, 22, PALETTE.blinkyRed, 1);
                drawVectorString(g, score, BOARD_W / 2, cardY + 74, 18, [255, 255, 255], 1);
            } else {
                drawVectorString(g, "PAUSE", BOARD_W / 2, cardY + 52, 22, PALETTE.pacYellow, 1);
            }
        }
    }

    // ==================== VECTOR EXPORT TO ARTBOARD ====================

    function exportPacManToArtboard() {
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

            var layerName = "PacMan_Vector_Board";
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
            grp.name = "PacMan_Score_" + score;

            var startLeft = abCenterX - BOARD_W / 2;
            var startTop = abCenterY + BOARD_H / 2;

            var bgRect = grp.pathItems.roundedRectangle(startTop, startLeft, BOARD_W, BOARD_H, 9, 9);
            bgRect.stroked = false;
            bgRect.filled = true;
            bgRect.fillColor = makeRGBColor(PALETTE.boardBgDark);

            var headerTf = grp.textFrames.add();
            headerTf.contents = "PAC-MAN  |  SCORE: " + score + "  |  STAGE: " + stage + "  |  LIVES: " + lives;
            headerTf.textRange.characterAttributes.size = 12;
            headerTf.textRange.characterAttributes.fillColor = makeRGBColor([80, 100, 160]);
            headerTf.position = [startLeft, startTop + 20];

            // Walls & Dots
            for (var r = 0; r < ROWS; r++) {
                for (var col = 0; col < COLS; col++) {
                    var ch = grid[r][col];
                    var wx = startLeft + PAD + col * CELL;
                    var wy = startTop - PAD - r * CELL;

                    if (ch === "#") {
                        var wRect = grp.pathItems.roundedRectangle(wy, wx, CELL - 1, CELL - 1, 3, 3);
                        wRect.stroked = false;
                        wRect.filled = true;
                        wRect.fillColor = makeRGBColor(PALETTE.wallFaceDark);
                    } else if (ch === ".") {
                        var dEll = grp.pathItems.ellipse(wy - CELL / 2 + 2.2, wx + CELL / 2 - 2.2, 4.4, 4.4);
                        dEll.stroked = false;
                        dEll.filled = true;
                        dEll.fillColor = makeRGBColor(PALETTE.dotRgb);
                    } else if (ch === "o") {
                        var pEll = grp.pathItems.ellipse(wy - CELL / 2 + 4.5, wx + CELL / 2 - 4.5, 9, 9);
                        pEll.stroked = false;
                        pEll.filled = true;
                        pEll.fillColor = makeRGBColor(PALETTE.powerRgb);
                    }
                }
            }

            // Pac-Man
            var px = startLeft + PAD + pac.x * CELL + 1.5;
            var py = startTop - PAD - pac.y * CELL - 1.5;
            var pCircle = grp.pathItems.ellipse(py, px, CELL - 3, CELL - 3);
            pCircle.stroked = false;
            pCircle.filled = true;
            pCircle.fillColor = makeRGBColor(PALETTE.pacYellow);

            // Ghosts
            for (var gi = 0; gi < ghosts.length; gi++) {
                var gh = ghosts[gi];
                var gx = startLeft + PAD + gh.x * CELL + 1.5;
                var gy = startTop - PAD - gh.y * CELL - 1.5;
                var gCol = (frightenedTicks > 0 && !gh.inHouse) ? PALETTE.frightBlue : gh.color;
                var gRect = grp.pathItems.roundedRectangle(gy, gx, CELL - 3, CELL - 3, 6, 6);
                gRect.stroked = false;
                gRect.filled = true;
                gRect.fillColor = makeRGBColor(gCol);
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

    var WIN_TITLE = "PAC-MAN - Adobe Illustrator Edition";
    var HB = { title: WIN_TITLE, token: "PacMan", tickMs: 35 };

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
    hintLbl.preferredSize = [188, 20];

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
    actionGrp.spacing = 6;
    actionGrp.preferredSize = [CANVAS_W, 26];

    var btnNew = actionGrp.add("button", undefined, tr("btnNew"));
    btnNew.preferredSize = [115, 25];
    var btnVector = actionGrp.add("button", undefined, tr("btnVector"));
    btnVector.preferredSize = [135, 25];
    var btnClose = actionGrp.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [115, 25];

    // --- 3. Interactive Game Canvas ---
    var gameCanvas = win.add("group");
    gameCanvas.preferredSize = [CANVAS_W, CANVAS_H];
    gameCanvas.minimumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.maximumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.onDraw = function () {
        drawPacManScene(this.graphics);
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
    btnPause.preferredSize = [137, 26];

    // --- 5. Status Footer ---
    var statusLbl = win.add("statictext", undefined, tr(statusKey, statusArgs));
    statusLbl.preferredSize = [CANVAS_W, 20];

    // ==================== THEME & UI REFRESH ====================

    function applyThemeColors() {
        var bgRgb = darkTheme ? PALETTE.winBgDark : PALETTE.winBgLight;
        var fgRgb = darkTheme ? [225, 232, 248] : [64, 72, 96];

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
        var interval = getStepIntervalMs();
        if (now - lastStepTime >= interval) {
            lastStepTime = now;
            if (stepPacManGame()) {
                refreshUI();
                return;
            }
        }
        // Between logic steps repaint at ~30 fps; the renderer interpolates.
        if (animDue(33)) {
            refreshUI();
        }
    }

    // ==================== EVENT HANDLERS ====================

    win.addEventListener("mousemove", checkAutoStep);
    gameCanvas.addEventListener("mousemove", checkAutoStep);

    // Click on maze steers Pac-Man toward clicked quadrant relative to Pac-Man
    gameCanvas.addEventListener("mousedown", function (ev) {
        if (ev.clientY < PLAY_Y) return;
        var px = PAD + pac.x * CELL + CELL / 2;
        var py = PLAY_Y + PAD + pac.y * CELL + CELL / 2;
        var dx = ev.clientX - px;
        var dy = ev.clientY - py;

        if (Math.abs(dx) > Math.abs(dy)) {
            setPacDirection(dx >= 0 ? 1 : -1, 0);
        } else {
            setPacDirection(0, dy >= 0 ? 1 : -1);
        }
        lastStepTime = new Date().getTime();
        stepPacManGame();
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

    btnVector.onClick = function () {
        exportPacManToArtboard();
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
            setStatus("statusPlaying", [stage]);
        } else {
            paused = !paused;
            setStatus(paused ? "statusPaused" : "statusPlaying", [stage]);
        }
        lastStepTime = new Date().getTime();
        refreshUI();
        refocusControl();
    };

    btnUp.onClick = function () {
        setPacDirection(0, -1);
        lastStepTime = new Date().getTime();
        stepPacManGame();
        refreshUI();
        refocusControl();
    };

    btnDown.onClick = function () {
        setPacDirection(0, 1);
        lastStepTime = new Date().getTime();
        stepPacManGame();
        refreshUI();
        refocusControl();
    };

    btnLeft.onClick = function () {
        setPacDirection(-1, 0);
        lastStepTime = new Date().getTime();
        stepPacManGame();
        refreshUI();
        refocusControl();
    };

    btnRight.onClick = function () {
        setPacDirection(1, 0);
        lastStepTime = new Date().getTime();
        stepPacManGame();
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
            setPacDirection(0, -1);
            if (now - lastStepTime >= 60) {
                lastStepTime = now;
                stepPacManGame();
                refreshUI();
            }
        } else if (k === "DOWN" || k === "S") {
            ev.preventDefault();
            setPacDirection(0, 1);
            if (now - lastStepTime >= 60) {
                lastStepTime = now;
                stepPacManGame();
                refreshUI();
            }
        } else if (k === "LEFT" || k === "A") {
            ev.preventDefault();
            setPacDirection(-1, 0);
            if (now - lastStepTime >= 60) {
                lastStepTime = now;
                stepPacManGame();
                refreshUI();
            }
        } else if (k === "RIGHT" || k === "D") {
            ev.preventDefault();
            setPacDirection(1, 0);
            if (now - lastStepTime >= 60) {
                lastStepTime = now;
                stepPacManGame();
                refreshUI();
            }
        } else if (k === "SPACE" || k === "P") {
            ev.preventDefault();
            if (gameOver) {
                startNewGame();
                paused = false;
                setStatus("statusPlaying", [stage]);
            } else {
                paused = !paused;
                setStatus(paused ? "statusPaused" : "statusPlaying", [stage]);
            }
            lastStepTime = now;
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
        btnNew, btnVector, btnTheme, btnClose, langDropdown
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

    perfInit({ token: "PacMan", canvases: 1, canvasW: CANVAS_W, canvasH: CANVAS_H, tickMs: HB.tickMs, theme: darkTheme ? "dark" : "light", lang: currentLang });
    applyThemeColors();
    win.center();
    win.show();
    heartbeatStop();
})();
