#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"

/**
 * ARKANOID (Brick Breaker) — Designer Edition for Adobe Illustrator (ExtendScript / ScriptUI)
 *
 * Features:
 * - Real-time mouse-driven physics at ~40 FPS (moving the mouse controls the Vaus paddle & steps physics)
 * - Also supports keyboard (A/D or Left/Right, W/Space to launch/laser/step) and click bursts
 * - 5 Hand-Crafted Stages with 1-HP color bricks, 2-HP Silver armor bricks, and 3-HP Gold bricks
 * - 5 Classic Falling Power-Up Capsules:
 *     [W] Wide Paddle   [M] Multi-Ball (x3)   [L] Laser Cannons   [S] Slow Ball   [+] Extra Life
 * - Ball motion trails & brick shatter spark particles
 * - Bespoke Smooth Vector Numeral & Glyph Engine (100% pixel-perfect HUD)
 * - Dark & Light themes, 4 Localizations (EN, CS, RO, HI), Auto-Saved Settings, and 1-Click Vector Artboard Export
 */

(function () {
    var ARENA_W = 368;
    var HUD_H = 48;
    var PLAY_Y = HUD_H + 6;
    var PLAY_H = 396;
    var CANVAS_W = ARENA_W;
    var CANVAS_H = PLAY_Y + PLAY_H; // 450 px

    var BRICK_COLS = 10;
    var BRICK_ROWS = 9;
    var BRICK_GAP = 3;
    var BRICK_PAD_X = 10;
    var BRICK_TOP_Y = PLAY_Y + 28;
    var BRICK_W = Math.floor((ARENA_W - BRICK_PAD_X * 2 - (BRICK_COLS - 1) * BRICK_GAP) / BRICK_COLS); // 32 px
    var BRICK_H = 15;

    var PADDLE_Y = CANVAS_H - 28;
    var PADDLE_BASE_W = 72;
    var PADDLE_WIDE_W = 108;
    var PADDLE_H = 11;
    var BALL_R = 5;

    // ==================== LOCALIZATION (EN, CS, RO, HI) ====================

    var LANG_ORDER = ["en", "cs", "ro", "hi"];
    var currentLang = "en";
    var darkTheme = true;

    var I18N = {
        en: {
            langName: "English",
            btnNew: "↻ New (N)",
            btnStage: "★ Next Stage",
            btnLaunch: "▲ Launch / Step (Space)",
            btnVector: "❖ To Artboard",
            btnClose: "Close (Esc)",
            themeDark: "◐ Dark",
            themeLight: "☀ Light",
            controlsHint: "Mouse: Move • Click/Space: Launch",
            statusReady: "Click on board or press Space to launch ball, then move mouse!",
            statusNoHeartbeat: "Timer unavailable - move the mouse to advance.",
            statusPlaying: "Move mouse over the board to deflect the ball!",
            statusPowerW: "★ POWER-UP: Expanded Vaus Paddle [W]!",
            statusPowerM: "★ POWER-UP: Multi-Ball x3 [M]!",
            statusPowerL: "★ POWER-UP: Laser Cannons [L]! Click or press Space to fire!",
            statusPowerS: "★ POWER-UP: Slow Motion Ball [S]!",
            statusPowerPlus: "★ POWER-UP: Extra Life [+1]!",
            statusStageClear: "★ STAGE {0} CLEARED! Click or press Space to start Stage {1}.",
            statusLifeLost: "Ball lost! {0} lives remaining. Click or Space to launch.",
            statusGameOver: "Game Over! Final Score: {0}. Press 'New (N)' to play again.",
            exportOk: "✓ Vector Arkanoid scene created on layer '{0}'!",
            exportErr: "Export error: {0}"
        },
        cs: {
            langName: "Čeština",
            btnNew: "↻ Nová (N)",
            btnStage: "★ Další kolo",
            btnLaunch: "▲ Start / Krok (Space)",
            btnVector: "❖ Do křivek",
            btnClose: "Zavřít (Esc)",
            themeDark: "◐ Tmavý",
            themeLight: "☀ Světlý",
            controlsHint: "Myš: Pohyb • Klik/Space: Start",
            statusReady: "Klikněte na pole nebo stiskněte Space pro odpálení míčku!",
            statusNoHeartbeat: "Časovač nedostupný - posun myší.",
            statusPlaying: "Pohybujte myší nad polem pro odrážení míčku!",
            statusPowerW: "★ BONUS: Rozšířená pálka [W]!",
            statusPowerM: "★ BONUS: Trojitý míček [M]!",
            statusPowerL: "★ BONUS: Lasery [L]! Klikněte nebo stiskněte Space pro střelbu!",
            statusPowerS: "★ BONUS: Zpomalení míčku [S]!",
            statusPowerPlus: "★ BONUS: Život navíc [+1]!",
            statusStageClear: "★ KOLO {0} DOKONČENO! Klikněte pro start kola {1}.",
            statusLifeLost: "Míček ztracen! Zbývá životů: {0}. Klikněte pro odpálení.",
            statusGameOver: "Konec hry! Skóre: {0}. Klikněte na 'Nová (N)'.",
            exportOk: "✓ Arkanoid vykreslen do vrstvy '{0}'!",
            exportErr: "Chyba exportu: {0}"
        },
        ro: {
            langName: "Română",
            btnNew: "↻ Nou (N)",
            btnStage: "★ Nivel urm.",
            btnLaunch: "▲ Start / Pas (Space)",
            btnVector: "❖ Pe Artboard",
            btnClose: "Închide (Esc)",
            themeDark: "◐ Întunecat",
            themeLight: "☀ Luminos",
            controlsHint: "Mouse: Mișcare • Clic/Space: Start",
            statusReady: "Clic pe tablă sau Space pentru lansare, apoi mișcați mouse-ul!",
            statusNoHeartbeat: "Cronometru indisponibil - mișcă mouse-ul.",
            statusPlaying: "Mișcați mouse-ul peste tablă pentru a controla paleta!",
            statusPowerW: "★ BONUS: Paletă extinsă [W]!",
            statusPowerM: "★ BONUS: Triplă minge [M]!",
            statusPowerL: "★ BONUS: Lasere [L]! Clic sau Space pentru a trage!",
            statusPowerS: "★ BONUS: Încetinire minge [S]!",
            statusPowerPlus: "★ BONUS: Viață suplimentară [+1]!",
            statusStageClear: "★ NIVELUL {0} COMPLET! Clic sau Space pentru nivelul {1}.",
            statusLifeLost: "Minge pierdută! Vieți rămase: {0}. Clic sau Space pentru start.",
            statusGameOver: "Joc încheiat! Scor: {0}. Apăsați 'Nou (N)'.",
            exportOk: "✓ Scena Arkanoid desenată în stratul '{0}'!",
            exportErr: "Eroare la export: {0}"
        },
        hi: {
            langName: "हिन्दी",
            btnNew: "↻ नया (N)",
            btnStage: "★ अगला स्तर",
            btnLaunch: "▲ लॉन्च / स्टेप (Space)",
            btnVector: "❖ आर्टबोर्ड पर",
            btnClose: "बंद करें (Esc)",
            themeDark: "◐ डार्क",
            themeLight: "☀ लाइट",
            controlsHint: "माउस: चाल • क्लिक/Space: लॉन्च",
            statusReady: "गेंद लॉन्च करने के लिए बोर्ड पर क्लिक करें या Space दबाएँ!",
            statusNoHeartbeat: "टाइमर अनुपलब्ध - माउस हिलाएँ।",
            statusPlaying: "गेंद को मोड़ने के लिए बोर्ड के ऊपर माउस घुमाएँ!",
            statusPowerW: "★ बोनस: चौड़ा पैडल [W]!",
            statusPowerM: "★ बोनस: ट्रिपल बॉल [M]!",
            statusPowerL: "★ बोनस: लेज़र तोप [L]! फायर करने के लिए क्लिक या Space दबाएँ!",
            statusPowerS: "★ बोनस: धीमी गेंद [S]!",
            statusPowerPlus: "★ बोनस: अतिरिक्त जीवन [+1]!",
            statusStageClear: "★ स्तर {0} पूरा हुआ! स्तर {1} के लिए क्लिक करें।",
            statusLifeLost: "गेंद खो गई! शेष जीवन: {0}। लॉन्च के लिए क्लिक करें।",
            statusGameOver: "खेल समाप्त! स्कोर: {0}। 'नया (N)' दबाएँ।",
            exportOk: "✓ वेक्टर बोर्ड '{0}' लेयर पर बनाया गया!",
            exportErr: "निर्यात त्रुटि: {0}"
        }
    };

    function tr(key, args) {
        return relaxTranslate(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    // ==================== PALETTE & BRICK STYLES ====================

    // Brick codes: 1..7 = colorful 1-HP bricks, 8 = Silver (2 HP), 9 = Gold (3 HP)
    var BRICK_STYLES = {
        1: { bg: [238, 76, 76],   lip: [180, 42, 42],   pts: 50 },  // Red
        2: { bg: [244, 142, 48],  lip: [188, 96, 20],   pts: 60 },  // Orange
        3: { bg: [242, 204, 44],  lip: [190, 150, 16],  pts: 70 },  // Yellow
        4: { bg: [84, 210, 96],   lip: [46, 152, 58],   pts: 80 },  // Green
        5: { bg: [0, 210, 232],   lip: [0, 148, 170],   pts: 90 },  // Cyan
        6: { bg: [72, 122, 240],  lip: [40, 80, 184],   pts: 100 }, // Blue
        7: { bg: [182, 90, 232],  lip: [130, 50, 176],  pts: 110 }, // Purple
        8: { bg: [185, 198, 214], lip: [122, 136, 154], pts: 150 }, // Silver (2 HP)
        9: { bg: [248, 208, 56],  lip: [194, 146, 14],  pts: 250 }  // Gold (3 HP)
    };

    var POWER_TYPES = [
        { code: "W", bg: [84, 210, 96],  fg: [255, 255, 255] }, // Wide paddle
        { code: "M", bg: [0, 210, 232],  fg: [255, 255, 255] }, // Multi-ball
        { code: "L", bg: [238, 76, 76],  fg: [255, 255, 255] }, // Laser
        { code: "S", bg: [244, 142, 48], fg: [255, 255, 255] }, // Slow
        { code: "+", bg: [242, 204, 44], fg: [60, 50, 20] }     // Extra life
    ];

    var PALETTE = {
        winBgDark: [30, 28, 36],
        winBgLight: [244, 241, 234],
        arenaFrameDark: [54, 50, 64],
        arenaFrameLight: [175, 168, 158],
        arenaBgDark: [20, 18, 26],
        arenaBgLight: [226, 222, 214],
        hudCardDark: [46, 42, 56],
        hudCardLight: [195, 188, 178],
        hudLipDark: [28, 25, 35],
        hudLipLight: [165, 158, 148],
        paddleBody: [225, 232, 245],
        paddleLip: [145, 158, 180],
        paddleEdge: [238, 76, 76],
        paddleLaser: [255, 90, 60]
    };

    // ==================== 5 HAND-CRAFTED LEVEL MAPS (9 rows x 10 cols) ====================

    var STAGES = [
        // Stage 1: Classic Arcade Wall
        [
            [0, 8, 8, 8, 9, 9, 8, 8, 8, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
            [7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ],
        // Stage 2: Twin Diamonds
        [
            [0, 0, 9, 0, 0, 0, 0, 9, 0, 0],
            [0, 1, 8, 1, 0, 0, 5, 8, 5, 0],
            [1, 2, 9, 2, 1, 5, 6, 9, 6, 5],
            [0, 2, 3, 2, 0, 0, 6, 7, 6, 0],
            [0, 0, 3, 0, 0, 0, 0, 7, 0, 0],
            [0, 4, 4, 4, 4, 4, 4, 4, 4, 0],
            [0, 8, 0, 8, 0, 0, 8, 0, 8, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ],
        // Stage 3: Space Invader
        [
            [0, 0, 4, 0, 0, 0, 0, 4, 0, 0],
            [0, 0, 0, 4, 0, 0, 4, 0, 0, 0],
            [0, 0, 4, 4, 4, 4, 4, 4, 0, 0],
            [0, 4, 4, 9, 4, 4, 9, 4, 4, 0],
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            [4, 0, 4, 4, 4, 4, 4, 4, 0, 4],
            [4, 0, 4, 0, 0, 0, 0, 4, 0, 4],
            [0, 0, 0, 8, 8, 8, 8, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ],
        // Stage 4: Golden Citadel
        [
            [9, 9, 8, 5, 5, 5, 5, 8, 9, 9],
            [9, 0, 0, 6, 6, 6, 6, 0, 0, 9],
            [8, 0, 7, 7, 9, 9, 7, 7, 0, 8],
            [1, 0, 2, 8, 3, 3, 8, 2, 0, 1],
            [1, 0, 2, 3, 4, 4, 3, 2, 0, 1],
            [8, 8, 8, 0, 4, 4, 0, 8, 8, 8],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ],
        // Stage 5: Boss Matrix
        [
            [9, 8, 9, 8, 9, 9, 8, 9, 8, 9],
            [8, 1, 2, 1, 8, 8, 1, 2, 1, 8],
            [7, 7, 3, 3, 9, 9, 3, 3, 7, 7],
            [6, 6, 4, 4, 5, 5, 4, 4, 6, 6],
            [8, 5, 5, 8, 8, 8, 8, 5, 5, 8],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [9, 0, 8, 0, 9, 9, 0, 8, 0, 9],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ]
    ];

    // ==================== GAME STATE ====================

    var bricks = []; // { r, c, x, y, type, hp, maxHp }
    var balls = [];  // { x, y, vx, vy, stuck, trail: [] }
    var capsules = []; // { x, y, code, bg, fg }
    var lasers = [];   // { x, y }
    var sparks = [];   // { x, y, vx, vy, color, life }

    var paddleX = (ARENA_W - PADDLE_BASE_W) / 2;
    var paddleW = PADDLE_BASE_W;
    var laserActive = false;
    var speedMult = 1.0;

    var score = 0;
    var bestScore = 0;
    var stage = 1;
    var lives = 3;
    var gameOver = false;
    var lastSimTime = new Date().getTime();

    var statusKey = "statusReady";
    var statusArgs = [];

    function setStatus(key, args) {
        statusKey = key;
        statusArgs = args || [];
    }

    // ==================== PERSISTENCE ====================

    function getSaveFile() {
        return getGameSaveFile("Arkanoid");
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

    // ==================== STAGE & PHYSICS LOGIC ====================

    function buildStageBricks(stageNum) {
        bricks = [];
        var map = STAGES[(stageNum - 1) % STAGES.length];
        for (var r = 0; r < BRICK_ROWS; r++) {
            for (var c = 0; c < BRICK_COLS; c++) {
                var code = map[r][c];
                if (code > 0) {
                    var hp = code === 9 ? 3 : (code === 8 ? 2 : 1);
                    bricks.push({
                        r: r,
                        c: c,
                        x: BRICK_PAD_X + c * (BRICK_W + BRICK_GAP),
                        y: BRICK_TOP_Y + r * (BRICK_H + BRICK_GAP),
                        type: code,
                        hp: hp,
                        maxHp: hp
                    });
                }
            }
        }
    }

    function resetBallOnPaddle() {
        paddleW = PADDLE_BASE_W;
        laserActive = false;
        speedMult = Math.min(1.35, 1.0 + (stage - 1) * 0.06);
        capsules = [];
        lasers = [];
        balls = [{
            x: paddleX + paddleW / 2,
            y: PADDLE_Y - BALL_R - 1,
            vx: 3.6 * (Math.random() < 0.5 ? 1 : -1),
            vy: -5.4,
            stuck: true,
            trail: []
        }];
    }

    function startNewGame() {
        score = 0;
        stage = 1;
        lives = 3;
        gameOver = false;
        sparks = [];
        paddleX = (ARENA_W - PADDLE_BASE_W) / 2;
        buildStageBricks(stage);
        resetBallOnPaddle();
        setStatus("statusReady");
        saveSettings();
    }

    function loadNextStage() {
        stage++;
        sparks = [];
        buildStageBricks(stage);
        resetBallOnPaddle();
        setStatus("statusReady");
        saveSettings();
    }

    function launchStuckBalls() {
        if (gameOver) return false;
        var launched = false;
        for (var i = 0; i < balls.length; i++) {
            if (balls[i].stuck) {
                balls[i].stuck = false;
                var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
                var spd = 6.4 * speedMult;
                balls[i].vx = Math.cos(angle) * spd;
                balls[i].vy = Math.sin(angle) * spd;
                launched = true;
            }
        }
        if (launched) {
            setStatus("statusPlaying");
        }
        return launched;
    }

    function fireLaser() {
        if (!laserActive || gameOver) return false;
        if (lasers.length >= 6) return false;
        lasers.push({ x: paddleX + 10, y: PADDLE_Y - 4 });
        lasers.push({ x: paddleX + paddleW - 10, y: PADDLE_Y - 4 });
        return true;
    }

    function spawnSparks(x, y, rgbColor) {
        for (var i = 0; i < 5; i++) {
            var ang = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
            var spd = 2.0 + Math.random() * 2.5;
            sparks.push({
                x: x,
                y: y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                color: rgbColor,
                life: 8
            });
        }
        if (sparks.length > 35) sparks.splice(0, sparks.length - 35);
    }

    function maybeSpawnCapsule(bx, by) {
        if (capsules.length >= 3) return;
        if (Math.random() < 0.24) {
            var pick = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
            capsules.push({
                x: bx + BRICK_W / 2,
                y: by + BRICK_H / 2,
                code: pick.code,
                bg: pick.bg,
                fg: pick.fg
            });
        }
    }

    function applyPowerUp(code) {
        score += 100;
        if (score > bestScore) bestScore = score;

        if (code === "W") {
            paddleW = PADDLE_WIDE_W;
            if (paddleX + paddleW > ARENA_W - 6) paddleX = ARENA_W - 6 - paddleW;
            setStatus("statusPowerW");
        } else if (code === "L") {
            laserActive = true;
            setStatus("statusPowerL");
        } else if (code === "S") {
            speedMult = 0.78;
            for (var i = 0; i < balls.length; i++) {
                balls[i].vx *= 0.8;
                balls[i].vy *= 0.8;
            }
            setStatus("statusPowerS");
        } else if (code === "+") {
            if (lives < 6) lives++;
            setStatus("statusPowerPlus");
        } else if (code === "M") {
            setStatus("statusPowerM");
            if (balls.length > 0 && balls.length < 5) {
                var src = balls[0];
                src.stuck = false;
                var spd = Math.sqrt(src.vx * src.vx + src.vy * src.vy) || 6.2;
                balls.push({
                    x: src.x,
                    y: src.y,
                    vx: -spd * 0.65,
                    vy: -Math.abs(spd * 0.75),
                    stuck: false,
                    trail: []
                });
                balls.push({
                    x: src.x,
                    y: src.y,
                    vx: spd * 0.65,
                    vy: -Math.abs(spd * 0.75),
                    stuck: false,
                    trail: []
                });
            }
        }
        saveSettings();
    }

    function damageBrickAtIndex(idx) {
        var b = bricks[idx];
        var st = BRICK_STYLES[b.type];
        b.hp--;
        spawnSparks(b.x + BRICK_W / 2, b.y + BRICK_H / 2, st.bg);

        if (b.hp <= 0) {
            score += st.pts;
            if (score > bestScore) bestScore = score;
            maybeSpawnCapsule(b.x, b.y);
            bricks.splice(idx, 1);
            saveSettings();

            if (bricks.length === 0) {
                var finishedStage = stage;
                loadNextStage();
                setStatus("statusStageClear", [finishedStage, stage]);
                return true;
            }
        } else {
            score += 20;
            if (score > bestScore) bestScore = score;
        }
        return false;
    }

    function setPaddleCenter(cx) {
        paddleX = cx - paddleW / 2;
        if (paddleX < 6) paddleX = 6;
        if (paddleX + paddleW > ARENA_W - 6) paddleX = ARENA_W - 6 - paddleW;

        for (var i = 0; i < balls.length; i++) {
            if (balls[i].stuck) {
                balls[i].x = paddleX + paddleW / 2;
                balls[i].y = PADDLE_Y - BALL_R - 1;
            }
        }
    }

    /**
     * Advances 1 physics step
     */
    function stepPhysicsOnce() {
        if (gameOver) return false;

        var anyMoving = false;
        var bi, b;

        // 1. Update balls
        for (bi = balls.length - 1; bi >= 0; bi--) {
            b = balls[bi];
            if (b.stuck) {
                b.x = paddleX + paddleW / 2;
                b.y = PADDLE_Y - BALL_R - 1;
                continue;
            }
            anyMoving = true;

            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > 4) b.trail.shift();

            b.x += b.vx;
            b.y += b.vy;

            // Left / Right walls
            if (b.x - BALL_R < 6) {
                b.x = 6 + BALL_R;
                b.vx = Math.abs(b.vx);
            } else if (b.x + BALL_R > ARENA_W - 6) {
                b.x = ARENA_W - 6 - BALL_R;
                b.vx = -Math.abs(b.vx);
            }

            // Ceiling
            if (b.y - BALL_R < PLAY_Y + 4) {
                b.y = PLAY_Y + 4 + BALL_R;
                b.vy = Math.abs(b.vy);
            }

            // Paddle collision
            if (
                b.vy > 0 &&
                b.y + BALL_R >= PADDLE_Y &&
                b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
                b.x >= paddleX - 3 &&
                b.x <= paddleX + paddleW + 3
            ) {
                var hitRel = (b.x - (paddleX + paddleW / 2)) / (paddleW / 2);
                if (hitRel < -0.92) hitRel = -0.92;
                if (hitRel > 0.92) hitRel = 0.92;

                var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                spd = Math.min(8.2, Math.max(5.6, spd * 1.01));
                var bounceAng = hitRel * (Math.PI * 0.36); // Max +/- 65 deg from vertical
                b.vx = Math.sin(bounceAng) * spd;
                b.vy = -Math.cos(bounceAng) * spd;
                b.y = PADDLE_Y - BALL_R - 1;
            }

            // Brick collisions
            for (var k = bricks.length - 1; k >= 0; k--) {
                var br = bricks[k];
                if (
                    b.x + BALL_R >= br.x &&
                    b.x - BALL_R <= br.x + BRICK_W &&
                    b.y + BALL_R >= br.y &&
                    b.y - BALL_R <= br.y + BRICK_H
                ) {
                    var overlapLeft = (b.x + BALL_R) - br.x;
                    var overlapRight = (br.x + BRICK_W) - (b.x - BALL_R);
                    var overlapTop = (b.y + BALL_R) - br.y;
                    var overlapBot = (br.y + BRICK_H) - (b.y - BALL_R);
                    var minHoriz = Math.min(overlapLeft, overlapRight);
                    var minVert = Math.min(overlapTop, overlapBot);

                    if (minHoriz < minVert) {
                        b.vx = -b.vx;
                    } else {
                        b.vy = -b.vy;
                    }

                    if (damageBrickAtIndex(k)) return true;
                    break;
                }
            }

            // Bottom pit
            if (b.y - BALL_R > CANVAS_H) {
                balls.splice(bi, 1);
            }
        }

        // Check if all balls lost
        if (balls.length === 0) {
            lives--;
            if (lives <= 0) {
                lives = 0;
                gameOver = true;
                setStatus("statusGameOver", [score]);
                saveSettings();
                return true;
            } else {
                resetBallOnPaddle();
                setStatus("statusLifeLost", [lives]);
                return true;
            }
        }

        // 2. Update Falling Power-Up Capsules
        for (var ci = capsules.length - 1; ci >= 0; ci--) {
            anyMoving = true;
            var cap = capsules[ci];
            cap.y += 2.8;

            if (
                cap.y + 7 >= PADDLE_Y &&
                cap.y - 7 <= PADDLE_Y + PADDLE_H &&
                cap.x + 12 >= paddleX &&
                cap.x - 12 <= paddleX + paddleW
            ) {
                var code = cap.code;
                capsules.splice(ci, 1);
                applyPowerUp(code);
            } else if (cap.y > CANVAS_H + 10) {
                capsules.splice(ci, 1);
            }
        }

        // 3. Update Laser Beams
        for (var li = lasers.length - 1; li >= 0; li--) {
            anyMoving = true;
            var lsr = lasers[li];
            lsr.y -= 9.5;
            var hitBrick = false;

            for (var bk = bricks.length - 1; bk >= 0; bk--) {
                var brc = bricks[bk];
                if (
                    lsr.x >= brc.x &&
                    lsr.x <= brc.x + BRICK_W &&
                    lsr.y >= brc.y &&
                    lsr.y <= brc.y + BRICK_H
                ) {
                    hitBrick = true;
                    if (damageBrickAtIndex(bk)) return true;
                    break;
                }
            }
            if (hitBrick || lsr.y < PLAY_Y + 4) {
                lasers.splice(li, 1);
            }
        }

        // 4. Update Sparks
        for (var si = sparks.length - 1; si >= 0; si--) {
            anyMoving = true;
            sparks[si].x += sparks[si].vx;
            sparks[si].y += sparks[si].vy;
            sparks[si].life--;
            if (sparks[si].life <= 0) sparks.splice(si, 1);
        }

        return anyMoving;
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

        if (ch === "+") {
            var arm = h * 0.28;
            fillCapsule(g, cx - arm, cy, cx + arm, cy, t * 0.9, brush);
            fillCapsule(g, cx, cy - arm, cx, cy + arm, t * 0.9, brush);
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
        } else if (ch === "A") {
            fillCapsule(g, cx, top, left, bot, t, brush);
            fillCapsule(g, cx, top, right, bot, t, brush);
            fillCapsule(g, left + rx * 0.3, midY + h * 0.1, right - rx * 0.3, midY + h * 0.1, t, brush);
        } else if (ch === "L") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, left, bot, right, bot, t, brush);
        } else if (ch === "V") {
            fillCapsule(g, left, top, cx, bot, t, brush);
            fillCapsule(g, right, top, cx, bot, t, brush);
        } else if (ch === "W") {
            fillCapsule(g, left, top, left + rx * 0.45, bot, t * 0.85, brush);
            fillCapsule(g, left + rx * 0.45, bot, cx, midY, t * 0.85, brush);
            fillCapsule(g, cx, midY, right - rx * 0.45, bot, t * 0.85, brush);
            fillCapsule(g, right - rx * 0.45, bot, right, top, t * 0.85, brush);
        } else if (ch === "M") {
            fillCapsule(g, left, bot, left, top, t * 0.85, brush);
            fillCapsule(g, left, top, cx, midY + h * 0.1, t * 0.85, brush);
            fillCapsule(g, cx, midY + h * 0.1, right, top, t * 0.85, brush);
            fillCapsule(g, right, top, right, bot, t * 0.85, brush);
        }
    }

    // ==================== GAME SCENE RENDERING ====================

    function drawGameScene(g) {
        var cardRgb = darkTheme ? PALETTE.hudCardDark : PALETTE.hudCardLight;
        var lipRgb = darkTheme ? PALETTE.hudLipDark : PALETTE.hudLipLight;
        var labelRgb = darkTheme ? [175, 168, 192] : [90, 84, 76];
        var frameRgb = darkTheme ? PALETTE.arenaFrameDark : PALETTE.arenaFrameLight;
        var arenaRgb = darkTheme ? PALETTE.arenaBgDark : PALETTE.arenaBgLight;

        var cardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cardRgb, 1));
        var lipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(lipRgb, 1));
        var frameBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(frameRgb, 1));
        var arenaBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(arenaRgb, 1));
        var hiBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 0.28]);

        // --- 1. Top HUD Cards (y = 0..48) ---
        // Card 1: SCORE (x=0, w=104)
        fillRoundRect(g, 0, 3, 104, 45, 7, lipBrush);
        fillRoundRect(g, 0, 0, 104, 45, 7, cardBrush);
        drawVectorString(g, "SCORE", 52, 11, 8, labelRgb, 1);
        drawVectorString(g, score, 52, 29, 15, [255, 255, 255], 1);

        // Card 2: BEST (x=110, w=104)
        fillRoundRect(g, 110, 3, 104, 45, 7, lipBrush);
        fillRoundRect(g, 110, 0, 104, 45, 7, cardBrush);
        drawVectorString(g, "BEST", 162, 11, 8, labelRgb, 1);
        drawVectorString(g, bestScore, 162, 29, 15, [242, 204, 44], 1);

        // Card 3: STAGE (x=220, w=68)
        fillRoundRect(g, 220, 3, 68, 45, 7, lipBrush);
        fillRoundRect(g, 220, 0, 68, 45, 7, cardBrush);
        drawVectorString(g, "STAGE", 254, 11, 8, labelRgb, 1);
        drawVectorString(g, stage, 254, 29, 15, [0, 210, 232], 1);

        // Card 4: LIVES (x=294, w=74)
        fillRoundRect(g, 294, 3, 74, 45, 7, lipBrush);
        fillRoundRect(g, 294, 0, 74, 45, 7, cardBrush);
        drawVectorString(g, "LVL", 331, 11, 8, labelRgb, 1);
        // Draw mini Vaus life icons
        var lifeBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([238, 76, 76], 1));
        var shownLives = Math.min(4, lives);
        var startLX = 331 - (shownLives * 15 - 3) / 2;
        for (var lv = 0; lv < shownLives; lv++) {
            fillRoundRect(g, startLX + lv * 15, 25, 12, 7, 3, lifeBrush);
        }

        // --- 2. Main Arena Enclosure ---
        fillRoundRect(g, 0, PLAY_Y, ARENA_W, PLAY_H, 8, frameBrush);
        fillRoundRect(g, 5, PLAY_Y + 4, ARENA_W - 10, PLAY_H - 6, 6, arenaBrush);

        // --- 3. Bricks ---
        for (var i = 0; i < bricks.length; i++) {
            var br = bricks[i];
            var st = BRICK_STYLES[br.type];
            var bLip = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(st.lip, 1));
            var bFace = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(st.bg, 1));

            fillRoundRect(g, br.x, br.y, BRICK_W, BRICK_H, 3, bLip);
            fillRoundRect(g, br.x, br.y, BRICK_W, BRICK_H - 2.5, 3, bFace);
            fillRoundRect(g, br.x + 3, br.y + 1.5, BRICK_W - 6, 2, 1, hiBrush);

            // Armor rivets / crack indicators for 2-HP & 3-HP bricks
            if (br.maxHp > 1) {
                var rPen = g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(st.lip, 0.9), 1.5);
                if (br.hp < br.maxHp) {
                    // Draw damage crack line
                    g.newPath();
                    g.moveTo(br.x + 8, br.y + 2);
                    g.lineTo(br.x + 14, br.y + 7);
                    g.lineTo(br.x + 11, br.y + 12);
                    g.strokePath(rPen);
                } else {
                    fillCircle(g, br.x + 5, br.y + BRICK_H / 2 - 1, 1.5, bLip);
                    fillCircle(g, br.x + BRICK_W - 5, br.y + BRICK_H / 2 - 1, 1.5, bLip);
                }
            }
        }

        // --- 4. Sparks ---
        for (var si = 0; si < sparks.length; si++) {
            var sp = sparks[si];
            var spBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(sp.color, sp.life / 8));
            fillCircle(g, sp.x, sp.y, 2.2, spBrush);
        }

        // --- 5. Falling Power-Up Capsules ---
        for (var ci = 0; ci < capsules.length; ci++) {
            var cap = capsules[ci];
            var cBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cap.bg, 1));
            fillRoundRect(g, cap.x - 13, cap.y - 7, 26, 14, 6, cBrush);
            fillRoundRect(g, cap.x - 9, cap.y - 5, 18, 2.5, 1, hiBrush);
            drawVectorString(g, cap.code, cap.x, cap.y, 8.5, cap.fg, 1);
        }

        // --- 6. Laser Beams ---
        if (lasers.length > 0) {
            var lsrBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([255, 80, 60], 1));
            for (var li = 0; li < lasers.length; li++) {
                fillRoundRect(g, lasers[li].x - 1.5, lasers[li].y - 6, 3, 12, 1.5, lsrBrush);
            }
        }

        // --- 7. Vaus Paddle ---
        var pLipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.paddleLip, 1));
        var pBodyBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.paddleBody, 1));
        var pEdgeRgb = laserActive ? PALETTE.paddleLaser : PALETTE.paddleEdge;
        var pEdgeBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(pEdgeRgb, 1));

        fillRoundRect(g, paddleX, PADDLE_Y, paddleW, PADDLE_H, 5, pLipBrush);
        fillRoundRect(g, paddleX, PADDLE_Y, paddleW, PADDLE_H - 2.5, 5, pBodyBrush);
        // Red/Laser side thrusters on paddle
        fillRoundRect(g, paddleX, PADDLE_Y, 12, PADDLE_H - 2, 4, pEdgeBrush);
        fillRoundRect(g, paddleX + paddleW - 12, PADDLE_Y, 12, PADDLE_H - 2, 4, pEdgeBrush);
        fillRoundRect(g, paddleX + 14, PADDLE_Y + 1.5, paddleW - 28, 2.5, 1, hiBrush);

        if (laserActive) {
            fillRoundRect(g, paddleX + 8, PADDLE_Y - 4, 3, 4, 1, pEdgeBrush);
            fillRoundRect(g, paddleX + paddleW - 11, PADDLE_Y - 4, 3, 4, 1, pEdgeBrush);
        }

        // --- 8. Balls & Motion Trails ---
        var ballBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
        var ballCoreBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([242, 204, 44], 1));

        for (var bi = 0; bi < balls.length; bi++) {
            var b = balls[bi];
            for (var ti = 0; ti < b.trail.length; ti++) {
                var trAlpha = ((ti + 1) / (b.trail.length + 1)) * 0.35;
                var trBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.4, 0.85, 1.0, trAlpha]);
                fillCircle(g, b.trail[ti].x, b.trail[ti].y, BALL_R * 0.75, trBrush);
            }
            fillCircle(g, b.x, b.y, BALL_R, ballBrush);
            fillCircle(g, b.x - 1, b.y - 1, BALL_R * 0.45, ballCoreBrush);
        }

        // --- 9. Game Over Overlay ---
        if (gameOver) {
            var ovBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.08, 0.07, 0.11, 0.84]);
            fillRoundRect(g, 5, PLAY_Y + 4, ARENA_W - 10, PLAY_H - 6, 6, ovBrush);

            var cardX = 54;
            var cardY = PLAY_Y + PLAY_H / 2 - 55;
            fillRoundRect(g, cardX, cardY, ARENA_W - 108, 110, 8, cardBrush);
            drawVectorString(g, "OVER", ARENA_W / 2, cardY + 34, 22, [238, 76, 76], 1);
            drawVectorString(g, score, ARENA_W / 2, cardY + 78, 18, [255, 255, 255], 1);
        }
    }

    // ==================== VECTOR EXPORT TO ARTBOARD ====================

    function exportArkanoidToArtboard() {
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

            var layerName = "Arkanoid_Vector_Board";
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
            grp.name = "Arkanoid_Score_" + score;

            var startLeft = abCenterX - ARENA_W / 2;
            var startTop = abCenterY + PLAY_H / 2;

            // Background
            var bgRect = grp.pathItems.roundedRectangle(startTop, startLeft, ARENA_W, PLAY_H, 8, 8);
            bgRect.stroked = false;
            bgRect.filled = true;
            bgRect.fillColor = makeRGBColor(PALETTE.arenaBgDark);

            // Header text
            var headerTf = grp.textFrames.add();
            headerTf.contents = "ARKANOID  |  SCORE: " + score + "  |  STAGE: " + stage + "  |  LIVES: " + lives;
            headerTf.textRange.characterAttributes.size = 12;
            headerTf.textRange.characterAttributes.fillColor = makeRGBColor([90, 85, 100]);
            headerTf.position = [startLeft, startTop + 20];

            // Bricks
            for (var i = 0; i < bricks.length; i++) {
                var br = bricks[i];
                var st = BRICK_STYLES[br.type];
                var bx = startLeft + br.x;
                var by = startTop - (br.y - PLAY_Y);
                var bRect = grp.pathItems.roundedRectangle(by, bx, BRICK_W, BRICK_H, 3, 3);
                bRect.stroked = false;
                bRect.filled = true;
                bRect.fillColor = makeRGBColor(st.bg);
            }

            // Capsules
            for (var ci = 0; ci < capsules.length; ci++) {
                var cap = capsules[ci];
                var cx = startLeft + cap.x - 13;
                var cy = startTop - (cap.y - PLAY_Y) + 7;
                var cRect = grp.pathItems.roundedRectangle(cy, cx, 26, 14, 6, 6);
                cRect.stroked = false;
                cRect.filled = true;
                cRect.fillColor = makeRGBColor(cap.bg);
            }

            // Paddle
            var py = startTop - (PADDLE_Y - PLAY_Y);
            var pRect = grp.pathItems.roundedRectangle(py, startLeft + paddleX, paddleW, PADDLE_H, 5, 5);
            pRect.stroked = false;
            pRect.filled = true;
            pRect.fillColor = makeRGBColor(PALETTE.paddleBody);

            // Balls
            for (var bi = 0; bi < balls.length; bi++) {
                var b = balls[bi];
                var ballItem = grp.pathItems.ellipse(
                    startTop - (b.y - PLAY_Y) + BALL_R,
                    startLeft + b.x - BALL_R,
                    BALL_R * 2,
                    BALL_R * 2
                );
                ballItem.stroked = false;
                ballItem.filled = true;
                ballItem.fillColor = makeRGBColor([255, 255, 255]);
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

    var WIN_TITLE = "ARKANOID - Adobe Illustrator Edition";
    var HB = { title: WIN_TITLE, token: "Arkanoid", tickMs: 25 };

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
    hintLbl.preferredSize = [180, 20];

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

    // --- 2. Action Toolbar ---
    var actionGrp = win.add("group");
    actionGrp.orientation = "row";
    actionGrp.alignChildren = ["fill", "center"];
    actionGrp.spacing = 5;
    actionGrp.preferredSize = [CANVAS_W, 26];

    var btnNew = actionGrp.add("button", undefined, tr("btnNew"));
    btnNew.preferredSize = [84, 25];
    var btnStage = actionGrp.add("button", undefined, tr("btnStage"));
    btnStage.preferredSize = [92, 25];
    var btnVector = actionGrp.add("button", undefined, tr("btnVector"));
    btnVector.preferredSize = [92, 25];
    var btnClose = actionGrp.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [84, 25];

    // --- 3. Interactive Game Canvas (HUD + Brick Arena + Paddle) ---
    var gameCanvas = win.add("group");
    gameCanvas.preferredSize = [CANVAS_W, CANVAS_H];
    gameCanvas.minimumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.maximumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.onDraw = function () {
        drawGameScene(this.graphics);
    };

    // --- 4. Bottom Arcade Bar (Keyboard / Click Controls) ---
    var bottomBar = win.add("group");
    bottomBar.orientation = "row";
    bottomBar.alignChildren = ["fill", "center"];
    bottomBar.preferredSize = [CANVAS_W, 28];
    bottomBar.spacing = 6;

    var btnLeft = bottomBar.add("button", undefined, "◄◄ A");
    btnLeft.preferredSize = [78, 26];
    var btnLaunch = bottomBar.add("button", undefined, tr("btnLaunch"));
    btnLaunch.preferredSize = [198, 26];
    var btnRight = bottomBar.add("button", undefined, "D ►►");
    btnRight.preferredSize = [78, 26];

    // --- 5. Status Footer ---
    var statusLbl = win.add("statictext", undefined, tr(statusKey, statusArgs));
    statusLbl.preferredSize = [CANVAS_W, 20];

    // ==================== THEME & UI REFRESH ====================

    function applyThemeColors() {
        var bgRgb = darkTheme ? PALETTE.winBgDark : PALETTE.winBgLight;
        var fgRgb = darkTheme ? [230, 226, 240] : [90, 84, 78];

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
        btnStage.text = tr("btnStage");
        btnLaunch.text = tr("btnLaunch");
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
            btnLaunch.active = true;
        } catch (e) {}
    }

    function runPhysicsSteps(count) {
        for (var i = 0; i < count; i++) {
            if (!stepPhysicsOnce()) break;
        }
        refreshUI();
    }

    // ==================== EVENT HANDLERS ====================

    // 1. Real-time Mouse Tracking + Autonomous Heartbeat on Canvas & Window
    var lastTrackedMouseX = -1;

    gameCanvas.addEventListener("mousemove", function (ev) {
        if (typeof ev.clientX === "number" && typeof ev.clientY === "number" && ev.clientY > 10) {
            // 2px threshold: the heartbeat nudges the cursor vertically by 1px.
            if (Math.abs(ev.clientX - lastTrackedMouseX) >= 2) {
                lastTrackedMouseX = ev.clientX;
                setPaddleCenter(ev.clientX);
                refreshUI();
            }
        }
        var now = new Date().getTime();
        if (now - lastSimTime >= 20) {
            lastSimTime = now;
            if (stepPhysicsOnce()) {
                refreshUI();
            }
        }
    });

    win.addEventListener("mousemove", function () {
        var now = new Date().getTime();
        if (now - lastSimTime >= 22) {
            lastSimTime = now;
            if (stepPhysicsOnce()) {
                refreshUI();
            }
        }
    });

    // 2. Click on Canvas -> Launch stuck ball, fire lasers, or advance physics burst
    gameCanvas.addEventListener("mousedown", function (ev) {
        if (typeof ev.clientX === "number" && typeof ev.clientY === "number" && ev.clientY > 10) {
            lastTrackedMouseX = ev.clientX;
            setPaddleCenter(ev.clientX);
        }
        if (!launchStuckBalls()) {
            fireLaser();
            runPhysicsSteps(2);
        } else {
            runPhysicsSteps(1);
        }
        refocusControl();
    });

    // 3. Buttons
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

    btnStage.onClick = function () {
        loadNextStage();
        refreshUI();
        refocusControl();
    };

    btnVector.onClick = function () {
        exportArkanoidToArtboard();
        refreshUI();
        refocusControl();
    };

    btnClose.onClick = function () {
        heartbeatStop();
        saveSettings();
        win.close();
    };

    var lastKeyTime = 0;

    btnLaunch.onClick = function () {
        if (new Date().getTime() - lastKeyTime < 150) return;
        if (!launchStuckBalls()) {
            fireLaser();
            runPhysicsSteps(2);
        } else {
            runPhysicsSteps(1);
        }
        refocusControl();
    };

    btnLeft.onClick = function () {
        setPaddleCenter(paddleX + paddleW / 2 - 24);
        runPhysicsSteps(1);
        refocusControl();
    };

    btnRight.onClick = function () {
        setPaddleCenter(paddleX + paddleW / 2 + 24);
        runPhysicsSteps(1);
        refocusControl();
    };

    // 4. Keyboard Control + F15 Autonomous Background Heartbeat
    function handleKeyEvent(ev) {
        perfKey();
        var k = ev.keyName ? String(ev.keyName).toUpperCase() : "";
        var now = new Date().getTime();

        if (k === "F15") {
            ev.preventDefault();
            if (now - lastSimTime >= 20) {
                lastSimTime = now;
                if (stepPhysicsOnce()) {
                    refreshUI();
                }
            }
            return;
        }

        if (now - lastKeyTime < 30) return;
        lastKeyTime = now;

        if (k === "LEFT" || k === "A") {
            ev.preventDefault();
            setPaddleCenter(paddleX + paddleW / 2 - 22);
            runPhysicsSteps(1);
        } else if (k === "RIGHT" || k === "D") {
            ev.preventDefault();
            setPaddleCenter(paddleX + paddleW / 2 + 22);
            runPhysicsSteps(1);
        } else if (k === "SPACE" || k === "UP" || k === "W" || k === "DOWN" || k === "S") {
            ev.preventDefault();
            if (!launchStuckBalls()) {
                fireLaser();
                runPhysicsSteps(2);
            } else {
                runPhysicsSteps(1);
            }
        } else if (k === "N") {
            ev.preventDefault();
            startNewGame();
            refreshUI();
        }
    }

    var focusTargets = [
        win, btnLeft, btnLaunch, btnRight, btnNew, btnStage, btnVector, btnTheme, btnClose, langDropdown
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

    perfInit({ token: "Arkanoid", canvases: 1, canvasW: CANVAS_W, canvasH: CANVAS_H, tickMs: HB.tickMs, theme: darkTheme ? "dark" : "light", lang: currentLang });
    applyThemeColors();
    win.center();
    win.show();
    heartbeatStop();
})();
