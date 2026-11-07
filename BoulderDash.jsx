#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"

/**
 * BOULDER DASH — Designer Edition for Adobe Illustrator (ExtendScript / ScriptUI)
 *
 * Features:
 * - Autonomous Real-Time Cave Physics via Win32Heartbeat (boulders & gems fall/roll, fireflies patrol)
 * - Authentic Boulder Dash Mechanics:
 *     • Dig tunnels through dirt, collect sparkling diamonds, push heavy boulders horizontally
 *     • Stationary boulders above Rockford wait until he moves out from under them; falling boulders crush!
 *     • Crushing a Firefly/Butterfly monster with a boulder explodes it into a 3x3 cluster of 9 Diamonds!
 * - 5 Hand-Crafted Underground Caves with Exit Hatch that unlocks once target diamonds are gathered
 * - Dark & Light themes, 4 Localizations (EN, CS, RO, HI), Auto-Saved Settings, and 1-Click Vector Artboard Export
 */

(function () {
    var COLS = 20;
    var ROWS = 16;
    var CELL = 20;
    var PAD = 8;
    var BOARD_W = COLS * CELL + PAD * 2; // 416 px
    var BOARD_H = ROWS * CELL + PAD * 2; // 336 px
    var HUD_H = 48;
    var PLAY_Y = HUD_H + 6;
    var CANVAS_W = BOARD_W;
    var CANVAS_H = PLAY_Y + BOARD_H; // 390 px

    // ==================== LOCALIZATION (EN, CS, RO, HI) ====================

    var LANG_ORDER = ["en", "cs", "ro", "hi"];
    var currentLang = "en";
    var darkTheme = true;

    var I18N = {
        en: {
            langName: "English",
            btnNew: "↻ New (N)",
            btnRetry: "↺ Retry (R)",
            btnCave: "◈ Cave {0}",
            btnPause: "❚❚ Pause (P)",
            btnResume: "► Play (P)",
            btnVector: "❖ To Artboard",
            btnClose: "Close (Esc)",
            themeDark: "◐ Dark",
            themeLight: "☀ Light",
            controlsHint: "WASD / Arrows • R: Retry Cave",
            statusReady: "Cave {0}: Collect {1} diamonds to unlock the Exit!",
            statusNoHeartbeat: "Timer unavailable - move the mouse to advance.",
            statusPlaying: "Cave {0} — Gems: {1}/{2}. Watch out for falling boulders!",
            statusExitOpen: "★ EXIT OPEN! Reach the flashing green hatch!",
            statusMonsterGems: "★ MONSTER CRUSHED INTO DIAMONDS! +100 pts!",
            statusCrushed: "Crushed! {0} lives left. Press R or Space to retry cave.",
            statusCaveClear: "✓ Cave {0} Completed! Entering Cave {1}...",
            statusPaused: "Game paused. Press P or any direction to continue.",
            statusGameOver: "Game Over! Score: {0}. Press N or Space for a new game.",
            exportOk: "✓ Vector Boulder Dash cave created on layer '{0}'!",
            exportErr: "Export error: {0}"
        },
        cs: {
            langName: "Čeština",
            btnNew: "↻ Nová (N)",
            btnRetry: "↺ Znovu (R)",
            btnCave: "◈ Jeskyně {0}",
            btnPause: "❚❚ Pauza (P)",
            btnResume: "► Hrát (P)",
            btnVector: "❖ Do křivek",
            btnClose: "Zavřít (Esc)",
            themeDark: "◐ Tmavý",
            themeLight: "☀ Světlý",
            controlsHint: "WASD / Šipky • R: Restart jeskyně",
            statusReady: "Jeskyně {0}: Nasbírejte {1} diamantů k otevření východu!",
            statusNoHeartbeat: "Časovač nedostupný - posun myší.",
            statusPlaying: "Jeskyně {0} — Diamanty: {1}/{2}. Pozor na balvany!",
            statusExitOpen: "★ VÝCHOD OTEVŘEN! Dojděte k blikajícímu poklopu!",
            statusMonsterGems: "★ PŘÍŠERA ROZDRCENA NA DIAMANTY! +100 b.!",
            statusCrushed: "Zavalen! Zbývají {0} životy. Stiskněte R nebo Space.",
            statusCaveClear: "✓ Jeskyně {0} dokončena! Vstup do jeskyně {1}...",
            statusPaused: "Hra pozastavena. Stiskněte P nebo šipku pro pokračování.",
            statusGameOver: "Konec hry! Skóre: {0}. Stiskněte N nebo Space.",
            exportOk: "✓ Jeskyně Boulder Dash vykreslena do vrstvy '{0}'!",
            exportErr: "Chyba exportu: {0}"
        },
        ro: {
            langName: "Română",
            btnNew: "↻ Nou (N)",
            btnRetry: "↺ Reîncearcă (R)",
            btnCave: "◈ Peștera {0}",
            btnPause: "❚❚ Pauză (P)",
            btnResume: "► Joacă (P)",
            btnVector: "❖ Pe Artboard",
            btnClose: "Închide (Esc)",
            themeDark: "◐ Întunecat",
            themeLight: "☀ Luminos",
            controlsHint: "WASD / Săgeți • R: Reia peștera",
            statusReady: "Peștera {0}: Adună {1} diamante pentru a deschide ieșirea!",
            statusNoHeartbeat: "Cronometru indisponibil - mișcă mouse-ul.",
            statusPlaying: "Peștera {0} — Diamante: {1}/{2}. Atenție la bolovani!",
            statusExitOpen: "★ IEȘIRE DESCHISĂ! Mergi la trapa verde!",
            statusMonsterGems: "★ MONSTRU STRIVIT ÎN DIAMANTE! +100 pct.!",
            statusCrushed: "Strivit! Mai ai {0} vieți. Apasă R sau Space.",
            statusCaveClear: "✓ Peștera {0} completă! Urmează peștera {1}...",
            statusPaused: "Joc în pauză. Apasă P sau o săgeată pentru continuare.",
            statusGameOver: "Joc încheiat! Scor: {0}. Apasă N sau Space.",
            exportOk: "✓ Peștera Boulder Dash desenată în stratul '{0}'!",
            exportErr: "Eroare la export: {0}"
        },
        hi: {
            langName: "हिन्दी",
            btnNew: "↻ नया (N)",
            btnRetry: "↺ फिर से (R)",
            btnCave: "◈ गुफा {0}",
            btnPause: "❚❚ पॉज़ (P)",
            btnResume: "► खेलें (P)",
            btnVector: "❖ आर्टबोर्ड पर",
            btnClose: "बंद करें (Esc)",
            themeDark: "◐ डार्क",
            themeLight: "☀ लाइट",
            controlsHint: "WASD / तीर • R: गुफा रीसेट",
            statusReady: "गुफा {0}: निकास खोलने के लिए {1} हीरे इकट्ठा करें!",
            statusNoHeartbeat: "टाइमर अनुपलब्ध - माउस हिलाएँ।",
            statusPlaying: "गुफा {0} — हीरे: {1}/{2}। गिरती चट्टानों से बचें!",
            statusExitOpen: "★ निकास खुल गया! हरे दरवाजे तक पहुँचें!",
            statusMonsterGems: "★ राक्षस हीरों में बदल गया! +100 अंक!",
            statusCrushed: "चट्टान गिरी! {0} जीवन शेष। R या Space दबाएँ।",
            statusCaveClear: "✓ गुफा {0} पूरी! अगली गुफा {1}...",
            statusPaused: "खेल रुका हुआ है। जारी रखने के लिए P दबाएँ।",
            statusGameOver: "खेल समाप्त! स्कोर: {0}। N या Space दबाएँ।",
            exportOk: "✓ वेक्टर Boulder Dash '{0}' लेयर पर बनाया गया!",
            exportErr: "निर्यात त्रुटि: {0}"
        }
    };

    function tr(key, args) {
        return translateString(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    // ==================== PALETTE ====================

    var PALETTE = {
        winBgDark: [26, 22, 20],
        winBgLight: [242, 238, 232],
        frameDark: [62, 52, 44],
        frameLight: [176, 166, 152],
        tunnelBgDark: [16, 14, 14],
        tunnelBgLight: [34, 30, 28],
        hudCardDark: [44, 38, 34],
        hudCardLight: [194, 184, 172],
        hudLipDark: [26, 22, 18],
        hudLipLight: [160, 150, 138],
        steelFace: [118, 126, 138],
        steelLip: [72, 78, 88],
        brickFace: [168, 92, 74],
        brickLip: [112, 54, 42],
        dirtFace: [154, 104, 56],
        dirtLip: [112, 72, 34],
        dirtSpeck: [188, 138, 82],
        boulderFace: [158, 164, 174],
        boulderLip: [98, 104, 114],
        gemCyan: [64, 236, 255],
        gemBlue: [28, 148, 232],
        gemSpark: [230, 252, 255],
        rockfordSuit: [255, 198, 52],
        rockfordHelm: [64, 196, 255],
        monsterBody: [255, 78, 142],
        monsterCore: [255, 220, 72],
        exitClosed: [130, 138, 148],
        exitOpen: [72, 238, 120]
    };

    // ==================== 5 HAND-CRAFTED 20x16 CAVES ====================
    // Legend:
    // '#' = Steel Border   '=' = Brick Wall   '.' = Dirt   ' ' = Empty Tunnel
    // 'O' = Boulder        '*' = Diamond      'P' = Player 'M' = Firefly Monster  'E' = Exit

    var CAVES = [
        {
            need: 10,
            map: [
                "####################",
                "#P..O....*....O...*#",
                "#...O..O...O..O....#",
                "#..*...O.*....O..*.#",
                "#======.===========#",
                "#....O....*...O....#",
                "#.O..*..O...O...*..#",
                "#...O...O.*...O....#",
                "#..*..O.....O....*.#",
                "#===========.======#",
                "#...O....*....O....#",
                "#.O...*....O....*..#",
                "#....O..======..O..#",
                "#.*.....#    #....*#",
                "#...O...# M  #...OE#",
                "####################"
            ]
        },
        {
            need: 12,
            map: [
                "####################",
                "#P...O..*..O..*..O.#",
                "#.O..O..*..O..*..O.#",
                "#.*..O.....O.....O.#",
                "#....====.====.====#",
                "#..O....O....O....*#",
                "#.*..O....*....O...#",
                "#======.======.====#",
                "#...*...O....*...O.#",
                "#.O...O...O....O...#",
                "#.*................#",
                "#===.=========.====#",
                "#*..O..*...*..O...*#",
                "#...O..#   #..O....#",
                "#.*....# M #.....*E#",
                "####################"
            ]
        },
        {
            // Cave 3: Crush the Firefly Monsters with Boulders to create 9-Diamond clusters!
            need: 14,
            map: [
                "####################",
                "#P...O....O....O..*#",
                "#....O....O....O...#",
                "#..================#",
                "#..*..O......O...*.#",
                "#.....========.....#",
                "#..O..#      #..O..#",
                "#..*..# M    #..*..#",
                "#.....#      #.....#",
                "#.....===..===.....#",
                "#..O..#      #..O..#",
                "#..*..#    M #..*..#",
                "#.....#      #.....#",
                "#.....========.....#",
                "#.*..............*E#",
                "####################"
            ]
        },
        {
            need: 12,
            map: [
                "####################",
                "#P..*..O....O..*...#",
                "#===...O.*..O...===#",
                "#*..O..........O..*#",
                "#...===..==..===...#",
                "#.O.*....O.....*.O.#",
                "#...===......===...#",
                "#*..O..#    #..O..*#",
                "#......# M  #......#",
                "#.O.*..#    #..*.O.#",
                "#...===.====.===...#",
                "#*..O....*.....O..*#",
                "#...===......===...#",
                "#.O..*...O....*..O.#",
                "#*.......O.......*E#",
                "####################"
            ]
        },
        {
            need: 15,
            map: [
                "####################",
                "#P.O.*..O..O..*.O.*#",
                "#..O.*..O..O..*.O..#",
                "#....*..O..O..*....#",
                "#===.====..====.===#",
                "#*...O...*....O...*#",
                "#.O....O...O....O..#",
                "#..====.====.====..#",
                "#.*.#    ##    #.*.#",
                "#...# M  ##  M #...#",
                "#O..#    ##    #..O#",
                "#...====....====...#",
                "#*..O...*..*...O..*#",
                "#...O...O..O...O...#",
                "#*....*......*....E#",
                "####################"
            ]
        }
    ];

    // ==================== GAME STATE ====================

    var caveIndex = 0;
    var grid = [];      // [r][c] char
    var falling = [];   // [r][c] boolean (whether boulder/gem at [r][c] was falling last tick)
    var monsters = [];  // { x, y, dx, dy }
    var sparks = [];    // { x, y, vx, vy, color, life }
    var flashTicks = 0;

    var player = { x: 1, y: 1, facingDx: 1, facingDy: 0, alive: true };
    var exitPos = { x: 18, y: 14, open: false };

    var score = 0;
    var bestScore = 0;
    var gemsCollected = 0;
    var gemsNeeded = 10;
    var lives = 3;
    var paused = false;
    var gameOver = false;
    var tickCount = 0;
    var lastStepTime = new Date().getTime();

    var statusKey = "statusReady";
    var statusArgs = [];

    function setStatus(key, args) {
        statusKey = key;
        statusArgs = args || [];
    }

    // ==================== PERSISTENCE ====================

    function getSaveFile() {
        return getGameSaveFile("BoulderDash");
    }

    function saveSettings() {
        writeKeyValueFile(getSaveFile(), [
            "lang=" + currentLang,
            "dark=" + (darkTheme ? 1 : 0),
            "cave=" + caveIndex,
            "best=" + bestScore
        ]);
    }

    function loadSettings() {
        var map = readKeyValueFile(getSaveFile());
        if (!map) return;
        if (map.lang && I18N[map.lang]) currentLang = map.lang;
        if (map.dark !== undefined) darkTheme = (map.dark === "1");
        if (map.cave !== undefined) caveIndex = Math.max(0, Math.min(CAVES.length - 1, parseInt(map.cave, 10) || 0));
        if (map.best) bestScore = parseInt(map.best, 10) || 0;
    }

    // ==================== CAVE INITIALIZATION ====================

    function loadCave(idx) {
        caveIndex = idx % CAVES.length;
        var def = CAVES[caveIndex];
        gemsNeeded = def.need;
        gemsCollected = 0;
        exitPos.open = false;
        flashTicks = 0;
        monsters = [];
        sparks = [];
        grid = [];
        falling = [];

        for (var r = 0; r < ROWS; r++) {
            var rowArr = [];
            var fallRow = [];
            var line = def.map[r];
            for (var c = 0; c < COLS; c++) {
                var ch = line.charAt(c);
                fallRow.push(false);
                if (ch === "P") {
                    player.x = c;
                    player.y = r;
                    player.facingDx = 1;
                    player.facingDy = 0;
                    player.alive = true;
                    rowArr.push("P");
                } else if (ch === "M") {
                    monsters.push({ x: c, y: r, dx: 1, dy: 0 });
                    rowArr.push("M");
                } else if (ch === "E") {
                    exitPos.x = c;
                    exitPos.y = r;
                    rowArr.push("E");
                } else {
                    rowArr.push(ch);
                }
            }
            grid.push(rowArr);
            falling.push(fallRow);
        }

        setStatus("statusReady", [caveIndex + 1, gemsNeeded]);
    }

    function startNewGame() {
        score = 0;
        lives = 3;
        gameOver = false;
        paused = false;
        loadCave(caveIndex);
        saveSettings();
    }

    function spawnSparksAtCell(gx, gy, rgbColor, count) {
        var cx = PAD + gx * CELL + CELL / 2;
        var cy = PLAY_Y + PAD + gy * CELL + CELL / 2;
        var n = count || 6;
        for (var i = 0; i < n; i++) {
            var ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
            var spd = 2.0 + Math.random() * 2.6;
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

    function killPlayer() {
        if (!player.alive) return;
        player.alive = false;
        grid[player.y][player.x] = " ";
        spawnSparksAtCell(player.x, player.y, PALETTE.rockfordSuit, 10);
        lives--;
        if (lives <= 0) {
            gameOver = true;
            setStatus("statusGameOver", [score]);
            saveSettings();
        } else {
            setStatus("statusCrushed", [lives]);
        }
    }

    function explodeMonsterToDiamonds(mx, my) {
        // Remove monster from list
        for (var i = monsters.length - 1; i >= 0; i--) {
            if (monsters[i].x === mx && monsters[i].y === my) {
                monsters.splice(i, 1);
            }
        }
        score += 100;
        if (score > bestScore) bestScore = score;
        spawnSparksAtCell(mx, my, PALETTE.gemCyan, 10);

        // Fill 3x3 area around monster with Diamonds ('*')
        for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
                var nx = mx + dx;
                var ny = my + dy;
                if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1) {
                    var tile = grid[ny][nx];
                    if (tile !== "#" && tile !== "E") {
                        if (tile === "P") {
                            killPlayer();
                        } else {
                            grid[ny][nx] = "*";
                            falling[ny][nx] = false;
                        }
                    }
                }
            }
        }
        setStatus("statusMonsterGems");
        saveSettings();
    }

    // ==================== PLAYER MOVEMENT & DIGGING ====================

    function movePlayer(dx, dy, snapOnly) {
        if (gameOver) {
            startNewGame();
            return;
        }
        if (!player.alive) {
            loadCave(caveIndex);
            return;
        }
        if (paused) {
            paused = false;
        }

        player.facingDx = dx;
        player.facingDy = dy;

        var nx = player.x + dx;
        var ny = player.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;

        var target = grid[ny][nx];

        // 1. Entering Open Exit
        if (target === "E" && exitPos.open && !snapOnly) {
            score += 150;
            if (score > bestScore) bestScore = score;
            var prevCave = caveIndex + 1;
            loadCave((caveIndex + 1) % CAVES.length);
            setStatus("statusCaveClear", [prevCave, caveIndex + 1]);
            saveSettings();
            return;
        }

        // 2. Touching a Monster
        if (target === "M") {
            killPlayer();
            return;
        }

        // 3. Pushing a Boulder horizontally
        if (target === "O" && dy === 0 && !snapOnly) {
            var bx = nx + dx;
            if (bx > 0 && bx < COLS - 1 && grid[ny][bx] === " " && !falling[ny][nx]) {
                grid[ny][bx] = "O";
                falling[ny][bx] = false;
                grid[player.y][player.x] = " ";
                player.x = nx;
                player.y = ny;
                grid[player.y][player.x] = "P";
            }
            return;
        }

        // 4. Walking / Digging into Empty, Dirt, or Diamond
        if (target === " " || target === "." || target === "*") {
            if (target === ".") {
                spawnSparksAtCell(nx, ny, PALETTE.dirtSpeck, 4);
            } else if (target === "*") {
                gemsCollected++;
                var pts = exitPos.open ? 50 : 25;
                score += pts;
                if (score > bestScore) bestScore = score;
                spawnSparksAtCell(nx, ny, PALETTE.gemCyan, 6);

                if (!exitPos.open && gemsCollected >= gemsNeeded) {
                    exitPos.open = true;
                    flashTicks = 3;
                    setStatus("statusExitOpen");
                } else {
                    setStatus("statusPlaying", [caveIndex + 1, gemsCollected, gemsNeeded]);
                }
                saveSettings();
            }

            if (snapOnly) {
                grid[ny][nx] = " ";
            } else {
                grid[player.y][player.x] = " ";
                player.x = nx;
                player.y = ny;
                grid[player.y][player.x] = "P";
            }
        }
    }

    // ==================== REAL-TIME CAVE GRAVITY & MONSTER AI ====================

    function isRoundedSupport(ch) {
        return ch === "O" || ch === "*" || ch === "=";
    }

    function stepCavePhysics() {
        var changed = false;

        // 1. Update sparks
        for (var si = sparks.length - 1; si >= 0; si--) {
            changed = true;
            sparks[si].x += sparks[si].vx;
            sparks[si].y += sparks[si].vy;
            sparks[si].life--;
            if (sparks[si].life <= 0) sparks.splice(si, 1);
        }

        if (flashTicks > 0) {
            flashTicks--;
            changed = true;
        }

        if (paused || gameOver) return changed;

        tickCount++;
        changed = true;

        // 2. Scan Boulders ('O') and Diamonds ('*') from bottom to top
        var movedThisTick = [];
        for (var rm = 0; rm < ROWS; rm++) {
            var mRow = [];
            for (var cm = 0; cm < COLS; cm++) mRow.push(false);
            movedThisTick.push(mRow);
        }

        for (var r = ROWS - 2; r >= 1; r--) {
            for (var c = 1; c < COLS - 1; c++) {
                if (movedThisTick[r][c]) continue;
                var ch = grid[r][c];
                if (ch !== "O" && ch !== "*") continue;

                var wasFalling = falling[r][c];
                var below = grid[r + 1][c];

                // Case A: Empty space directly below -> fall straight down
                if (below === " ") {
                    grid[r + 1][c] = ch;
                    grid[r][c] = " ";
                    falling[r + 1][c] = true;
                    falling[r][c] = false;
                    movedThisTick[r + 1][c] = true;
                }
                // Case B: Falling object hits Player or Monster below!
                else if (wasFalling && (below === "P" || below === "M")) {
                    grid[r][c] = " ";
                    falling[r][c] = false;
                    if (below === "P") {
                        grid[r + 1][c] = ch;
                        killPlayer();
                    } else if (below === "M") {
                        explodeMonsterToDiamonds(c, r + 1);
                    }
                }
                // Case C: Resting on a rounded object ('O', '*', '=') -> try rolling left or right
                else if (isRoundedSupport(below)) {
                    var rolled = false;
                    // Try rolling Left
                    if (grid[r][c - 1] === " " && grid[r + 1][c - 1] === " ") {
                        grid[r][c - 1] = ch;
                        grid[r][c] = " ";
                        falling[r][c - 1] = true;
                        falling[r][c] = false;
                        movedThisTick[r][c - 1] = true;
                        rolled = true;
                    }
                    // Try rolling Right
                    else if (grid[r][c + 1] === " " && grid[r + 1][c + 1] === " ") {
                        grid[r][c + 1] = ch;
                        grid[r][c] = " ";
                        falling[r][c + 1] = true;
                        falling[r][c] = false;
                        movedThisTick[r][c + 1] = true;
                        rolled = true;
                    }
                    if (!rolled) {
                        falling[r][c] = false;
                    }
                } else {
                    falling[r][c] = false;
                }
            }
        }

        // 3. Move Firefly Monsters (left-hand wall-following patrol)
        for (var mi = monsters.length - 1; mi >= 0; mi--) {
            var m = monsters[mi];
            if (grid[m.y][m.x] !== "M") continue;

            // Check if adjacent to Rockford
            if (player.alive && Math.abs(m.x - player.x) + Math.abs(m.y - player.y) === 1) {
                killPlayer();
                break;
            }

            // Left-hand rule: try turning left, then straight, then right, then back
            var leftDir = { dx: m.dy, dy: -m.dx };
            var straightDir = { dx: m.dx, dy: m.dy };
            var rightDir = { dx: -m.dy, dy: m.dx };
            var backDir = { dx: -m.dx, dy: -m.dy };
            var candidates = [leftDir, straightDir, rightDir, backDir];

            for (var ci = 0; ci < candidates.length; ci++) {
                var d = candidates[ci];
                var mnx = m.x + d.dx;
                var mny = m.y + d.dy;
                if (grid[mny][mnx] === " ") {
                    grid[m.y][m.x] = " ";
                    m.x = mnx;
                    m.y = mny;
                    m.dx = d.dx;
                    m.dy = d.dy;
                    grid[m.y][m.x] = "M";
                    break;
                } else if (grid[mny][mnx] === "P") {
                    killPlayer();
                    break;
                }
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

    function fillDiamondPoly(g, cx, cy, rx, ry, brush) {
        g.newPath();
        g.moveTo(cx, cy - ry);
        g.lineTo(cx + rx, cy);
        g.lineTo(cx, cy + ry);
        g.lineTo(cx - rx, cy);
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
        } else if (ch === "/") {
            fillCapsule(g, left + rx * 0.2, bot, right - rx * 0.2, top, t, brush);
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
        } else if (ch === "M") {
            fillCapsule(g, left, top, left, bot, t, brush);
            fillCapsule(g, right, top, right, bot, t, brush);
            fillCapsule(g, left, top, cx, midY + t, t, brush);
            fillCapsule(g, right, top, cx, midY + t, t, brush);
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

    // ==================== FULL SCENE RENDERER ====================

    function drawBoulderDashScene(g) {
        var cardRgb = darkTheme ? PALETTE.hudCardDark : PALETTE.hudCardLight;
        var lipRgb = darkTheme ? PALETTE.hudLipDark : PALETTE.hudLipLight;
        var labelRgb = darkTheme ? [196, 182, 168] : [82, 72, 64];
        var frameRgb = darkTheme ? PALETTE.frameDark : PALETTE.frameLight;
        var tunnelRgb = (flashTicks > 0) ? [90, 110, 95] : (darkTheme ? PALETTE.tunnelBgDark : PALETTE.tunnelBgLight);

        var cardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(cardRgb, 1));
        var lipBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(lipRgb, 1));
        var frameBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(frameRgb, 1));
        var tunnelBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(tunnelRgb, 1));
        var hiBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 0.30]);

        // --- 1. Top HUD Cards (y = 0..48) ---
        var gemStr = gemsCollected + "/" + gemsNeeded;
        var cards = [
            { x: 0,   w: 108, title: "SCORE", val: score,  col: [255, 255, 255] },
            { x: 114, w: 114, title: "GEMS",  val: gemStr, col: exitPos.open ? PALETTE.exitOpen : PALETTE.gemCyan },
            { x: 234, w: 86,  title: "CAVE",  val: caveIndex + 1, col: PALETTE.rockfordSuit },
            { x: 326, w: 90,  title: "LIVES", val: lives,  col: PALETTE.monsterBody }
        ];
        for (var ci = 0; ci < cards.length; ci++) {
            var c = cards[ci];
            fillRoundRect(g, c.x, 3, c.w, 45, 7, lipBrush);
            fillRoundRect(g, c.x, 0, c.w, 45, 7, cardBrush);
            drawVectorString(g, c.title, c.x + c.w / 2, 11, 8, labelRgb, 1);
            drawVectorString(g, c.val, c.x + c.w / 2, 29, 14, c.col, 1);
        }

        // --- 2. Underground Cave Container ---
        fillRoundRect(g, 0, PLAY_Y, BOARD_W, BOARD_H, 9, frameBrush);
        fillRoundRect(g, 4, PLAY_Y + 4, BOARD_W - 8, BOARD_H - 8, 6, tunnelBrush);

        // Brushes for tiles
        var steelFaceB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.steelFace, 1));
        var steelLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.steelLip, 1));
        var brickFaceB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.brickFace, 1));
        var brickLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.brickLip, 1));
        var dirtFaceB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.dirtFace, 1));
        var dirtLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.dirtLip, 1));
        var dirtSpeckB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.dirtSpeck, 1));
        var boulderFaceB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.boulderFace, 1));
        var boulderLipB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.boulderLip, 1));
        var gemOuterB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.gemBlue, 1));
        var gemInnerB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.gemCyan, 1));
        var gemSparkB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.gemSpark, 1));

        // --- 3. Render Cave Grid ---
        for (var r = 0; r < ROWS; r++) {
            for (var col = 0; col < COLS; col++) {
                var ch = grid[r][col];
                if (ch === " ") continue;

                var tx = PAD + col * CELL;
                var ty = PLAY_Y + PAD + r * CELL;
                var cx = tx + CELL / 2;
                var cy = ty + CELL / 2;

                if (ch === "#") {
                    // Titanium Border Wall
                    fillRoundRect(g, tx + 0.5, ty + 0.5, CELL - 1, CELL - 1, 2.5, steelLipB);
                    fillRoundRect(g, tx + 0.5, ty + 0.5, CELL - 1, CELL - 3, 2.5, steelFaceB);
                    fillCircle(g, tx + 4, ty + 4, 1.2, steelLipB);
                    fillCircle(g, tx + CELL - 4, ty + 4, 1.2, steelLipB);
                } else if (ch === "=") {
                    // Rounded Brick Wall
                    fillRoundRect(g, tx + 0.5, ty + 0.5, CELL - 1, CELL - 1, 3, brickLipB);
                    fillRoundRect(g, tx + 0.5, ty + 0.5, CELL - 2, CELL - 2.5, 3, brickFaceB);
                    fillRoundRect(g, tx + 2, ty + CELL / 2 - 1, CELL - 4, 1.5, 0.5, brickLipB);
                } else if (ch === ".") {
                    // Dirt / Soil with organic pebble specks
                    fillRoundRect(g, tx + 0.5, ty + 0.5, CELL - 1, CELL - 1, 2, dirtLipB);
                    fillRoundRect(g, tx + 0.5, ty + 0.5, CELL - 1, CELL - 2.5, 2, dirtFaceB);
                    fillCircle(g, tx + 5, ty + 6, 1.4, dirtSpeckB);
                    fillCircle(g, tx + 13, ty + 12, 1.6, dirtSpeckB);
                    fillCircle(g, tx + 14, ty + 5, 1.1, dirtLipB);
                } else if (ch === "O") {
                    // 3D Granite Boulder
                    fillCircle(g, cx, cy + 1, CELL * 0.44, boulderLipB);
                    fillCircle(g, cx, cy - 0.5, CELL * 0.43, boulderFaceB);
                    fillCircle(g, cx - 2.5, cy - 3, 2.4, hiBrush);
                } else if (ch === "*") {
                    // Faceted Sparkling Diamond
                    var shimmer = ((r + col + tickCount) % 2 === 0);
                    fillDiamondPoly(g, cx, cy + 1, CELL * 0.44, CELL * 0.44, gemOuterB);
                    fillDiamondPoly(g, cx, cy, CELL * 0.36, CELL * 0.36, gemInnerB);
                    if (shimmer) {
                        fillDiamondPoly(g, cx, cy - 1.5, CELL * 0.18, CELL * 0.18, gemSparkB);
                    }
                } else if (ch === "E") {
                    // Exit Hatch (flashes bright green when unlocked)
                    var exitCol = exitPos.open
                        ? ((tickCount % 2 === 0) ? PALETTE.exitOpen : PALETTE.gemCyan)
                        : PALETTE.exitClosed;
                    var exB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(exitCol, 1));
                    fillRoundRect(g, tx + 1, ty + 1, CELL - 2, CELL - 2, 4, steelLipB);
                    fillRoundRect(g, tx + 2.5, ty + 2.5, CELL - 5, CELL - 5, 3, exB);
                } else if (ch === "M") {
                    // Firefly / Butterfly Monster
                    var mOuterB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.monsterBody, 1));
                    var mCoreB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.monsterCore, 1));
                    var wingR = (tickCount % 2 === 0) ? 4.2 : 3.2;
                    fillCircle(g, cx - 4, cy - 4, wingR, mOuterB);
                    fillCircle(g, cx + 4, cy - 4, wingR, mOuterB);
                    fillCircle(g, cx - 4, cy + 4, wingR, mOuterB);
                    fillCircle(g, cx + 4, cy + 4, wingR, mOuterB);
                    fillCircle(g, cx, cy, 4.0, mCoreB);
                } else if (ch === "P") {
                    // Rockford Miner Character
                    var suitB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.rockfordSuit, 1));
                    var helmB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PALETTE.rockfordHelm, 1));
                    var eyeB = g.newBrush(g.BrushType.SOLID_COLOR, [0.1, 0.12, 0.16, 1]);

                    fillRoundRect(g, tx + 2.5, ty + 2.5, CELL - 5, CELL - 4, 5, suitB);
                    fillRoundRect(g, tx + 3.5, ty + 2, CELL - 7, 6, 3, helmB);
                    fillCircle(g, cx - 2.5 + player.facingDx * 1.2, cy + 1, 1.5, eyeB);
                    fillCircle(g, cx + 2.5 + player.facingDx * 1.2, cy + 1, 1.5, eyeB);
                }
            }
        }

        // --- 4. Sparks ---
        for (var si = 0; si < sparks.length; si++) {
            var sp = sparks[si];
            var spBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(sp.color, sp.life / 7));
            fillCircle(g, sp.x, sp.y, 2.3, spBrush);
        }

        // --- 5. Pause / Game Over Overlay ---
        if (gameOver || paused) {
            var ovBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.08, 0.06, 0.06, 0.82]);
            fillRoundRect(g, 4, PLAY_Y + 4, BOARD_W - 8, BOARD_H - 8, 6, ovBrush);

            var cardX = 68;
            var cardY = PLAY_Y + BOARD_H / 2 - 52;
            fillRoundRect(g, cardX, cardY, BOARD_W - 136, 104, 8, cardBrush);
            if (gameOver) {
                drawVectorString(g, "OVER", BOARD_W / 2, cardY + 34, 22, PALETTE.monsterBody, 1);
                drawVectorString(g, score, BOARD_W / 2, cardY + 74, 18, [255, 255, 255], 1);
            } else {
                drawVectorString(g, "PAUSE", BOARD_W / 2, cardY + 52, 22, PALETTE.rockfordSuit, 1);
            }
        }
    }

    // ==================== VECTOR EXPORT TO ARTBOARD ====================

    function exportBoulderDashToArtboard() {
        try {
            var doc;
            if (app.documents.length === 0) {
                doc = app.documents.add(DocumentColorSpace.RGB, 540, 480);
            } else {
                doc = app.activeDocument;
            }

            var abIndex = doc.artboards.getActiveArtboardIndex();
            var abRect = doc.artboards[abIndex].artboardRect;
            var abCenterX = (abRect[0] + abRect[2]) / 2;
            var abCenterY = (abRect[1] + abRect[3]) / 2;

            var layerName = "BoulderDash_Vector";
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
            grp.name = "BoulderDash_Cave_" + (caveIndex + 1) + "_Score_" + score;

            var startLeft = abCenterX - BOARD_W / 2;
            var startTop = abCenterY + BOARD_H / 2;

            var bgRect = grp.pathItems.roundedRectangle(startTop, startLeft, BOARD_W, BOARD_H, 9, 9);
            bgRect.stroked = false;
            bgRect.filled = true;
            bgRect.fillColor = makeRGBColor(PALETTE.tunnelBgDark);

            var headerTf = grp.textFrames.add();
            headerTf.contents = "BOULDER DASH  |  CAVE: " + (caveIndex + 1) + "  |  GEMS: " + gemsCollected + "/" + gemsNeeded + "  |  SCORE: " + score;
            headerTf.textRange.characterAttributes.size = 12;
            headerTf.textRange.characterAttributes.fillColor = makeRGBColor([140, 125, 110]);
            headerTf.position = [startLeft, startTop + 20];

            for (var r = 0; r < ROWS; r++) {
                for (var col = 0; col < COLS; col++) {
                    var ch = grid[r][col];
                    if (ch === " ") continue;

                    var wx = startLeft + PAD + col * CELL;
                    var wy = startTop - PAD - r * CELL;

                    if (ch === "O") {
                        var bEll = grp.pathItems.ellipse(wy - 1, wx + 1, CELL - 2, CELL - 2);
                        bEll.stroked = false;
                        bEll.filled = true;
                        bEll.fillColor = makeRGBColor(PALETTE.boulderFace);
                    } else if (ch === "*") {
                        var dPoly = grp.pathItems.add();
                        var cx = wx + CELL / 2;
                        var cy = wy - CELL / 2;
                        var rad = CELL * 0.42;
                        dPoly.setEntirePath([
                            [cx, cy + rad],
                            [cx + rad, cy],
                            [cx, cy - rad],
                            [cx - rad, cy]
                        ]);
                        dPoly.closed = true;
                        dPoly.stroked = false;
                        dPoly.filled = true;
                        dPoly.fillColor = makeRGBColor(PALETTE.gemCyan);
                    } else {
                        var tileCol = PALETTE.dirtFace;
                        if (ch === "#") tileCol = PALETTE.steelFace;
                        else if (ch === "=") tileCol = PALETTE.brickFace;
                        else if (ch === "P") tileCol = PALETTE.rockfordSuit;
                        else if (ch === "M") tileCol = PALETTE.monsterBody;
                        else if (ch === "E") tileCol = exitPos.open ? PALETTE.exitOpen : PALETTE.exitClosed;

                        var tRect = grp.pathItems.roundedRectangle(wy, wx, CELL - 1, CELL - 1, 2.5, 2.5);
                        tRect.stroked = false;
                        tRect.filled = true;
                        tRect.fillColor = makeRGBColor(tileCol);
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

    // ==================== BACKGROUND HEARTBEAT & WINDOW ====================

    var WIN_TITLE = "BOULDER DASH - Adobe Illustrator Edition";
    var HB = { title: WIN_TITLE, token: "BoulderDash", tickMs: 35 };

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
    actionGrp.spacing = 4;
    actionGrp.preferredSize = [CANVAS_W, 26];

    var btnRetry = actionGrp.add("button", undefined, tr("btnRetry"));
    btnRetry.preferredSize = [96, 25];
    var btnCave = actionGrp.add("button", undefined, tr("btnCave", [caveIndex + 1]));
    btnCave.preferredSize = [104, 25];
    var btnVector = actionGrp.add("button", undefined, tr("btnVector"));
    btnVector.preferredSize = [110, 25];
    var btnClose = actionGrp.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [94, 25];

    // --- 3. Interactive Game Canvas ---
    var gameCanvas = win.add("group");
    gameCanvas.preferredSize = [CANVAS_W, CANVAS_H];
    gameCanvas.minimumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.maximumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.onDraw = function () {
        drawBoulderDashScene(this.graphics);
    };

    // --- 4. Bottom Arcade Control Pad ---
    var bottomBar = win.add("group");
    bottomBar.orientation = "row";
    bottomBar.alignChildren = ["fill", "center"];
    bottomBar.preferredSize = [CANVAS_W, 28];
    bottomBar.spacing = 4;

    var btnLeft = bottomBar.add("button", undefined, "◄ A");
    btnLeft.preferredSize = [62, 26];
    var btnUp = bottomBar.add("button", undefined, "▲ W");
    btnUp.preferredSize = [62, 26];
    var btnDown = bottomBar.add("button", undefined, "▼ S");
    btnDown.preferredSize = [62, 26];
    var btnRight = bottomBar.add("button", undefined, "► D");
    btnRight.preferredSize = [62, 26];
    var btnPause = bottomBar.add("button", undefined, tr("btnPause"));
    btnPause.preferredSize = [152, 26];

    // --- 5. Status Footer ---
    var statusLbl = win.add("statictext", undefined, tr(statusKey, statusArgs));
    statusLbl.preferredSize = [CANVAS_W, 20];

    // ==================== THEME & UI REFRESH ====================

    function applyThemeColors() {
        var bgRgb = darkTheme ? PALETTE.winBgDark : PALETTE.winBgLight;
        var fgRgb = darkTheme ? [235, 226, 216] : [74, 66, 58];

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
        btnCave.text = tr("btnCave", [caveIndex + 1]);
    }

    function applyLocalization() {
        hintLbl.text = tr("controlsHint");
        btnRetry.text = tr("btnRetry");
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
        if (now - lastStepTime >= 155) {
            lastStepTime = now;
            if (stepCavePhysics()) {
                refreshUI();
            }
        }
    }

    // ==================== EVENT HANDLERS ====================

    win.addEventListener("mousemove", checkAutoStep);
    gameCanvas.addEventListener("mousemove", checkAutoStep);

    // Click on cave moves Rockford one step toward clicked tile
    gameCanvas.addEventListener("mousedown", function (ev) {
        if (ev.clientY < PLAY_Y) return;
        var px = PAD + player.x * CELL + CELL / 2;
        var py = PLAY_Y + PAD + player.y * CELL + CELL / 2;
        var dx = ev.clientX - px;
        var dy = ev.clientY - py;

        if (Math.abs(dx) > Math.abs(dy)) {
            movePlayer(dx >= 0 ? 1 : -1, 0, false);
        } else {
            movePlayer(0, dy >= 0 ? 1 : -1, false);
        }
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

    btnRetry.onClick = function () {
        if (gameOver) {
            startNewGame();
        } else {
            loadCave(caveIndex);
        }
        refreshUI();
        refocusControl();
    };

    btnCave.onClick = function () {
        loadCave((caveIndex + 1) % CAVES.length);
        saveSettings();
        refreshUI();
        refocusControl();
    };

    btnVector.onClick = function () {
        exportBoulderDashToArtboard();
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
        } else if (!player.alive) {
            loadCave(caveIndex);
        } else {
            paused = !paused;
            setStatus(paused ? "statusPaused" : "statusPlaying", [caveIndex + 1, gemsCollected, gemsNeeded]);
        }
        refreshUI();
        refocusControl();
    };

    btnUp.onClick = function () {
        movePlayer(0, -1, false);
        refreshUI();
        refocusControl();
    };

    btnDown.onClick = function () {
        movePlayer(0, 1, false);
        refreshUI();
        refocusControl();
    };

    btnLeft.onClick = function () {
        movePlayer(-1, 0, false);
        refreshUI();
        refocusControl();
    };

    btnRight.onClick = function () {
        movePlayer(1, 0, false);
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
        if (now - lastKeyTime < 45) return;
        lastKeyTime = now;

        var snapMode = Boolean(ev.shiftKey);

        if (k === "UP" || k === "W") {
            ev.preventDefault();
            movePlayer(0, -1, snapMode);
            refreshUI();
        } else if (k === "DOWN" || k === "S") {
            ev.preventDefault();
            movePlayer(0, 1, snapMode);
            refreshUI();
        } else if (k === "LEFT" || k === "A") {
            ev.preventDefault();
            movePlayer(-1, 0, snapMode);
            refreshUI();
        } else if (k === "RIGHT" || k === "D") {
            ev.preventDefault();
            movePlayer(1, 0, snapMode);
            refreshUI();
        } else if (k === "R") {
            ev.preventDefault();
            loadCave(caveIndex);
            refreshUI();
        } else if (k === "C") {
            ev.preventDefault();
            loadCave((caveIndex + 1) % CAVES.length);
            saveSettings();
            refreshUI();
        } else if (k === "N") {
            ev.preventDefault();
            startNewGame();
            refreshUI();
        } else if (k === "SPACE" || k === "P") {
            ev.preventDefault();
            if (gameOver) {
                startNewGame();
            } else if (!player.alive) {
                loadCave(caveIndex);
            } else {
                paused = !paused;
                setStatus(paused ? "statusPaused" : "statusPlaying", [caveIndex + 1, gemsCollected, gemsNeeded]);
            }
            refreshUI();
        }
        refocusControl();
    }

    var focusTargets = [
        win, btnLeft, btnUp, btnDown, btnRight, btnPause,
        btnRetry, btnCave, btnVector, btnTheme, btnClose, langDropdown
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

    perfInit({ token: "BoulderDash", canvases: 1, canvasW: CANVAS_W, canvasH: CANVAS_H, tickMs: HB.tickMs, theme: darkTheme ? "dark" : "light", lang: currentLang });
    applyThemeColors();
    win.center();
    win.show();
    heartbeatStop();
})();
