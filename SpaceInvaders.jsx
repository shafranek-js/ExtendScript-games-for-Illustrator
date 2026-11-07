#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"

/**
 * SPACE INVADERS — Designer Edition for Adobe Illustrator (ExtendScript / ScriptUI)
 *
 * Features:
 * - Autonomous Real-Time Game Loop via Win32Heartbeat (aliens march, animate & shoot continuously)
 * - 5x9 Invader Swarm (Squids 30pt, Crabs 20pt, Octopuses 10pt) with 2-frame classic pose animation
 * - Authentic arcade speed curve: swarm accelerates as fewer invaders remain
 * - Mystery Red UFO Saucer flying across the top for bonus points (100-200 pts)
 * - 4 Destructible Pixel-Block Defense Bunkers that erode on impact from above or below
 * - Hybrid Mouse + Keyboard (A/D/Arrows + Space/W/Click) cannon control
 * - Dark & Light themes, 4 Localizations (EN, CS, RO, HI), Auto-Saved Settings, and 1-Click Vector Artboard Export
 */

(function () {
    var PLAY_W = 416;
    var PLAY_H = 420;
    var HUD_H = 48;
    var PLAY_Y = HUD_H + 6;
    var CANVAS_W = PLAY_W;
    var CANVAS_H = PLAY_Y + PLAY_H; // 474 px

    // ==================== LOCALIZATION (EN, CS, RO, HI) ====================

    var LANG_ORDER = ["en", "cs", "ro", "hi"];
    var currentLang = "en";
    var darkTheme = true;

    var I18N = {
        en: {
            langName: "English",
            btnNew: "↻ New (N)",
            btnFire: "▲ Fire (Space)",
            btnPause: "❚❚ Pause (P)",
            btnResume: "► Play (P)",
            btnVector: "❖ To Artboard",
            btnClose: "Close (Esc)",
            themeDark: "◐ Dark",
            themeLight: "☀ Light",
            controlsHint: "Mouse / A,D • Click / Space: Fire",
            statusReady: "Move Mouse or A/D, press Space or Click to launch!",
            statusNoHeartbeat: "Timer unavailable - move the mouse to advance.",
            statusPlaying: "Wave {0} — Defend Earth from the Invader Swarm!",
            statusUfo: "★ MYSTERY UFO DESTROYED! +{0} PTS!",
            statusWaveClear: "✓ Wave {0} Cleared! Advancing to Wave {1}...",
            statusLifeLost: "Cannon hit! {0} lives remaining. Press Space to continue.",
            statusPaused: "Game paused. Press P or Space to resume.",
            statusGameOver: "Game Over! Score: {0} (Wave {1}). Press Space or 'New'.",
            exportOk: "✓ Vector Space Invaders created on layer '{0}'!",
            exportErr: "Export error: {0}"
        },
        cs: {
            langName: "Čeština",
            btnNew: "↻ Nová (N)",
            btnFire: "▲ Pal! (Space)",
            btnPause: "❚❚ Pauza (P)",
            btnResume: "► Hrát (P)",
            btnVector: "❖ Do křivek",
            btnClose: "Zavřít (Esc)",
            themeDark: "◐ Tmavý",
            themeLight: "☀ Světlý",
            controlsHint: "Myš / A,D • Klik / Space: Střelba",
            statusReady: "Pohyb myší nebo A/D, Space nebo kliknutí pro start!",
            statusNoHeartbeat: "Časovač nedostupný - posun myší.",
            statusPlaying: "Vlna {0} — Braňte Zemi před invazí!",
            statusUfo: "★ BONUSOVÉ UFO ZNIČENO! +{0} B.!",
            statusWaveClear: "✓ Vlna {0} vyčištěna! Další vlna {1}...",
            statusLifeLost: "Zásah! Zbývají {0} životy. Stiskněte Space.",
            statusPaused: "Hra pozastavena. Stiskněte P nebo Space.",
            statusGameOver: "Konec hry! Skóre: {0} (Vlna {1}). Stiskněte Space.",
            exportOk: "✓ Space Invaders vykresleni do vrstvy '{0}'!",
            exportErr: "Chyba exportu: {0}"
        },
        ro: {
            langName: "Română",
            btnNew: "↻ Nou (N)",
            btnFire: "▲ Foc (Space)",
            btnPause: "❚❚ Pauză (P)",
            btnResume: "► Joacă (P)",
            btnVector: "❖ Pe Artboard",
            btnClose: "Închide (Esc)",
            themeDark: "◐ Întunecat",
            themeLight: "☀ Luminos",
            controlsHint: "Mouse / A,D • Clic / Space: Foc",
            statusReady: "Mișcă mouse-ul sau A/D, apasă Space pentru start!",
            statusNoHeartbeat: "Cronometru indisponibil - mișcă mouse-ul.",
            statusPlaying: "Valul {0} — Apără Pământul de invadatori!",
            statusUfo: "★ OZN BONUS DISTRUS! +{0} PCT.!",
            statusWaveClear: "✓ Valul {0} complet! Urmează valul {1}...",
            statusLifeLost: "Lovit! Mai ai {0} vieți. Apasă Space.",
            statusPaused: "Joc în pauză. Apasă P sau Space pentru continuare.",
            statusGameOver: "Joc încheiat! Scor: {0} (Valul {1}). Apasă Space.",
            exportOk: "✓ Space Invaders desenat în stratul '{0}'!",
            exportErr: "Eroare la export: {0}"
        },
        hi: {
            langName: "हिन्दी",
            btnNew: "↻ नया (N)",
            btnFire: "▲ फायर (Space)",
            btnPause: "❚❚ पॉज़ (P)",
            btnResume: "► खेलें (P)",
            btnVector: "❖ आर्टबोर्ड पर",
            btnClose: "बंद करें (Esc)",
            themeDark: "◐ डार्क",
            themeLight: "☀ लाइट",
            controlsHint: "माउस / A,D • क्लिक / Space: फायर",
            statusReady: "माउस या A/D से चलें, शुरू करने के लिए Space दबाएँ!",
            statusNoHeartbeat: "टाइमर अनुपलब्ध - माउस हिलाएँ।",
            statusPlaying: "वेव {0} — एलियन आक्रमण से पृथ्वी की रक्षा करें!",
            statusUfo: "★ रहस्यमयी UFO नष्ट! +{0} अंक!",
            statusWaveClear: "✓ वेव {0} साफ़! अगली वेव {1}...",
            statusLifeLost: "तोप क्षतिग्रस्त! {0} जीवन शेष। Space दबाएँ।",
            statusPaused: "खेल रुका हुआ है। जारी रखने के लिए P या Space दबाएँ।",
            statusGameOver: "खेल समाप्त! स्कोर: {0} (वेव {1})। Space दबाएँ।",
            exportOk: "✓ वेक्टर Space Invaders '{0}' लेयर पर बनाया गया!",
            exportErr: "निर्यात त्रुटि: {0}"
        }
    };

    function tr(key, args) {
        return translateString(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    // ==================== PALETTE ====================

    var PALETTE = {
        winBgDark: [22, 24, 34],
        winBgLight: [238, 240, 246],
        frameDark: [44, 50, 68],
        frameLight: [168, 174, 190],
        spaceBgDark: [14, 16, 24],
        spaceBgLight: [26, 30, 44],
        hudCardDark: [36, 40, 56],
        hudCardLight: [184, 190, 206],
        hudLipDark: [22, 25, 36],
        hudLipLight: [152, 158, 174],
        squidRgb: [244, 82, 186],    // Top Row (30 pts)
        squidLip: [176, 42, 128],
        crabRgb: [56, 212, 248],     // Middle Rows (20 pts)
        crabLip: [28, 146, 182],
        octoRgb: [112, 238, 96],     // Bottom Rows (10 pts)
        octoLip: [64, 170, 50],
        ufoRgb: [252, 76, 76],
        ufoLip: [180, 34, 34],
        ufoDome: [255, 214, 70],
        bunkerRgb: [72, 224, 138],
        bunkerLip: [42, 156, 92],
        shipRgb: [90, 238, 255],
        shipLip: [42, 160, 186],
        playerLaser: [255, 232, 84],
        alienLaser: [255, 92, 118]
    };

    // ==================== GAME STATE ====================

    var INV_ROWS = 5;
    var INV_COLS = 9;
    var INV_W = 26;
    var INV_H = 18;
    var INV_GAP_X = 11;
    var INV_GAP_Y = 12;

    var SHIP_Y = PLAY_Y + PLAY_H - 30;
    var BUNKER_Y = PLAY_Y + PLAY_H - 78;

    var stars = [];
    for (var si = 0; si < 32; si++) {
        stars.push({
            x: Math.floor(Math.random() * (PLAY_W - 16)) + 8,
            y: PLAY_Y + Math.floor(Math.random() * (PLAY_H - 16)) + 8,
            r: (si % 3 === 0) ? 1.6 : 1.0,
            alpha: (si % 2 === 0) ? 0.35 : 0.18
        });
    }

    var ship = { x: PLAY_W / 2, w: 34, h: 16, speed: 9 };
    var invaders = [];   // { row, col, x, y, w, h, type, pts, alive }
    var bunkers = [];    // { x, y, w, h, alive }
    var pBullets = [];   // { x, y, vy }
    var aBullets = [];   // { x, y, vy }
    var sparks = [];     // { x, y, vx, vy, color, life }
    var ufo = null;      // { x, y, w, h, vx, pts }

    var swarmDir = 1;
    var swarmPose = 0;
    var lastMarchTime = 0;
    var lastEnemyShotTime = 0;
    var lastUfoTime = 0;
    var lastTickTime = new Date().getTime();
    var lastRawMouseX = -1;

    var score = 0;
    var bestScore = 0;
    var wave = 1;
    var lives = 3;
    var paused = true;
    var gameOver = false;

    var statusKey = "statusReady";
    var statusArgs = [];

    function setStatus(key, args) {
        statusKey = key;
        statusArgs = args || [];
    }

    // ==================== PERSISTENCE ====================

    function getSaveFile() {
        return getGameSaveFile("SpaceInvaders");
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

    // ==================== INVADERS & BUNKERS SETUP ====================

    function initBunkers() {
        bunkers = [];
        var bunkerCount = 4;
        var bCols = 7;
        var bRows = 4;
        var cellW = 7;
        var cellH = 6;
        var bunkerW = bCols * cellW; // 49 px
        var marginX = 36;
        var spacing = (PLAY_W - marginX * 2 - bunkerCount * bunkerW) / (bunkerCount - 1);

        for (var b = 0; b < bunkerCount; b++) {
            var bx = Math.round(marginX + b * (bunkerW + spacing));
            for (var r = 0; r < bRows; r++) {
                for (var c = 0; c < bCols; c++) {
                    // Classic bunker shape: beveled top corners and arch cutout at bottom middle
                    if (r === 0 && (c === 0 || c === bCols - 1)) continue;
                    if (r === bRows - 1 && (c >= 2 && c <= 4)) continue;
                    if (r === bRows - 2 && c === 3) continue;

                    bunkers.push({
                        x: bx + c * cellW,
                        y: BUNKER_Y + r * cellH,
                        w: cellW - 1,
                        h: cellH - 1,
                        alive: true
                    });
                }
            }
        }
    }

    function initSwarmForWave(waveNum) {
        invaders = [];
        var totalSwarmW = INV_COLS * INV_W + (INV_COLS - 1) * INV_GAP_X;
        var startX = Math.round((PLAY_W - totalSwarmW) / 2);
        var startY = PLAY_Y + 42 + Math.min(4, (waveNum - 1)) * 10;

        for (var r = 0; r < INV_ROWS; r++) {
            var type = (r === 0) ? 0 : (r <= 2 ? 1 : 2);
            var pts = (type === 0) ? 30 : (type === 1 ? 20 : 10);

            for (var c = 0; c < INV_COLS; c++) {
                invaders.push({
                    row: r,
                    col: c,
                    x: startX + c * (INV_W + INV_GAP_X),
                    y: startY + r * (INV_H + INV_GAP_Y),
                    w: INV_W,
                    h: INV_H,
                    type: type,
                    pts: pts,
                    alive: true
                });
            }
        }

        swarmDir = 1;
        swarmPose = 0;
        pBullets = [];
        aBullets = [];
        ufo = null;
        var now = new Date().getTime();
        lastMarchTime = now;
        lastEnemyShotTime = now;
        lastUfoTime = now;
    }

    function startNewGame() {
        score = 0;
        wave = 1;
        lives = 3;
        gameOver = false;
        paused = true;
        ship.x = PLAY_W / 2;
        sparks = [];
        initBunkers();
        initSwarmForWave(wave);
        setStatus("statusReady");
        saveSettings();
    }

    function countAliveInvaders() {
        var cnt = 0;
        for (var i = 0; i < invaders.length; i++) {
            if (invaders[i].alive) cnt++;
        }
        return cnt;
    }

    function getMarchIntervalMs(aliveCount) {
        // Accelerates from ~420ms with 45 invaders down to ~55ms when 1 invader remains
        var base = 60 + aliveCount * 8 - Math.min(90, (wave - 1) * 18);
        return Math.max(55, base);
    }

    function spawnSparks(cx, cy, rgbColor, count) {
        var n = count || 6;
        for (var i = 0; i < n; i++) {
            var ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
            var spd = 2.0 + Math.random() * 2.8;
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

    function firePlayerLaser() {
        if (gameOver) {
            startNewGame();
            paused = false;
            setStatus("statusPlaying", [wave]);
            return;
        }
        if (paused) {
            paused = false;
            setStatus("statusPlaying", [wave]);
        }
        if (pBullets.length < 2) {
            pBullets.push({
                x: ship.x,
                y: SHIP_Y - 6,
                vy: -8.5
            });
        }
    }

    function fireAlienLaser() {
        // Pick bottom-most alive invader in each column
        var bottomByCol = {};
        for (var i = 0; i < invaders.length; i++) {
            var inv = invaders[i];
            if (!inv.alive) continue;
            if (!bottomByCol[inv.col] || inv.row > bottomByCol[inv.col].row) {
                bottomByCol[inv.col] = inv;
            }
        }
        var shooters = [];
        for (var colKey in bottomByCol) {
            if (bottomByCol.hasOwnProperty(colKey)) {
                shooters.push(bottomByCol[colKey]);
            }
        }
        if (shooters.length === 0) return;

        var chosen = shooters[Math.floor(Math.random() * shooters.length)];
        aBullets.push({
            x: chosen.x + chosen.w / 2,
            y: chosen.y + chosen.h + 2,
            vy: 5.2 + Math.min(2.5, (wave - 1) * 0.4)
        });
    }

    // ==================== PHYSICS & GAME LOOP STEP ====================

    function stepPhysics() {
        var changed = false;

        // 1. Update explosion sparks
        for (var si = sparks.length - 1; si >= 0; si--) {
            changed = true;
            sparks[si].x += sparks[si].vx;
            sparks[si].y += sparks[si].vy;
            sparks[si].life--;
            if (sparks[si].life <= 0) sparks.splice(si, 1);
        }

        if (paused || gameOver) return changed;

        var now = new Date().getTime();
        var aliveCount = countAliveInvaders();

        // 2. Check Wave Cleared
        if (aliveCount === 0) {
            var prevWave = wave;
            wave++;
            initBunkers();
            initSwarmForWave(wave);
            setStatus("statusWaveClear", [prevWave, wave]);
            saveSettings();
            return true;
        }

        // 3. Mystery UFO Spawn & Movement
        if (ufo === null && now - lastUfoTime > 14000) {
            lastUfoTime = now;
            var fromLeft = (Math.random() < 0.5);
            var bonusTable = [100, 150, 200];
            ufo = {
                x: fromLeft ? 10 : (PLAY_W - 42),
                y: PLAY_Y + 14,
                w: 32,
                h: 14,
                vx: fromLeft ? 3.2 : -3.2,
                pts: bonusTable[Math.floor(Math.random() * bonusTable.length)]
            };
        }

        if (ufo !== null) {
            changed = true;
            ufo.x += ufo.vx;
            if (ufo.x < 6 || ufo.x + ufo.w > PLAY_W - 6) {
                ufo = null;
                lastUfoTime = now;
            }
        }

        // 4. Invader Swarm March Step
        if (now - lastMarchTime >= getMarchIntervalMs(aliveCount)) {
            lastMarchTime = now;
            changed = true;
            swarmPose = 1 - swarmPose;

            var stepX = 7 * swarmDir;
            var hitEdge = false;
            var i, inv;

            for (i = 0; i < invaders.length; i++) {
                inv = invaders[i];
                if (!inv.alive) continue;
                if (inv.x + stepX < 10 || inv.x + inv.w + stepX > PLAY_W - 10) {
                    hitEdge = true;
                    break;
                }
            }

            if (hitEdge) {
                swarmDir = -swarmDir;
                for (i = 0; i < invaders.length; i++) {
                    inv = invaders[i];
                    if (!inv.alive) continue;
                    inv.y += 12;

                    // Erode bunkers if invaders descend into them
                    for (var bi = 0; bi < bunkers.length; bi++) {
                        var bk = bunkers[bi];
                        if (bk.alive &&
                            inv.x + inv.w > bk.x && inv.x < bk.x + bk.w &&
                            inv.y + inv.h > bk.y && inv.y < bk.y + bk.h) {
                            bk.alive = false;
                        }
                    }

                    // Invaders reached player defense line -> Game Over
                    if (inv.y + inv.h >= SHIP_Y - 2) {
                        gameOver = true;
                        setStatus("statusGameOver", [score, wave]);
                        saveSettings();
                        return true;
                    }
                }
            } else {
                for (i = 0; i < invaders.length; i++) {
                    if (invaders[i].alive) invaders[i].x += stepX;
                }
            }
        }

        // 5. Alien Shooting Timer
        var shotInterval = Math.max(550, 1250 - (wave - 1) * 110);
        if (now - lastEnemyShotTime >= shotInterval && aBullets.length < 3) {
            lastEnemyShotTime = now;
            fireAlienLaser();
            changed = true;
        }

        // 6. Player Laser Bullets
        for (var pi = pBullets.length - 1; pi >= 0; pi--) {
            changed = true;
            var pb = pBullets[pi];
            pb.y += pb.vy;

            if (pb.y < PLAY_Y + 6) {
                pBullets.splice(pi, 1);
                continue;
            }

            var hitSomething = false;

            // Check UFO collision
            if (ufo !== null &&
                pb.x >= ufo.x && pb.x <= ufo.x + ufo.w &&
                pb.y >= ufo.y && pb.y <= ufo.y + ufo.h) {
                score += ufo.pts;
                if (score > bestScore) bestScore = score;
                spawnSparks(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, PALETTE.ufoRgb, 8);
                setStatus("statusUfo", [ufo.pts]);
                ufo = null;
                lastUfoTime = now;
                pBullets.splice(pi, 1);
                saveSettings();
                continue;
            }

            // Check Bunker collision
            for (var bki = 0; bki < bunkers.length; bki++) {
                var bcell = bunkers[bki];
                if (bcell.alive &&
                    pb.x >= bcell.x - 1 && pb.x <= bcell.x + bcell.w + 1 &&
                    pb.y >= bcell.y && pb.y <= bcell.y + bcell.h) {
                    bcell.alive = false;
                    spawnSparks(bcell.x + bcell.w / 2, bcell.y + bcell.h / 2, PALETTE.bunkerRgb, 4);
                    pBullets.splice(pi, 1);
                    hitSomething = true;
                    break;
                }
            }
            if (hitSomething) continue;

            // Check Invader collision
            for (var ii = 0; ii < invaders.length; ii++) {
                var target = invaders[ii];
                if (target.alive &&
                    pb.x >= target.x - 1 && pb.x <= target.x + target.w + 1 &&
                    pb.y >= target.y && pb.y <= target.y + target.h) {
                    target.alive = false;
                    score += target.pts;
                    if (score > bestScore) bestScore = score;
                    var sparkCol = (target.type === 0) ? PALETTE.squidRgb : (target.type === 1 ? PALETTE.crabRgb : PALETTE.octoRgb);
                    spawnSparks(target.x + target.w / 2, target.y + target.h / 2, sparkCol, 6);
                    pBullets.splice(pi, 1);
                    saveSettings();
                    break;
                }
            }
        }

        // 7. Alien Plasma Bullets
        for (var ai = aBullets.length - 1; ai >= 0; ai--) {
            changed = true;
            var ab = aBullets[ai];
            ab.y += ab.vy;

            if (ab.y > PLAY_Y + PLAY_H - 6) {
                aBullets.splice(ai, 1);
                continue;
            }

            var absorbed = false;
            for (var bi2 = 0; bi2 < bunkers.length; bi2++) {
                var bk2 = bunkers[bi2];
                if (bk2.alive &&
                    ab.x >= bk2.x - 1 && ab.x <= bk2.x + bk2.w + 1 &&
                    ab.y >= bk2.y && ab.y <= bk2.y + bk2.h) {
                    bk2.alive = false;
                    spawnSparks(bk2.x + bk2.w / 2, bk2.y + bk2.h / 2, PALETTE.bunkerRgb, 4);
                    aBullets.splice(ai, 1);
                    absorbed = true;
                    break;
                }
            }
            if (absorbed) continue;

            // Check Player Cannon collision
            if (ab.x >= ship.x - ship.w / 2 && ab.x <= ship.x + ship.w / 2 &&
                ab.y >= SHIP_Y && ab.y <= SHIP_Y + ship.h) {
                aBullets.splice(ai, 1);
                lives--;
                spawnSparks(ship.x, SHIP_Y + ship.h / 2, PALETTE.shipRgb, 8);
                if (lives <= 0) {
                    gameOver = true;
                    setStatus("statusGameOver", [score, wave]);
                    saveSettings();
                } else {
                    paused = true;
                    aBullets = [];
                    pBullets = [];
                    setStatus("statusLifeLost", [lives]);
                }
                return true;
            }
        }

        return changed;
    }

    // ==================== VECTOR GRAPHICS ENGINE ====================

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
        } else if (ch === "W") {
            fillCapsule(g, left, top, left + rx * 0.4, bot, t, brush);
            fillCapsule(g, left + rx * 0.4, bot, cx, midY, t, brush);
            fillCapsule(g, cx, midY, right - rx * 0.4, bot, t, brush);
            fillCapsule(g, right - rx * 0.4, bot, right, top, t, brush);
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

    // ==================== ALIEN SPRITE RENDERER ====================

    function drawInvaderSprite(g, inv, pose, eyeBrush, hiBrush) {
        var x = inv.x;
        var y = inv.y;
        var w = inv.w;
        var h = inv.h;
        var mainRgb = (inv.type === 0) ? PALETTE.squidRgb : (inv.type === 1 ? PALETTE.crabRgb : PALETTE.octoRgb);
        var lipRgb = (inv.type === 0) ? PALETTE.squidLip : (inv.type === 1 ? PALETTE.crabLip : PALETTE.octoLip);

        var mainBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(mainRgb, 1));
        var lipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(lipRgb, 1));

        if (inv.type === 0) {
            // Top Row: Squid Invader (pointed dome + tentacles)
            fillRoundRect(g, x + 4, y + 2, w - 8, h - 6, 5, lipBrush);
            fillRoundRect(g, x + 4, y, w - 8, h - 6, 5, mainBrush);
            fillRoundRect(g, x + 8, y - 2, w - 16, 4, 2, mainBrush);
            if (pose === 0) {
                fillRoundRect(g, x + 3, y + h - 5, 4, 5, 1.5, mainBrush);
                fillRoundRect(g, x + w / 2 - 2, y + h - 5, 4, 5, 1.5, mainBrush);
                fillRoundRect(g, x + w - 7, y + h - 5, 4, 5, 1.5, mainBrush);
            } else {
                fillRoundRect(g, x + 6, y + h - 5, 4, 5, 1.5, mainBrush);
                fillRoundRect(g, x + w - 10, y + h - 5, 4, 5, 1.5, mainBrush);
            }
        } else if (inv.type === 1) {
            // Middle Rows: Crab Invader (claws + antennae)
            fillRoundRect(g, x + 3, y + 3, w - 6, h - 7, 3.5, lipBrush);
            fillRoundRect(g, x + 3, y + 1, w - 6, h - 7, 3.5, mainBrush);
            // Antennae
            fillRoundRect(g, x + 6, y - 2, 3, 4, 1, mainBrush);
            fillRoundRect(g, x + w - 9, y - 2, 3, 4, 1, mainBrush);
            // Claws & Legs
            if (pose === 0) {
                fillRoundRect(g, x, y + 4, 3, 7, 1, mainBrush);
                fillRoundRect(g, x + w - 3, y + 4, 3, 7, 1, mainBrush);
                fillRoundRect(g, x + 4, y + h - 5, 5, 4, 1, mainBrush);
                fillRoundRect(g, x + w - 9, y + h - 5, 5, 4, 1, mainBrush);
            } else {
                fillRoundRect(g, x, y + 1, 3, 7, 1, mainBrush);
                fillRoundRect(g, x + w - 3, y + 1, 3, 7, 1, mainBrush);
                fillRoundRect(g, x + 7, y + h - 5, 4, 4, 1, mainBrush);
                fillRoundRect(g, x + w - 11, y + h - 5, 4, 4, 1, mainBrush);
            }
        } else {
            // Bottom Rows: Octopus Invader (wide armored dome + 4 legs)
            fillRoundRect(g, x + 1, y + 2, w - 2, h - 6, 4.5, lipBrush);
            fillRoundRect(g, x + 1, y, w - 2, h - 6, 4.5, mainBrush);
            if (pose === 0) {
                fillRoundRect(g, x + 2, y + h - 5, 4, 5, 1, mainBrush);
                fillRoundRect(g, x + 8, y + h - 5, 4, 5, 1, mainBrush);
                fillRoundRect(g, x + w - 12, y + h - 5, 4, 5, 1, mainBrush);
                fillRoundRect(g, x + w - 6, y + h - 5, 4, 5, 1, mainBrush);
            } else {
                fillRoundRect(g, x + 4, y + h - 5, 5, 5, 1, mainBrush);
                fillRoundRect(g, x + w / 2 - 2, y + h - 5, 4, 4, 1, mainBrush);
                fillRoundRect(g, x + w - 9, y + h - 5, 5, 5, 1, mainBrush);
            }
        }

        // Specular highlight & glowing eyes
        fillRoundRect(g, x + 6, y + 2, w - 12, 2, 1, hiBrush);
        fillRoundRect(g, x + 6, y + 5, 3.2, 3.5, 1, eyeBrush);
        fillRoundRect(g, x + w - 9.2, y + 5, 3.2, 3.5, 1, eyeBrush);
    }

    // ==================== FULL SCENE RENDERER ====================

    function drawSpaceInvadersScene(g) {
        var cardRgb = darkTheme ? PALETTE.hudCardDark : PALETTE.hudCardLight;
        var lipRgb = darkTheme ? PALETTE.hudLipDark : PALETTE.hudLipLight;
        var labelRgb = darkTheme ? [170, 180, 208] : [75, 82, 102];
        var frameRgb = darkTheme ? PALETTE.frameDark : PALETTE.frameLight;
        var spaceRgb = darkTheme ? PALETTE.spaceBgDark : PALETTE.spaceBgLight;

        var cardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cardRgb, 1));
        var lipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(lipRgb, 1));
        var frameBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(frameRgb, 1));
        var spaceBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(spaceRgb, 1));
        var hiBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 0.25]);
        var eyeBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.06, 0.08, 0.14, 1]);

        // --- 1. Top HUD Cards (y = 0..48) ---
        var cards = [
            { x: 0, w: 108, title: "SCORE", val: score, col: [255, 255, 255] },
            { x: 114, w: 108, title: "BEST", val: bestScore, col: [255, 214, 70] },
            { x: 228, w: 90, title: "WAVE", val: wave, col: PALETTE.crabRgb },
            { x: 324, w: 92, title: "LIVES", val: lives, col: PALETTE.octoRgb }
        ];
        for (var ci = 0; ci < cards.length; ci++) {
            var c = cards[ci];
            fillRoundRect(g, c.x, 3, c.w, 45, 7, lipBrush);
            fillRoundRect(g, c.x, 0, c.w, 45, 7, cardBrush);
            drawVectorString(g, c.title, c.x + c.w / 2, 11, 8, labelRgb, 1);
            drawVectorString(g, c.val, c.x + c.w / 2, 29, 15, c.col, 1);
        }

        // --- 2. Space Arena & Starfield ---
        fillRoundRect(g, 0, PLAY_Y, PLAY_W, PLAY_H, 9, frameBrush);
        fillRoundRect(g, 4, PLAY_Y + 4, PLAY_W - 8, PLAY_H - 8, 6, spaceBrush);

        for (var si = 0; si < stars.length; si++) {
            var st = stars[si];
            var stBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.85, 0.9, 1, st.alpha]);
            fillCircle(g, st.x, st.y, st.r, stBrush);
        }

        // Subtle defense ground line
        var lineBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.28, 0.88, 0.54, 0.35]);
        fillRoundRect(g, 12, SHIP_Y + ship.h + 5, PLAY_W - 24, 2, 1, lineBrush);

        // --- 3. Mystery UFO ---
        if (ufo !== null) {
            var ufoLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.ufoLip, 1));
            var ufoMainB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.ufoRgb, 1));
            var ufoDomeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.ufoDome, 1));
            fillRoundRect(g, ufo.x + 6, ufo.y, ufo.w - 12, 7, 3.5, ufoDomeB);
            fillRoundRect(g, ufo.x, ufo.y + 5, ufo.w, 8, 4, ufoLipB);
            fillRoundRect(g, ufo.x, ufo.y + 4, ufo.w, 6, 3, ufoMainB);
        }

        // --- 4. Destructible Defense Bunkers ---
        var bMainB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.bunkerRgb, 1));
        var bLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.bunkerLip, 1));
        for (var bi = 0; bi < bunkers.length; bi++) {
            var bk = bunkers[bi];
            if (!bk.alive) continue;
            fillRoundRect(g, bk.x, bk.y, bk.w, bk.h, 1.5, bLipB);
            fillRoundRect(g, bk.x, bk.y, bk.w, bk.h - 1.5, 1.5, bMainB);
        }

        // --- 5. Alien Invader Swarm ---
        for (var ii = 0; ii < invaders.length; ii++) {
            var inv = invaders[ii];
            if (!inv.alive) continue;
            drawInvaderSprite(g, inv, swarmPose, eyeBrush, hiBrush);
        }

        // --- 6. Player Laser Cannon ---
        var sx = ship.x - ship.w / 2;
        var sy = SHIP_Y;
        var sLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.shipLip, 1));
        var sMainB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.shipRgb, 1));
        var turretB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.playerLaser, 1));

        // Cannon barrel & cockpit
        fillRoundRect(g, ship.x - 2.5, sy - 5, 5, 7, 2, turretB);
        fillRoundRect(g, ship.x - 8, sy, 16, 6, 3, sMainB);
        // Main hull
        fillRoundRect(g, sx, sy + 4, ship.w, ship.h - 4, 4, sLipB);
        fillRoundRect(g, sx, sy + 4, ship.w, ship.h - 6.5, 4, sMainB);
        fillRoundRect(g, sx + 5, sy + 5.5, ship.w - 10, 2, 1, hiBrush);

        // --- 7. Projectiles & Sparks ---
        var pBulletB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.playerLaser, 1));
        for (var pi = 0; pi < pBullets.length; pi++) {
            fillRoundRect(g, pBullets[pi].x - 1.8, pBullets[pi].y - 5, 3.6, 10, 1.5, pBulletB);
        }

        var aBulletB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.alienLaser, 1));
        for (var ai = 0; ai < aBullets.length; ai++) {
            fillRoundRect(g, aBullets[ai].x - 2, aBullets[ai].y - 4, 4, 9, 1.5, aBulletB);
        }

        for (var spi = 0; spi < sparks.length; spi++) {
            var sp = sparks[spi];
            var spB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(sp.color, sp.life / 7));
            fillCircle(g, sp.x, sp.y, 2.2, spB);
        }

        // --- 8. Pause / Game Over Overlay ---
        if (gameOver || (paused && score > 0)) {
            var ovBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.06, 0.07, 0.12, 0.82]);
            fillRoundRect(g, 4, PLAY_Y + 4, PLAY_W - 8, PLAY_H - 8, 6, ovBrush);

            var cardX = 72;
            var cardY = PLAY_Y + PLAY_H / 2 - 52;
            fillRoundRect(g, cardX, cardY, PLAY_W - 144, 104, 8, cardBrush);
            if (gameOver) {
                drawVectorString(g, "OVER", PLAY_W / 2, cardY + 34, 22, PALETTE.ufoRgb, 1);
                drawVectorString(g, score, PLAY_W / 2, cardY + 74, 18, [255, 255, 255], 1);
            } else {
                drawVectorString(g, "PAUSE", PLAY_W / 2, cardY + 52, 22, PALETTE.ufoDome, 1);
            }
        }
    }

    // ==================== VECTOR EXPORT TO ARTBOARD ====================

    function exportInvadersToArtboard() {
        try {
            var doc;
            if (app.documents.length === 0) {
                doc = app.documents.add(DocumentColorSpace.RGB, 540, 580);
            } else {
                doc = app.activeDocument;
            }

            var abIndex = doc.artboards.getActiveArtboardIndex();
            var abRect = doc.artboards[abIndex].artboardRect;
            var abCenterX = (abRect[0] + abRect[2]) / 2;
            var abCenterY = (abRect[1] + abRect[3]) / 2;

            var layerName = "SpaceInvaders_Vector";
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
            grp.name = "SpaceInvaders_Score_" + score;

            var startLeft = abCenterX - PLAY_W / 2;
            var startTop = abCenterY + PLAY_H / 2;

            var bgRect = grp.pathItems.roundedRectangle(startTop, startLeft, PLAY_W, PLAY_H, 9, 9);
            bgRect.stroked = false;
            bgRect.filled = true;
            bgRect.fillColor = makeRGBColor(PALETTE.spaceBgDark);

            var headerTf = grp.textFrames.add();
            headerTf.contents = "SPACE INVADERS  |  SCORE: " + score + "  |  WAVE: " + wave + "  |  LIVES: " + lives;
            headerTf.textRange.characterAttributes.size = 12;
            headerTf.textRange.characterAttributes.fillColor = makeRGBColor([90, 105, 130]);
            headerTf.position = [startLeft, startTop + 20];

            // Bunkers
            for (var bi = 0; bi < bunkers.length; bi++) {
                var bk = bunkers[bi];
                if (!bk.alive) continue;
                var bRect = grp.pathItems.roundedRectangle(
                    startTop - (bk.y - PLAY_Y),
                    startLeft + bk.x,
                    bk.w,
                    bk.h,
                    1.5,
                    1.5
                );
                bRect.stroked = false;
                bRect.filled = true;
                bRect.fillColor = makeRGBColor(PALETTE.bunkerRgb);
            }

            // Invaders
            for (var ii = 0; ii < invaders.length; ii++) {
                var inv = invaders[ii];
                if (!inv.alive) continue;
                var invCol = (inv.type === 0) ? PALETTE.squidRgb : (inv.type === 1 ? PALETTE.crabRgb : PALETTE.octoRgb);
                var iRect = grp.pathItems.roundedRectangle(
                    startTop - (inv.y - PLAY_Y),
                    startLeft + inv.x,
                    inv.w,
                    inv.h,
                    4,
                    4
                );
                iRect.stroked = false;
                iRect.filled = true;
                iRect.fillColor = makeRGBColor(invCol);
            }

            // Player Ship
            var shipRect = grp.pathItems.roundedRectangle(
                startTop - (SHIP_Y - PLAY_Y),
                startLeft + (ship.x - ship.w / 2),
                ship.w,
                ship.h,
                4,
                4
            );
            shipRect.stroked = false;
            shipRect.filled = true;
            shipRect.fillColor = makeRGBColor(PALETTE.shipRgb);

            app.redraw();
            setStatus("exportOk", [layerName]);
            return true;
        } catch (err) {
            setStatus("exportErr", [err.message]);
            return false;
        }
    }

    // ==================== BACKGROUND HEARTBEAT & WINDOW ====================

    var WIN_TITLE = "SPACE INVADERS - Adobe Illustrator Edition";
    var HB = { title: WIN_TITLE, token: "SpaceInvaders", tickMs: 35 };

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
    hintLbl.preferredSize = [225, 20];

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
    btnNew.preferredSize = [92, 25];
    var btnPause = actionGrp.add("button", undefined, tr("btnResume"));
    btnPause.preferredSize = [108, 25];
    var btnVector = actionGrp.add("button", undefined, tr("btnVector"));
    btnVector.preferredSize = [110, 25];
    var btnClose = actionGrp.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [90, 25];

    // --- 3. Interactive Game Canvas ---
    var gameCanvas = win.add("group");
    gameCanvas.preferredSize = [CANVAS_W, CANVAS_H];
    gameCanvas.minimumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.maximumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.onDraw = function () {
        drawSpaceInvadersScene(this.graphics);
    };

    // --- 4. Bottom Arcade Control Pad ---
    var bottomBar = win.add("group");
    bottomBar.orientation = "row";
    bottomBar.alignChildren = ["fill", "center"];
    bottomBar.preferredSize = [CANVAS_W, 28];
    bottomBar.spacing = 6;

    var btnLeft = bottomBar.add("button", undefined, "◄◄  A");
    btnLeft.preferredSize = [118, 26];
    var btnFire = bottomBar.add("button", undefined, tr("btnFire"));
    btnFire.preferredSize = [168, 26];
    var btnRight = bottomBar.add("button", undefined, "D  ►►");
    btnRight.preferredSize = [118, 26];

    // --- 5. Status Footer ---
    var statusLbl = win.add("statictext", undefined, tr(statusKey, statusArgs));
    statusLbl.preferredSize = [CANVAS_W, 20];

    // ==================== THEME & UI REFRESH ====================

    function applyThemeColors() {
        var bgRgb = darkTheme ? PALETTE.winBgDark : PALETTE.winBgLight;
        var fgRgb = darkTheme ? [225, 232, 245] : [68, 74, 92];

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
        btnFire.text = tr("btnFire");
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
            btnFire.active = true;
        } catch (e) {}
    }

    function clampShipX(xVal) {
        var halfW = ship.w / 2 + 10;
        return Math.max(halfW, Math.min(PLAY_W - halfW, xVal));
    }

    function checkAutoStep() {
        var now = new Date().getTime();
        if (now - lastTickTime >= 32) {
            lastTickTime = now;
            if (stepPhysics()) {
                refreshUI();
            }
        }
    }

    // ==================== EVENT HANDLERS ====================

    win.addEventListener("mousemove", checkAutoStep);

    gameCanvas.addEventListener("mousemove", function (ev) {
        var movedShip = false;
        if (typeof ev.clientX === "number" && ev.clientX >= 10 && ev.clientX <= PLAY_W - 10) {
            // Steer only on real horizontal movement (>= 2px): the heartbeat
            // nudges the cursor by 1px and its synthetic events carry the live
            // position, so no magic constant has to be filtered out here.
            if (lastRawMouseX >= 0 && Math.abs(ev.clientX - lastRawMouseX) >= 2) {
                ship.x = clampShipX(ev.clientX);
                movedShip = true;
            }
            lastRawMouseX = ev.clientX;
        }
        var now = new Date().getTime();
        if (now - lastTickTime >= 32) {
            lastTickTime = now;
            if (stepPhysics() || movedShip) {
                refreshUI();
            }
        } else if (movedShip) {
            refreshUI();
        }
    });

    gameCanvas.addEventListener("mousedown", function (ev) {
        if (typeof ev.clientX === "number") {
            ship.x = clampShipX(ev.clientX);
        }
        firePlayerLaser();
        stepPhysics();
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

    btnPause.onClick = function () {
        if (gameOver) {
            startNewGame();
            paused = false;
            setStatus("statusPlaying", [wave]);
        } else {
            paused = !paused;
            setStatus(paused ? "statusPaused" : "statusPlaying", [wave]);
        }
        refreshUI();
        refocusControl();
    };

    btnVector.onClick = function () {
        exportInvadersToArtboard();
        refreshUI();
        refocusControl();
    };

    btnClose.onClick = function () {
        heartbeatStop();
        saveSettings();
        win.close();
    };

    var lastKeyTime = 0;

    btnFire.onClick = function () {
        if (new Date().getTime() - lastKeyTime < 150) return;
        firePlayerLaser();
        stepPhysics();
        refreshUI();
        refocusControl();
    };

    btnLeft.onClick = function () {
        ship.x = clampShipX(ship.x - ship.speed * 1.6);
        stepPhysics();
        refreshUI();
        refocusControl();
    };

    btnRight.onClick = function () {
        ship.x = clampShipX(ship.x + ship.speed * 1.6);
        stepPhysics();
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
        if (now - lastKeyTime < 30) return;
        lastKeyTime = now;

        if (k === "LEFT" || k === "A") {
            ev.preventDefault();
            ship.x = clampShipX(ship.x - ship.speed * 1.5);
            stepPhysics();
            refreshUI();
        } else if (k === "RIGHT" || k === "D") {
            ev.preventDefault();
            ship.x = clampShipX(ship.x + ship.speed * 1.5);
            stepPhysics();
            refreshUI();
        } else if (k === "SPACE" || k === "UP" || k === "W") {
            ev.preventDefault();
            firePlayerLaser();
            stepPhysics();
            refreshUI();
        } else if (k === "P") {
            ev.preventDefault();
            paused = !paused;
            setStatus(paused ? "statusPaused" : "statusPlaying", [wave]);
            refreshUI();
        } else if (k === "N") {
            ev.preventDefault();
            startNewGame();
            refreshUI();
        }
        refocusControl();
    }

    var focusTargets = [
        win, btnLeft, btnFire, btnRight, btnPause,
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

    perfInit({ token: "SpaceInvaders", canvases: 1, canvasW: CANVAS_W, canvasH: CANVAS_H, tickMs: HB.tickMs, theme: darkTheme ? "dark" : "light", lang: currentLang });
    applyThemeColors();
    win.center();
    win.show();
    heartbeatStop();
})();
