#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"

(function () {
    var WIN_TITLE = "Battle City - Designer Edition";
    var SAVE_TOKEN = "BattleCity";

    // 26x26 mini-tiles (13x13 macro blocks of 2x2) for classic half-block brick destruction
    var COLS = 26;
    var ROWS = 26;
    var CELL = 20;

    var PAD_X = 16;
    var PAD_TOP = 10;
    var HUD_H = 66;
    var GAP_HUD = 8;
    var PAD_BOT = 10;

    var BOARD_X = PAD_X;
    var BOARD_Y = PAD_TOP + HUD_H + GAP_HUD;
    var BOARD_W = COLS * CELL;
    var BOARD_H = ROWS * CELL;

    var CANVAS_W = PAD_X * 2 + BOARD_W;
    var CANVAS_H = BOARD_Y + BOARD_H + PAD_BOT;

    var TILE_EMPTY = 0;
    var TILE_BRICK = 1;
    var TILE_STEEL = 2;
    var TILE_WATER = 3;
    var TILE_TREES = 4;
    var TILE_ICE = 5;
    var TILE_EAGLE = 6;

    var TANK_HALF = 0.88;
    var BULLET_RADIUS = 0.24;
    var MAX_ACTIVE_ENEMIES = 4;
    var ENEMIES_PER_STAGE = 20;
    var SPAWN_DELAY_SEC = 2.6;
    var SPAWN_FLASH_SEC = 0.75;
    var POWERUP_LIFE_SEC = 14.0;
    var SHOVEL_SEC = 15.0;
    var FREEZE_SEC = 9.0;
    var HELMET_SEC = 10.0;

    var DIRS = {
        up:    { dx:  0, dy: -1 },
        down:  { dx:  0, dy:  1 },
        left:  { dx: -1, dy:  0 },
        right: { dx:  1, dy:  0 }
    };
    var DIR_LIST = ["up", "down", "left", "right"];

    // 13x13 macro blueprints: .=empty, #=brick, H=steel, ~=water, %=trees, ==ice, B=base slot
    var STAGES = [
        [
            ".............",
            ".#.#.#.#.#.#.",
            ".#.#.#.#.#.#.",
            ".#.#.#H#.#.#.",
            ".#.#.....#.#.",
            ".%..#.#.#..%.",
            "#..##...##..#",
            ".#.#.#.#.#.#.",
            ".#.#.#.#.#.#.",
            ".#.#.....#.#.",
            ".#.#..#..#.#.",
            ".....#B#.....",
            ".....#B#....."
        ],
        [
            "...H.....H...",
            ".#.#..H..#.#.",
            ".#...###...#.",
            ".H.#.%H%.#.H.",
            "...#.#.#.#...",
            ".~~~.....~~~.",
            ".%...#H#...%.",
            ".#.#.#.#.#.#.",
            ".#.#.....#.#.",
            "...#.###.#...",
            ".#.#.....#.#.",
            ".....#B#.....",
            ".....#B#....."
        ],
        [
            ".............",
            ".%#..###..#%.",
            ".%#.#...#.#%.",
            "..#...H...#..",
            ".H.##.#.##.H.",
            "===...#...===",
            ".#..~~.~~..#.",
            ".#..#%#%#..#.",
            ".#.........#.",
            ".###..H..###.",
            "...#.....#...",
            ".....#B#.....",
            ".....#B#....."
        ],
        [
            "..#.......#..",
            ".#.#.###.#.#.",
            ".#..H...H..#.",
            "...#.###.#...",
            "~~.#.% %.#.~~",
            "~~...#H#...~~",
            "===..###..===",
            ".#.#.....#.#.",
            ".#...#.#...#.",
            ".H.#.#.#.#.H.",
            "...#.....#...",
            ".....#B#.....",
            ".....#B#....."
        ],
        [
            ".H.........H.",
            ".#.###.###.#.",
            "...#.H.H.#...",
            ".%#.......#%.",
            ".%..~~H~~..%.",
            ".#..#...#..#.",
            ".#..#.H.#..#.",
            "===.......===",
            ".#.###.###.#.",
            "...#.....#...",
            ".H.#..#..#.H.",
            ".....#B#.....",
            ".....#B#....."
        ],
        [
            ".............",
            ".##.#####.##.",
            ".#..%...%..#.",
            ".H.#..H..#.H.",
            "...#.#.#.#...",
            ".~~==...==~~.",
            ".%..##.##..%.",
            ".#..#...#..#.",
            ".#.#..H..#.#.",
            ".#...###...#.",
            "...#.....#...",
            ".....#B#.....",
            ".....#B#....."
        ],
        [
            "...#..H..#...",
            ".#...###...#.",
            ".#.H..%..H.#.",
            "...#.###.#...",
            ".~~~..#..~~~.",
            ".%...#.#...%.",
            ".#.H.....H.#.",
            "===.##.##.===",
            ".#.#.....#.#.",
            ".#..#.#.#..#.",
            "...#.....#...",
            ".....#B#.....",
            ".....#B#....."
        ],
        [
            ".#...HHH...#.",
            ".#.#.....#.#.",
            "...#.#.#.#...",
            ".H..%###%..H.",
            ".~~.......~~.",
            ".#..#H.H#..#.",
            ".#..#...#..#.",
            "===.%###%.===",
            ".#.#.....#.#.",
            ".#..##.##..#.",
            ".H.........H.",
            ".....#B#.....",
            ".....#B#....."
        ]
    ];

    var LANG_ORDER = ["en", "ru", "cs", "ro", "hi"];
    var LANG_NAMES = {
        en: "English",
        ru: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
        cs: "\u010Ce\u0161tina",
        ro: "Rom\u00E2n\u0103",
        hi: "\u0939\u093F\u0928\u094D\u0926\u0940"
    };

    var I18N = {
        en: {
            winTitle: "Battle City - Designer Edition",
            btnNew: "New Game",
            btnPause: "Pause",
            btnResume: "Resume",
            btnExport: "\u2756 To Artboard",
            btnThemeDark: "Theme: Dark",
            btnThemeLight: "Theme: Light",
            btnClose: "Close (Esc)",
            hint: "Arrows/WASD: drive  |  Space/E: fire  |  P: pause  |  R: restart",
            statusReady: "Defend the Eagle HQ and destroy all 20 enemy tanks!",
            statusPlay: "Watch the flanks! Red flashing tanks drop powerups.",
            statusHitTank: "Enemy tank destroyed! +{0} pts ({1} left).",
            statusBonusStar: "Star upgrade! Rank {0}/3 (+500).",
            statusBonusHelmet: "Shield helmet! Temporary armor (+500).",
            statusBonusClock: "Clock! Enemy tanks frozen (+500).",
            statusBonusShovel: "Shovel! HQ reinforced with steel (+500).",
            statusBonusGrenade: "Grenade! All active foes eliminated (+500).",
            statusBonusLife: "Extra tank! +1 life (+500).",
            statusPaused: "Game paused. Press P or Resume to continue.",
            statusLostLife: "Tank destroyed! Lives left: {0}",
            statusLostBase: "HQ Eagle destroyed! Game over.",
            statusStageClear: "Stage {0} cleared! +{1} bonus pts.",
            statusGameOver: "Game over! Score: {0} (Stage {1}).",
            statusNoDoc: "Open an Illustrator document first to export vectors.",
            statusExported: "Exported Battle City board to layer \"{0}\".",
            statusExportErr: "Vector export failed: {0}",
            statusNoHeartbeat: "Heartbeat unavailable - move mouse over canvas."
        },
        ru: {
            winTitle: "Battle City - \u0414\u0438\u0437\u0430\u0439\u043D\u0435\u0440\u0441\u043A\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F",
            btnNew: "\u041D\u043E\u0432\u0430\u044F \u0438\u0433\u0440\u0430",
            btnPause: "\u041F\u0430\u0443\u0437\u0430",
            btnResume: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
            btnExport: "\u2756 \u041D\u0430 \u0430\u0440\u0442\u0431\u043E\u0440\u0434",
            btnThemeDark: "\u0422\u0435\u043C\u0430: \u0422\u0451\u043C\u043D\u0430\u044F",
            btnThemeLight: "\u0422\u0435\u043C\u0430: \u0421\u0432\u0435\u0442\u043B\u0430\u044F",
            btnClose: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C (Esc)",
            hint: "\u0421\u0442\u0440\u0435\u043B\u043A\u0438/WASD: \u0445\u043E\u0434  |  Space/E: \u043E\u0433\u043E\u043D\u044C  |  P: \u043F\u0430\u0443\u0437\u0430  |  R: \u0440\u0435\u0441\u0442\u0430\u0440\u0442",
            statusReady: "\u0417\u0430\u0449\u0438\u0442\u0438\u0442\u0435 \u0448\u0442\u0430\u0431-\u043E\u0440\u043B\u0430 \u0438 \u0443\u043D\u0438\u0447\u0442\u043E\u0436\u044C\u0442\u0435 20 \u0432\u0440\u0430\u0436\u0435\u0441\u043A\u0438\u0445 \u0442\u0430\u043D\u043A\u043E\u0432!",
            statusPlay: "\u0411\u0435\u0440\u0435\u0433\u0438\u0442\u0435 \u0444\u043B\u0430\u043D\u0433\u0438! \u041C\u0438\u0433\u0430\u044E\u0449\u0438\u0435 \u0442\u0430\u043D\u043A\u0438 \u0434\u0430\u044E\u0442 \u0431\u043E\u043D\u0443\u0441\u044B.",
            statusHitTank: "\u0422\u0430\u043D\u043A \u043F\u043E\u0434\u0431\u0438\u0442! +{0} \u043E\u0447\u043A\u043E\u0432 (\u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C {1}).",
            statusBonusStar: "\u0417\u0432\u0435\u0437\u0434\u0430! \u0420\u0430\u043D\u0433 \u0442\u0430\u043D\u043A\u0430 {0}/3 (+500).",
            statusBonusHelmet: "\u041A\u0430\u0441\u043A\u0430! \u0412\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F \u0431\u0440\u043E\u043D\u044F (+500).",
            statusBonusClock: "\u0427\u0430\u0441\u044B! \u0412\u0440\u0430\u0433\u0438 \u0437\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D\u044B (+500).",
            statusBonusShovel: "\u041B\u043E\u043F\u0430\u0442\u0430! \u0428\u0442\u0430\u0431 \u0443\u043A\u0440\u0435\u043F\u043B\u0451\u043D \u0431\u0435\u0442\u043E\u043D\u043E\u043C (+500).",
            statusBonusGrenade: "\u0413\u0440\u0430\u043D\u0430\u0442\u0430! \u0412\u0441\u0435 \u0432\u0440\u0430\u0433\u0438 \u043D\u0430 \u043F\u043E\u043B\u0435 \u0443\u043D\u0438\u0447\u0442\u043E\u0436\u0435\u043D\u044B (+500).",
            statusBonusLife: "\u0422\u0430\u043D\u043A! +1 \u0436\u0438\u0437\u043D\u044C (+500).",
            statusPaused: "\u041F\u0430\u0443\u0437\u0430. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 P \u0438\u043B\u0438 \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C.",
            statusLostLife: "\u0422\u0430\u043D\u043A \u043F\u043E\u0434\u0431\u0438\u0442! \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0436\u0438\u0437\u043D\u0435\u0439: {0}",
            statusLostBase: "\u0428\u0442\u0430\u0431 \u0440\u0430\u0437\u0440\u0443\u0448\u0435\u043D! \u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430.",
            statusStageClear: "\u042D\u0442\u0430\u043F {0} \u043F\u0440\u043E\u0439\u0434\u0435\u043D! +{1} \u0431\u043E\u043D\u0443\u0441.",
            statusGameOver: "\u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430! \u0421\u0447\u0451\u0442: {0} (\u042D\u0442\u0430\u043F {1}).",
            statusNoDoc: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 Illustrator.",
            statusExported: "\u041F\u043E\u043B\u0435 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u043D\u0430 \u0441\u043B\u043E\u0439 \"{0}\".",
            statusExportErr: "\u041E\u0448\u0438\u0431\u043A\u0430 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430: {0}",
            statusNoHeartbeat: "Heartbeat \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D - \u0434\u0432\u0438\u0433\u0430\u0439\u0442\u0435 \u043C\u044B\u0448\u044C\u044E \u043F\u043E \u043F\u043E\u043B\u044E."
        },
        cs: {
            winTitle: "Battle City - Design\u00E9rsk\u00E1 edice",
            btnNew: "Nov\u00E1 hra",
            btnPause: "Pauza",
            btnResume: "Pokra\u010Dovat",
            btnExport: "\u2756 Na pl\u00E1tno",
            btnThemeDark: "Motiv: Tmav\u00FD",
            btnThemeLight: "Motiv: Sv\u011Btl\u00FD",
            btnClose: "Zav\u0159\u00EDt (Esc)",
            hint: "\u0160ipky/WASD: j\u00EDzda  |  Space/E: palba  |  P: pauza  |  R: restart",
            statusReady: "Bra\u0148te z\u00E1kladnu a zni\u010Dte v\u0161ech 20 nep\u0159\u00E1tel!",
            statusPlay: "Chra\u0148te k\u0159\u00EDdla! Blikaj\u00EDc\u00ED tanky shazuj\u00ED bonusy.",
            statusHitTank: "Tank zni\u010Den! +{0} b. (zb\u00FDv\u00E1 {1}).",
            statusBonusStar: "Hv\u011Bzda! \u00DArove\u0148 tanku {0}/3 (+500).",
            statusBonusHelmet: "Helma! Do\u010Dasn\u00FD \u0161t\u00EDt (+500).",
            statusBonusClock: "Hodiny! Nep\u0159\u00E1tel\u00E9 zmrazeni (+500).",
            statusBonusShovel: "Lopata! Z\u00E1kladna v oceli (+500).",
            statusBonusGrenade: "Gran\u00E1t! V\u0161ichni viditeln\u00ED nep\u0159\u00E1tel\u00E9 zni\u010Deni (+500).",
            statusBonusLife: "Extra tank! +1 \u017Eivot (+500).",
            statusPaused: "Pozastaveno. Stiskn\u011Bte P nebo Pokra\u010Dovat.",
            statusLostLife: "Tank zni\u010Den! Zb\u00FDvaj\u00EDc\u00ED \u017Eivoty: {0}",
            statusLostBase: "Z\u00E1kladna zni\u010Dena! Konec hry.",
            statusStageClear: "Kolo {0} dokon\u010Deno! +{1} bonus.",
            statusGameOver: "Konec hry! Sk\u00F3re: {0} (Kolo {1}).",
            statusNoDoc: "Nejprve otev\u0159ete dokument Illustratoru.",
            statusExported: "Exportov\u00E1no do vrstvy \"{0}\".",
            statusExportErr: "Chyba exportu: {0}",
            statusNoHeartbeat: "Heartbeat nedostupn\u00FD - pohybujte my\u0161\u00ED nad pl\u00E1tnem."
        },
        ro: {
            winTitle: "Battle City - Edi\u021Bie Designer",
            btnNew: "Joc nou",
            btnPause: "Pauz\u0103",
            btnResume: "Continu\u0103",
            btnExport: "\u2756 Pe plan\u0219\u0103",
            btnThemeDark: "Tem\u0103: \u00CEntunecat",
            btnThemeLight: "Tem\u0103: Luminos",
            btnClose: "\u00CEnchide (Esc)",
            hint: "S\u0103ge\u021Bi/WASD: condus  |  Space/E: foc  |  P: pauz\u0103  |  R: restart",
            statusReady: "Ap\u0103r\u0103 baza \u0219i distruge toate cele 20 tancuri!",
            statusPlay: "P\u0103ze\u0219te flancurile! Tancurile ro\u0219ii las\u0103 bonusuri.",
            statusHitTank: "Tanc distrus! +{0} pct (r\u0103mase {1}).",
            statusBonusStar: "Stea! Nivel tanc {0}/3 (+500).",
            statusBonusHelmet: "Casc\u0103! Scut temporar (+500).",
            statusBonusClock: "Ceas! Inamici \u00EEnghe\u021Ba\u021Bi (+500).",
            statusBonusShovel: "Lopat\u0103! Baza blindat\u0103 \u00EEn o\u021Bel (+500).",
            statusBonusGrenade: "Grenad\u0103! Inamicii activi distru\u0219i (+500).",
            statusBonusLife: "Tanc extra! +1 via\u021B\u0103 (+500).",
            statusPaused: "Joc \u00EEn pauz\u0103. Apas\u0103 P pentru a continua.",
            statusLostLife: "Tanc distrus! Vie\u021Bi r\u0103mase: {0}",
            statusLostBase: "Baza a fost distrus\u0103! Joc terminat.",
            statusStageClear: "Etapa {0} complet\u0103! +{1} bonus.",
            statusGameOver: "Joc terminat! Scor: {0} (Etapa {1}).",
            statusNoDoc: "Deschide mai \u00EEnt\u00E2i un document Illustrator.",
            statusExported: "Exportat \u00EEn stratul \"{0}\".",
            statusExportErr: "Eroare export: {0}",
            statusNoHeartbeat: "Heartbeat indisponibil - mi\u0219c\u0103 mouse-ul peste plan\u0219\u0103."
        },
        hi: {
            winTitle: "Battle City - \u0921\u093F\u091C\u093C\u093E\u0907\u0928\u0930 \u0938\u0902\u0938\u094D\u0915\u0930\u0923",
            btnNew: "\u0928\u092F\u093E \u0916\u0947\u0932",
            btnPause: "\u0930\u094B\u0915\u0947\u0902",
            btnResume: "\u091C\u093E\u0930\u0940 \u0930\u0916\u0947\u0902",
            btnExport: "\u2756 \u0906\u0930\u094D\u091F\u092C\u094B\u0930\u094D\u0921",
            btnThemeDark: "\u0925\u0940\u092E: \u0921\u093E\u0930\u094D\u0915",
            btnThemeLight: "\u0925\u0940\u092E: \u0932\u093E\u0907\u091F",
            btnClose: "\u092C\u0902\u0926 (Esc)",
            hint: "Arrows/WASD: \u091A\u0932\u0947\u0902  |  Space/E: \u092B\u093E\u092F\u0930  |  P: \u0930\u094B\u0915\u0947\u0902  |  R: \u0930\u0940\u0938\u094D\u091F\u093E\u0930\u094D\u091F",
            statusReady: "\u092C\u0947\u0938 \u0915\u0940 \u0930\u0915\u094D\u0937\u093E \u0915\u0930\u0947\u0902 \u0914\u0930 \u0938\u092D\u0940 20 \u091F\u0948\u0902\u0915 \u0928\u0937\u094D\u091F \u0915\u0930\u0947\u0902!",
            statusPlay: "\u091A\u092E\u0915\u0924\u0947 \u0932\u093E\u0932 \u091F\u0948\u0902\u0915 \u092A\u093E\u0935\u0930\u0905\u092A \u0926\u0947\u0924\u0947 \u0939\u0948\u0902\u0964",
            statusHitTank: "\u0926\u0941\u0936\u094D\u092E\u0928 \u091F\u0948\u0902\u0915 \u0928\u0937\u094D\u091F! +{0} \u0905\u0902\u0915 (\u0936\u0947\u0937 {1}).",
            statusBonusStar: "\u0938\u094D\u091F\u093E\u0930 \u0905\u092A\u0917\u094D\u0930\u0947\u0921! \u0930\u0948\u0902\u0915 {0}/3 (+500).",
            statusBonusHelmet: "\u0939\u0947\u0932\u092E\u0947\u091F! \u0905\u0938\u094D\u0925\u093E\u092F\u0940 \u0915\u0935\u091A (+500).",
            statusBonusClock: "\u0918\u0921\u093C\u0940! \u0926\u0941\u0936\u094D\u092E\u0928 \u0930\u0941\u0915 \u0917\u090F (+500).",
            statusBonusShovel: "\u092B\u093E\u0935\u0921\u093C\u093E! \u092C\u0947\u0938 \u0938\u094D\u091F\u0940\u0932 \u0938\u0947 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 (+500).",
            statusBonusGrenade: "\u0917\u094D\u0930\u0947\u0928\u0947\u0921! \u0938\u092D\u0940 \u0938\u0915\u094D\u0930\u093F\u092F \u0926\u0941\u0936\u094D\u092E\u0928 \u0928\u0937\u094D\u091F (+500).",
            statusBonusLife: "\u090F\u0915\u094D\u0938\u091F\u094D\u0930\u093E \u091F\u0948\u0902\u0915! +1 \u091C\u0940\u0935\u0928 (+500).",
            statusPaused: "\u0916\u0947\u0932 \u0930\u0941\u0915\u093E \u0939\u0948\u0964 \u091C\u093E\u0930\u0940 \u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F P \u0926\u092C\u093E\u090F\u0902.",
            statusLostLife: "\u091F\u0948\u0902\u0915 \u0928\u0937\u094D\u091F! \u0936\u0947\u0937 \u091C\u0940\u0935\u0928: {0}",
            statusLostBase: "\u092C\u0947\u0938 \u0928\u0937\u094D\u091F \u0939\u094B \u0917\u092F\u093E! \u0916\u0947\u0932 \u0938\u092E\u093E\u092A\u094D\u0924.",
            statusStageClear: "\u091A\u0930\u0923 {0} \u092A\u0942\u0930\u093E! +{1} \u092C\u094B\u0928\u0938.",
            statusGameOver: "\u0916\u0947\u0932 \u0938\u092E\u093E\u092A\u094D\u0924! \u0938\u094D\u0915\u094B\u0930: {0} (\u091A\u0930\u0923 {1}).",
            statusNoDoc: "\u092A\u0939\u0932\u0947 Illustrator \u0926\u0938\u094D\u0924\u093E\u0935\u0947\u091C\u093C \u0916\u094B\u0932\u0947\u0902.",
            statusExported: "\u0932\u0947\u092F\u0930 \"{0}\" \u092E\u0947\u0902 \u090F\u0915\u094D\u0938\u092A\u094B\u0930\u094D\u091F \u0939\u0941\u0906.",
            statusExportErr: "\u090F\u0915\u094D\u0938\u092A\u094B\u0930\u094D\u091F \u0924\u094D\u0930\u0941\u091F\u093F: {0}",
            statusNoHeartbeat: "Heartbeat \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 - \u092E\u093E\u0909\u0938 \u0915\u0948\u0928\u0935\u093E\u0938 \u092A\u0930 \u091A\u0932\u093E\u090F\u0902."
        }
    };

    var THEMES = {
        dark: {
            bg: [17, 20, 27],
            hudBg: [26, 31, 43],
            hudStroke: [52, 63, 84],
            ground: [15, 18, 24],
            groundGrid: [24, 29, 39],
            boardStroke: [71, 85, 105],
            brick: [180, 83, 45],
            brickHi: [212, 106, 62],
            brickMortar: [92, 40, 22],
            steel: [148, 163, 184],
            steelHi: [226, 232, 240],
            steelEdge: [71, 85, 105],
            water: [29, 78, 216],
            waterWave: [96, 165, 250],
            trees: [22, 163, 74],
            treesHi: [74, 222, 128],
            ice: [125, 211, 252],
            iceLine: [224, 242, 254],
            eagleBg: [30, 41, 59],
            eagleGold: [250, 204, 21],
            eagleDead: [127, 29, 29],
            playerBody: [245, 158, 11],
            playerHi: [253, 224, 71],
            playerTrack: [120, 53, 15],
            playerShield: [56, 189, 248],
            foeBasic: [148, 163, 184],
            foeFast: [56, 189, 248],
            foeRapid: [52, 211, 153],
            foeHeavy4: [168, 85, 247],
            foeHeavy3: [99, 102, 241],
            foeHeavy2: [245, 158, 11],
            foeHeavy1: [239, 68, 68],
            foeBonus: [244, 63, 94],
            bulletPlayer: [253, 224, 71],
            bulletFoe: [248, 250, 252],
            blastOuter: [249, 115, 22],
            blastCore: [254, 249, 195],
            spawnStar: [56, 189, 248],
            bonusBg: [15, 23, 42],
            bonusBorder: [250, 204, 21],
            accScore: [250, 204, 21],
            accStage: [52, 211, 153],
            accFoes: [56, 189, 248],
            accLives: [244, 63, 94],
            barTrack: [42, 51, 70],
            overlayBg: [15, 20, 30],
            textMain: [241, 245, 249],
            textSub: [156, 169, 190],
            hitFlash: [244, 63, 94]
        },
        light: {
            bg: [235, 240, 246],
            hudBg: [255, 255, 255],
            hudStroke: [203, 213, 225],
            ground: [228, 232, 236],
            groundGrid: [214, 220, 226],
            boardStroke: [100, 116, 139],
            brick: [194, 65, 12],
            brickHi: [234, 88, 12],
            brickMortar: [124, 45, 18],
            steel: [148, 163, 184],
            steelHi: [241, 245, 249],
            steelEdge: [71, 85, 105],
            water: [37, 99, 235],
            waterWave: [147, 197, 253],
            trees: [21, 128, 61],
            treesHi: [74, 222, 128],
            ice: [186, 230, 253],
            iceLine: [255, 255, 255],
            eagleBg: [51, 65, 85],
            eagleGold: [245, 158, 11],
            eagleDead: [185, 28, 28],
            playerBody: [217, 119, 6],
            playerHi: [250, 204, 21],
            playerTrack: [120, 53, 15],
            playerShield: [2, 132, 199],
            foeBasic: [100, 116, 139],
            foeFast: [2, 132, 199],
            foeRapid: [5, 150, 105],
            foeHeavy4: [124, 58, 237],
            foeHeavy3: [79, 70, 229],
            foeHeavy2: [217, 119, 6],
            foeHeavy1: [220, 38, 38],
            foeBonus: [225, 29, 72],
            bulletPlayer: [180, 83, 9],
            bulletFoe: [15, 23, 42],
            blastOuter: [234, 88, 12],
            blastCore: [254, 240, 138],
            spawnStar: [2, 132, 199],
            bonusBg: [255, 255, 255],
            bonusBorder: [217, 119, 6],
            accScore: [180, 83, 9],
            accStage: [5, 150, 105],
            accFoes: [2, 132, 199],
            accLives: [225, 29, 72],
            barTrack: [226, 232, 240],
            overlayBg: [255, 255, 255],
            textMain: [15, 23, 42],
            textSub: [71, 85, 105],
            hitFlash: [225, 29, 72]
        }
    };

    var GLYPHS = {
        "0": [[0.15, 0.05, 0.85, 0.05, 0.85, 0.95, 0.15, 0.95, 0.15, 0.05], [0.2, 0.8, 0.8, 0.2]],
        "1": [[0.28, 0.22, 0.54, 0.05, 0.54, 0.95], [0.22, 0.95, 0.82, 0.95]],
        "2": [[0.15, 0.22, 0.35, 0.05, 0.72, 0.05, 0.85, 0.22, 0.85, 0.42, 0.15, 0.95, 0.85, 0.95]],
        "3": [[0.15, 0.15, 0.35, 0.05, 0.75, 0.05, 0.85, 0.22, 0.85, 0.38, 0.65, 0.48, 0.42, 0.48], [0.65, 0.48, 0.85, 0.60, 0.85, 0.82, 0.72, 0.95, 0.32, 0.95, 0.15, 0.82]],
        "4": [[0.72, 0.95, 0.72, 0.05, 0.15, 0.64, 0.88, 0.64]],
        "5": [[0.82, 0.05, 0.20, 0.05, 0.18, 0.46, 0.72, 0.46, 0.85, 0.60, 0.85, 0.82, 0.70, 0.95, 0.25, 0.95, 0.15, 0.82]],
        "6": [[0.78, 0.12, 0.60, 0.05, 0.30, 0.05, 0.15, 0.28, 0.15, 0.82, 0.30, 0.95, 0.72, 0.95, 0.85, 0.80, 0.85, 0.58, 0.70, 0.48, 0.15, 0.48]],
        "7": [[0.15, 0.05, 0.85, 0.05, 0.38, 0.95]],
        "8": [[0.30, 0.48, 0.18, 0.36, 0.18, 0.18, 0.32, 0.05, 0.68, 0.05, 0.82, 0.18, 0.82, 0.36, 0.70, 0.48, 0.30, 0.48, 0.15, 0.60, 0.15, 0.82, 0.30, 0.95, 0.70, 0.95, 0.85, 0.82, 0.85, 0.60, 0.70, 0.48]],
        "9": [[0.85, 0.48, 0.28, 0.48, 0.15, 0.35, 0.15, 0.18, 0.28, 0.05, 0.70, 0.05, 0.85, 0.20, 0.85, 0.78, 0.68, 0.95, 0.25, 0.95]],
        "A": [[0.12, 0.95, 0.50, 0.05, 0.88, 0.95], [0.24, 0.64, 0.76, 0.64]],
        "B": [[0.18, 0.95, 0.18, 0.05, 0.68, 0.05, 0.82, 0.18, 0.82, 0.36, 0.68, 0.48, 0.18, 0.48], [0.68, 0.48, 0.85, 0.60, 0.85, 0.82, 0.68, 0.95, 0.18, 0.95]],
        "C": [[0.85, 0.20, 0.68, 0.05, 0.32, 0.05, 0.15, 0.22, 0.15, 0.78, 0.32, 0.95, 0.68, 0.95, 0.85, 0.80]],
        "D": [[0.18, 0.95, 0.18, 0.05, 0.62, 0.05, 0.85, 0.25, 0.85, 0.75, 0.62, 0.95, 0.18, 0.95]],
        "E": [[0.82, 0.05, 0.18, 0.05, 0.18, 0.95, 0.82, 0.95], [0.18, 0.48, 0.68, 0.48]],
        "F": [[0.82, 0.05, 0.18, 0.05, 0.18, 0.95], [0.18, 0.48, 0.66, 0.48]],
        "G": [[0.82, 0.18, 0.66, 0.05, 0.30, 0.05, 0.15, 0.22, 0.15, 0.78, 0.30, 0.95, 0.72, 0.95, 0.85, 0.78, 0.85, 0.52, 0.54, 0.52]],
        "H": [[0.18, 0.05, 0.18, 0.95], [0.82, 0.05, 0.82, 0.95], [0.18, 0.48, 0.82, 0.48]],
        "I": [[0.25, 0.05, 0.75, 0.05], [0.50, 0.05, 0.50, 0.95], [0.25, 0.95, 0.75, 0.95]],
        "J": [[0.75, 0.05, 0.75, 0.78, 0.58, 0.95, 0.30, 0.95, 0.16, 0.80]],
        "K": [[0.18, 0.05, 0.18, 0.95], [0.82, 0.05, 0.18, 0.52, 0.84, 0.95]],
        "L": [[0.20, 0.05, 0.20, 0.95, 0.82, 0.95]],
        "M": [[0.14, 0.95, 0.14, 0.05, 0.50, 0.58, 0.86, 0.05, 0.86, 0.95]],
        "N": [[0.18, 0.95, 0.18, 0.05, 0.82, 0.95, 0.82, 0.05]],
        "O": [[0.30, 0.05, 0.70, 0.05, 0.85, 0.22, 0.85, 0.78, 0.70, 0.95, 0.30, 0.95, 0.15, 0.78, 0.15, 0.22, 0.30, 0.05]],
        "P": [[0.18, 0.95, 0.18, 0.05, 0.68, 0.05, 0.84, 0.18, 0.84, 0.38, 0.68, 0.50, 0.18, 0.50]],
        "Q": [[0.30, 0.05, 0.70, 0.05, 0.85, 0.22, 0.85, 0.78, 0.70, 0.95, 0.30, 0.95, 0.15, 0.78, 0.15, 0.22, 0.30, 0.05], [0.56, 0.64, 0.88, 0.98]],
        "R": [[0.18, 0.95, 0.18, 0.05, 0.68, 0.05, 0.84, 0.18, 0.84, 0.38, 0.68, 0.50, 0.18, 0.50], [0.54, 0.50, 0.86, 0.95]],
        "S": [[0.82, 0.16, 0.66, 0.05, 0.30, 0.05, 0.16, 0.20, 0.16, 0.38, 0.34, 0.48, 0.68, 0.52, 0.84, 0.64, 0.84, 0.82, 0.68, 0.95, 0.28, 0.95, 0.14, 0.82]],
        "T": [[0.10, 0.05, 0.90, 0.05], [0.50, 0.05, 0.50, 0.95]],
        "U": [[0.18, 0.05, 0.18, 0.78, 0.34, 0.95, 0.66, 0.95, 0.82, 0.78, 0.82, 0.05]],
        "V": [[0.15, 0.05, 0.50, 0.95, 0.85, 0.05]],
        "W": [[0.12, 0.05, 0.30, 0.95, 0.50, 0.42, 0.70, 0.95, 0.88, 0.05]],
        "X": [[0.16, 0.05, 0.84, 0.95], [0.84, 0.05, 0.16, 0.95]],
        "Y": [[0.16, 0.05, 0.50, 0.50, 0.84, 0.05], [0.50, 0.50, 0.50, 0.95]],
        "Z": [[0.16, 0.05, 0.84, 0.05, 0.16, 0.95, 0.84, 0.95]],
        "*": [[0.50, 0.12, 0.50, 0.88], [0.16, 0.32, 0.84, 0.68], [0.84, 0.32, 0.16, 0.68]],
        "/": [[0.20, 0.95, 0.80, 0.05]],
        "-": [[0.22, 0.50, 0.78, 0.50]],
        "+": [[0.50, 0.22, 0.50, 0.78], [0.22, 0.50, 0.78, 0.50]],
        "!": [[0.50, 0.05, 0.50, 0.68], [0.50, 0.84, 0.50, 0.95]],
        ":": [[0.46, 0.26, 0.54, 0.26, 0.54, 0.34, 0.46, 0.34, 0.46, 0.26], [0.46, 0.70, 0.54, 0.70, 0.54, 0.78, 0.46, 0.78, 0.46, 0.70]],
        ".": [[0.44, 0.84, 0.56, 0.84, 0.56, 0.95, 0.44, 0.95, 0.44, 0.84]]
    };

    var currentLang = "en";
    var currentThemeName = "dark";
    var score = 0;
    var bestScore = 0;
    var stage = 1;
    var lives = 3;
    var gameState = "ready"; // ready | play | pause | clear | gameover
    var clearTimer = 0;
    var hitFlashTimer = 0;
    var globalTime = 0;
    var newRecordFlag = false;
    var eagleDestroyed = false;
    var nextId = 1;

    var currentStatusKey = "statusReady";
    var currentStatusArgs = [];

    var grid = [];
    var bullets = [];
    var enemies = [];
    var pendingSpawns = [];
    var enemyQueue = [];
    var powerups = [];
    var explosions = [];
    var particles = [];

    var spawnTimer = 0;
    var spawnSlot = 0;
    var freezeTimer = 0;
    var shovelTimer = 0;

    var player = {
        x: 9,
        y: 25,
        dir: "up",
        stars: 0,
        shieldTimer: 0,
        cooldown: 0,
        slideDir: null,
        slideTimer: 0,
        trackPhase: 0
    };

    var heldKeys = { up: false, down: false, left: false, right: false };
    var dirStack = [];

    var uiHooks = {
        onStatus: null,
        onHud: null,
        onInvalidate: null
    };

    function tr(key) {
        var args = [];
        var i;
        for (i = 1; i < arguments.length; i++) args.push(arguments[i]);
        return relaxTranslate(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    function setStatus(key) {
        var args = [];
        var i;
        for (i = 1; i < arguments.length; i++) args.push(arguments[i]);
        currentStatusKey = key;
        currentStatusArgs = args;
        if (uiHooks.onStatus) {
            uiHooks.onStatus(relaxTranslate(I18N[currentLang] || I18N.en, I18N.en, key, args));
        }
    }

    function padZero(n, width) {
        var s = String(Math.max(0, Math.floor(n)));
        while (s.length < width) s = "0" + s;
        return s;
    }

    function inLangList(code) {
        var i;
        for (i = 0; i < LANG_ORDER.length; i++) {
            if (LANG_ORDER[i] === code) return true;
        }
        return false;
    }

    function loadSettings() {
        var data = readKeyValueFile(getGameSaveFile(SAVE_TOKEN));
        if (!data) return;
        if (data.best) {
            var b = parseInt(data.best, 10);
            if (!isNaN(b) && b >= 0) bestScore = b;
        }
        if (data.theme === "dark" || data.theme === "light") currentThemeName = data.theme;
        if (data.lang && inLangList(data.lang)) currentLang = data.lang;
    }

    function saveSettings() {
        writeKeyValueFile(getGameSaveFile(SAVE_TOKEN), [
            "best=" + bestScore,
            "theme=" + currentThemeName,
            "lang=" + currentLang
        ]);
    }

    function addScore(pts) {
        score += pts;
        if (score > bestScore) {
            bestScore = score;
            newRecordFlag = true;
        }
    }

    function spawnBurst(cx, cy, rgb, count, speedScale) {
        var i, ang, spd;
        for (i = 0; i < count; i++) {
            if (particles.length >= 100) break;
            ang = Math.random() * Math.PI * 2;
            spd = (30 + Math.random() * 90) * (speedScale || 1);
            particles.push({
                x: cx * CELL,
                y: cy * CELL,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 0.24 + Math.random() * 0.25,
                maxLife: 0.49,
                color: rgb
            });
        }
    }

    function addExplosion(cx, cy, maxR, rgb) {
        explosions.push({
            x: cx,
            y: cy,
            r: maxR,
            timer: 0.26,
            maxTimer: 0.26,
            color: rgb
        });
    }

    function buildEnemyQueue(stageNum) {
        var q = [];
        var i, kind;
        for (i = 0; i < ENEMIES_PER_STAGE; i++) {
            if (stageNum === 1) {
                kind = (i < 12) ? "basic" : ((i < 17) ? "fast" : "rapid");
            } else if (stageNum === 2) {
                kind = (i < 7) ? "basic" : ((i < 13) ? "fast" : ((i < 18) ? "rapid" : "heavy"));
            } else {
                var r = i % 5;
                kind = (r === 0) ? "basic" : ((r === 1) ? "fast" : ((r === 2) ? "rapid" : ((r === 3 && stageNum < 5) ? "fast" : "heavy")));
            }
            q.push({
                kind: kind,
                isBonus: (i === 3 || i === 7 || i === 11 || i === 15 || i === 19)
            });
        }
        return q;
    }

    function buildFortressWall(tileType) {
        var ring = [
            [11, 25], [11, 24], [11, 23],
            [12, 23], [13, 23],
            [14, 23], [14, 24], [14, 25]
        ];
        var i, px, py;
        for (i = 0; i < ring.length; i++) {
            px = ring[i][0];
            py = ring[i][1];
            grid[py][px] = tileType;
        }
    }

    function clearMacroCell(mx, my) {
        var x = mx * 2;
        var y = my * 2;
        grid[y][x] = TILE_EMPTY;
        grid[y][x + 1] = TILE_EMPTY;
        grid[y + 1][x] = TILE_EMPTY;
        grid[y + 1][x + 1] = TILE_EMPTY;
    }

    function initStage(stageNum) {
        var blueprint, y, x, ch, tile, mx, my;
        stage = stageNum;
        clearTimer = 0;
        hitFlashTimer = 0;
        eagleDestroyed = false;
        freezeTimer = 0;
        shovelTimer = 0;
        bullets = [];
        enemies = [];
        pendingSpawns = [];
        powerups = [];
        explosions = [];
        particles = [];
        spawnTimer = 0.2;
        spawnSlot = 0;

        grid = [];
        for (y = 0; y < ROWS; y++) {
            grid[y] = [];
            for (x = 0; x < COLS; x++) grid[y][x] = TILE_EMPTY;
        }

        blueprint = STAGES[(stageNum - 1) % STAGES.length];
        for (my = 0; my < 13; my++) {
            for (mx = 0; mx < 13; mx++) {
                ch = blueprint[my].charAt(mx);
                tile = TILE_EMPTY;
                if (ch === "#") tile = TILE_BRICK;
                else if (ch === "H") tile = TILE_STEEL;
                else if (ch === "~") tile = TILE_WATER;
                else if (ch === "%") tile = TILE_TREES;
                else if (ch === "=") tile = TILE_ICE;

                x = mx * 2;
                y = my * 2;
                grid[y][x] = tile;
                grid[y][x + 1] = tile;
                grid[y + 1][x] = tile;
                grid[y + 1][x + 1] = tile;
            }
        }

        // Clear enemy top spawn points (left, center, right) and player spawn
        clearMacroCell(0, 0);
        clearMacroCell(6, 0);
        clearMacroCell(12, 0);
        clearMacroCell(4, 12);

        // Build Eagle HQ (2x2 at 12..13, 24..25) and brick fortress
        grid[24][12] = TILE_EAGLE;
        grid[24][13] = TILE_EAGLE;
        grid[25][12] = TILE_EAGLE;
        grid[25][13] = TILE_EAGLE;
        buildFortressWall(TILE_BRICK);

        enemyQueue = buildEnemyQueue(stageNum);

        player.x = 9;
        player.y = 25;
        player.dir = "up";
        player.shieldTimer = 3.0;
        player.cooldown = 0;
        player.slideDir = null;
        player.slideTimer = 0;
    }

    function newGame() {
        score = 0;
        lives = 3;
        newRecordFlag = false;
        player.stars = 0;
        clearInputState();
        initStage(1);
        gameState = "play";
        setStatus("statusPlay");
        if (uiHooks.onHud) uiHooks.onHud();
        if (uiHooks.onInvalidate) uiHooks.onInvalidate();
    }

    function togglePause() {
        if (gameState === "play") {
            gameState = "pause";
            clearInputState();
            setStatus("statusPaused");
        } else if (gameState === "pause") {
            gameState = "play";
            setStatus("statusPlay");
        } else if (gameState === "ready") {
            gameState = "play";
            setStatus("statusPlay");
        }
        if (uiHooks.onHud) uiHooks.onHud();
    }

    function clearInputState() {
        heldKeys.up = false;
        heldKeys.down = false;
        heldKeys.left = false;
        heldKeys.right = false;
        dirStack = [];
    }

    function setKey(dir, isDown) {
        var i, nextStack;
        if (!DIRS[dir]) return;
        if (isDown) {
            if (gameState === "ready") {
                gameState = "play";
                setStatus("statusPlay");
            }
            heldKeys[dir] = true;
            nextStack = [];
            for (i = 0; i < dirStack.length; i++) {
                if (dirStack[i] !== dir) nextStack.push(dirStack[i]);
            }
            nextStack.push(dir);
            dirStack = nextStack;
        } else {
            heldKeys[dir] = false;
            nextStack = [];
            for (i = 0; i < dirStack.length; i++) {
                if (dirStack[i] !== dir) nextStack.push(dirStack[i]);
            }
            dirStack = nextStack;
        }
    }

    function activeMoveDir() {
        return dirStack.length > 0 ? dirStack[dirStack.length - 1] : null;
    }

    function isSolidTileForTank(tile) {
        return tile === TILE_BRICK || tile === TILE_STEEL || tile === TILE_WATER || tile === TILE_EAGLE;
    }

    function tankBlockedByTerrain(cx, cy) {
        var r = TANK_HALF;
        var minX = Math.floor(cx - r);
        var maxX = Math.floor(cx + r);
        var minY = Math.floor(cy - r);
        var maxY = Math.floor(cy + r);
        var gx, gy;

        if (cx - r < 0 || cx + r > COLS || cy - r < 0 || cy + r > ROWS) return true;
        for (gy = minY; gy <= maxY; gy++) {
            for (gx = minX; gx <= maxX; gx++) {
                if (isSolidTileForTank(grid[gy][gx])) return true;
            }
        }
        return false;
    }

    function tankOverlapsOther(cx, cy, selfId) {
        var i, e, dx, dy, lim;
        lim = TANK_HALF * 1.92;
        if (selfId !== -1) {
            dx = Math.abs(cx - player.x);
            dy = Math.abs(cy - player.y);
            if (dx < lim && dy < lim) return true;
        }
        for (i = 0; i < enemies.length; i++) {
            e = enemies[i];
            if (e.id === selfId) continue;
            dx = Math.abs(cx - e.x);
            dy = Math.abs(cy - e.y);
            if (dx < lim && dy < lim) return true;
        }
        return false;
    }

    function isTankOnIce(cx, cy) {
        var gx = Math.max(0, Math.min(COLS - 1, Math.floor(cx)));
        var gy = Math.max(0, Math.min(ROWS - 1, Math.floor(cy)));
        return grid[gy][gx] === TILE_ICE;
    }

    function snapAxisForTurn(pos, axisIsX, cx, cy, selfId) {
        var snapped = Math.round(pos);
        var diff = Math.abs(snapped - pos);
        if (diff > 0.45) return pos;
        var tx = axisIsX ? snapped : cx;
        var ty = axisIsX ? cy : snapped;
        if (!tankBlockedByTerrain(tx, ty) && !tankOverlapsOther(tx, ty, selfId)) {
            return snapped;
        }
        return pos;
    }

    function tryMoveTank(tank, dir, dist, selfId) {
        var d = DIRS[dir];
        var turned90 = (DIRS[tank.dir].dx !== d.dx && DIRS[tank.dir].dy !== d.dy);
        var nx, ny;

        if (turned90) {
            if (d.dy !== 0) {
                tank.x = snapAxisForTurn(tank.x, true, tank.x, tank.y, selfId);
            } else {
                tank.y = snapAxisForTurn(tank.y, false, tank.x, tank.y, selfId);
            }
        }
        tank.dir = dir;

        nx = tank.x + d.dx * dist;
        ny = tank.y + d.dy * dist;
        if (tankBlockedByTerrain(nx, ny)) return false;

        // Allow tank to separate if already overlapping another, otherwise stop
        if (tankOverlapsOther(nx, ny, selfId) && !tankOverlapsOther(tank.x, tank.y, selfId)) {
            return false;
        }

        tank.x = nx;
        tank.y = ny;
        tank.trackPhase += dist * 5;
        return true;
    }

    function countPlayerBullets() {
        var i, n = 0;
        for (i = 0; i < bullets.length; i++) {
            if (bullets[i].owner === "player") n++;
        }
        return n;
    }

    function firePlayerBullet() {
        var maxShots, spd, d;
        if (gameState === "ready") {
            gameState = "play";
            setStatus("statusPlay");
        }
        if (gameState !== "play") return false;
        maxShots = (player.stars >= 2) ? 2 : 1;
        if (countPlayerBullets() >= maxShots) return false;
        if (player.cooldown > 0) return false;

        d = DIRS[player.dir];
        spd = (player.stars >= 1) ? 20.0 : 14.0;
        bullets.push({
            id: nextId++,
            owner: "player",
            x: player.x + d.dx * 0.92,
            y: player.y + d.dy * 0.92,
            dir: player.dir,
            speed: spd,
            power: (player.stars >= 3) ? 2 : 1
        });
        player.cooldown = 0.14;
        return true;
    }

    function fireEnemyBullet(e) {
        var d = DIRS[e.dir];
        var spd = (e.kind === "rapid") ? 20.0 : (e.kind === "heavy" ? 15.0 : 13.0);
        bullets.push({
            id: nextId++,
            owner: "enemy",
            x: e.x + d.dx * 0.92,
            y: e.y + d.dy * 0.92,
            dir: e.dir,
            speed: spd,
            power: 1
        });
    }

    function spawnBonusItem() {
        var types = ["star", "helmet", "clock", "shovel", "grenade", "tank"];
        var chosen = types[Math.floor(Math.random() * types.length)];
        var bx = 2 + Math.floor(Math.random() * (COLS - 4));
        var by = 2 + Math.floor(Math.random() * (ROWS - 6));
        var tries = 0;

        while (tries < 30 && (grid[by][bx] === TILE_WATER || grid[by][bx] === TILE_EAGLE || grid[by][bx] === TILE_STEEL)) {
            bx = 2 + Math.floor(Math.random() * (COLS - 4));
            by = 2 + Math.floor(Math.random() * (ROWS - 6));
            tries++;
        }

        // Single active bonus on screen at a time (classic Battle City rule)
        powerups = [{
            x: bx,
            y: by,
            type: chosen,
            timer: POWERUP_LIFE_SEC
        }];
    }

    function createEnemyOfType(spec, sx, sy) {
        var kind = spec.kind;
        var hp = (kind === "heavy") ? 4 : 1;
        var spd = (kind === "fast") ? 5.3 : (kind === "rapid" ? 3.8 : (kind === "heavy" ? 3.0 : 3.2));
        enemies.push({
            id: nextId++,
            kind: kind,
            isBonus: spec.isBonus,
            hp: hp,
            maxHp: hp,
            x: sx,
            y: sy,
            dir: "down",
            speed: Math.min(6.0, spd + (stage - 1) * 0.12),
            turnTimer: 0.7 + Math.random() * 1.1,
            fireTimer: 0.9 + Math.random() * 1.4,
            trackPhase: 0
        });
    }

    function updateSpawns(dt) {
        var i, ps, slots, slot;
        slots = [[1, 1], [13, 1], [25, 1]];

        for (i = pendingSpawns.length - 1; i >= 0; i--) {
            ps = pendingSpawns[i];
            ps.timer -= dt;
            if (ps.timer <= 0) {
                if (!tankOverlapsOther(ps.x, ps.y, -99)) {
                    createEnemyOfType(ps.spec, ps.x, ps.y);
                    pendingSpawns.splice(i, 1);
                } else {
                    ps.timer = 0.25;
                }
            }
        }

        if (enemyQueue.length > 0 && (enemies.length + pendingSpawns.length) < MAX_ACTIVE_ENEMIES) {
            spawnTimer -= dt;
            if (spawnTimer <= 0) {
                slot = slots[spawnSlot % slots.length];
                spawnSlot++;
                pendingSpawns.push({
                    x: slot[0],
                    y: slot[1],
                    timer: SPAWN_FLASH_SEC,
                    spec: enemyQueue.shift()
                });
                spawnTimer = SPAWN_DELAY_SEC;
            }
        }
    }

    function remainingTotalFoes() {
        return enemyQueue.length + pendingSpawns.length + enemies.length;
    }

    function destroyEagle() {
        var t = THEMES[currentThemeName] || THEMES.dark;
        if (eagleDestroyed) return;
        eagleDestroyed = true;
        addExplosion(13, 25, 1.8, t.blastOuter);
        spawnBurst(13, 25, t.eagleGold, 22, 1.4);
        hitFlashTimer = 0.7;
        gameState = "gameover";
        clearInputState();
        saveSettings();
        setStatus("statusLostBase");
        if (uiHooks.onHud) uiHooks.onHud();
    }

    function damageWallAtBullet(b) {
        var t = THEMES[currentThemeName] || THEMES.dark;
        var hitAnything = false;
        var isVert = (b.dir === "up" || b.dir === "down");
        // Wide front sweep (0.58 mini-tiles) so centered shots carve full 2-tile tank corridor cleanly
        var halfSweep = 0.58;
        var minX = Math.floor(b.x - (isVert ? halfSweep : BULLET_RADIUS));
        var maxX = Math.floor(b.x + (isVert ? halfSweep : BULLET_RADIUS));
        var minY = Math.floor(b.y - (isVert ? BULLET_RADIUS : halfSweep));
        var maxY = Math.floor(b.y + (isVert ? BULLET_RADIUS : halfSweep));
        var gx, gy, tile;

        for (gy = minY; gy <= maxY; gy++) {
            for (gx = minX; gx <= maxX; gx++) {
                if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) continue;
                tile = grid[gy][gx];
                if (tile === TILE_BRICK) {
                    grid[gy][gx] = TILE_EMPTY;
                    hitAnything = true;
                } else if (tile === TILE_STEEL) {
                    hitAnything = true;
                    if (b.power >= 2) {
                        grid[gy][gx] = TILE_EMPTY;
                    }
                } else if (tile === TILE_EAGLE) {
                    hitAnything = true;
                    destroyEagle();
                }
            }
        }
        if (hitAnything) {
            addExplosion(b.x, b.y, 0.75, t.blastOuter);
            spawnBurst(b.x, b.y, t.brickHi, 6, 0.8);
        }
        return hitAnything;
    }

    function hitEnemyAtIndex(idx, bullet) {
        var t = THEMES[currentThemeName] || THEMES.dark;
        var e = enemies[idx];
        var pts;

        if (e.isBonus) {
            e.isBonus = false;
            spawnBonusItem();
        }
        e.hp -= bullet.power;
        if (e.hp > 0) {
            addExplosion(bullet.x, bullet.y, 0.65, t.steelHi);
            return;
        }

        pts = (e.kind === "heavy") ? 400 : (e.kind === "rapid" ? 300 : (e.kind === "fast" ? 200 : 100));
        addScore(pts);
        addExplosion(e.x, e.y, 1.35, t.blastOuter);
        spawnBurst(e.x, e.y, t.blastCore, 14, 1.2);
        enemies.splice(idx, 1);

        if (remainingTotalFoes() === 0) {
            var bonus = stage * 500 + lives * 150;
            addScore(bonus);
            gameState = "clear";
            clearTimer = 1.8;
            saveSettings();
            setStatus("statusStageClear", stage, bonus);
            if (uiHooks.onHud) uiHooks.onHud();
        } else {
            setStatus("statusHitTank", pts, remainingTotalFoes());
        }
    }

    function killPlayer() {
        var t = THEMES[currentThemeName] || THEMES.dark;
        if (player.shieldTimer > 0) return;

        addExplosion(player.x, player.y, 1.4, t.blastOuter);
        spawnBurst(player.x, player.y, t.playerHi, 16, 1.3);
        hitFlashTimer = 0.55;
        lives--;

        if (lives <= 0) {
            lives = 0;
            gameState = "gameover";
            clearInputState();
            saveSettings();
            setStatus("statusGameOver", score, stage);
            if (uiHooks.onHud) uiHooks.onHud();
            return;
        }

        player.x = 9;
        player.y = 25;
        player.dir = "up";
        player.stars = 0;
        player.shieldTimer = 3.2;
        player.slideDir = null;
        player.slideTimer = 0;
        setStatus("statusLostLife", lives);
        if (uiHooks.onHud) uiHooks.onHud();
    }

    function updateBullets(dt) {
        var i, j, b, d, rem, step, sub, e, dx, dy, other;
        var t = THEMES[currentThemeName] || THEMES.dark;

        for (i = bullets.length - 1; i >= 0; i--) {
            b = bullets[i];
            if (!b) continue;
            d = DIRS[b.dir];
            rem = b.speed * dt;
            var destroyed = false;

            while (rem > 0 && !destroyed) {
                step = (rem > 0.35) ? 0.35 : rem;
                b.x += d.dx * step;
                b.y += d.dy * step;
                rem -= step;

                if (b.x - BULLET_RADIUS < 0 || b.x + BULLET_RADIUS > COLS ||
                    b.y - BULLET_RADIUS < 0 || b.y + BULLET_RADIUS > ROWS) {
                    addExplosion(
                        Math.max(0.4, Math.min(COLS - 0.4, b.x)),
                        Math.max(0.4, Math.min(ROWS - 0.4, b.y)),
                        0.6, t.steelHi
                    );
                    destroyed = true;
                    break;
                }

                if (damageWallAtBullet(b)) {
                    destroyed = true;
                    break;
                }

                // Bullet vs opposing bullet collision
                for (j = bullets.length - 1; j >= 0; j--) {
                    if (j === i) continue;
                    other = bullets[j];
                    if (!other || other.owner === b.owner) continue;
                    dx = b.x - other.x;
                    dy = b.y - other.y;
                    if (dx * dx + dy * dy < 0.65 * 0.65) {
                        addExplosion((b.x + other.x) * 0.5, (b.y + other.y) * 0.5, 0.55, t.blastCore);
                        if (j > i) {
                            bullets.splice(j, 1);
                            bullets.splice(i, 1);
                        } else {
                            bullets.splice(i, 1);
                            bullets.splice(j, 1);
                            i--;
                        }
                        destroyed = true;
                        b = null;
                        break;
                    }
                }
                if (destroyed) break;

                if (b.owner === "player") {
                    for (j = enemies.length - 1; j >= 0; j--) {
                        e = enemies[j];
                        if (Math.abs(b.x - e.x) < TANK_HALF + BULLET_RADIUS &&
                            Math.abs(b.y - e.y) < TANK_HALF + BULLET_RADIUS) {
                            hitEnemyAtIndex(j, b);
                            destroyed = true;
                            break;
                        }
                    }
                } else {
                    if (Math.abs(b.x - player.x) < TANK_HALF + BULLET_RADIUS &&
                        Math.abs(b.y - player.y) < TANK_HALF + BULLET_RADIUS) {
                        killPlayer();
                        destroyed = true;
                        break;
                    }
                }
            }

            if (destroyed && b) {
                for (sub = 0; sub < bullets.length; sub++) {
                    if (bullets[sub].id === b.id) {
                        bullets.splice(sub, 1);
                        break;
                    }
                }
            }
        }
    }

    function pickEnemyTurnDir(e) {
        var i, d, nx, ny;
        var valid = [];
        for (i = 0; i < DIR_LIST.length; i++) {
            d = DIR_LIST[i];
            nx = e.x + DIRS[d].dx * 0.4;
            ny = e.y + DIRS[d].dy * 0.4;
            if (!tankBlockedByTerrain(nx, ny)) valid.push(d);
        }
        if (valid.length === 0) {
            return DIR_LIST[Math.floor(Math.random() * DIR_LIST.length)];
        }
        // Subtle downward bias toward HQ
        if (Math.random() < 0.45 && e.y < 22) {
            for (i = 0; i < valid.length; i++) {
                if (valid[i] === "down") return "down";
            }
        }
        return valid[Math.floor(Math.random() * valid.length)];
    }

    function updateEnemies(dt) {
        var i, e, moved;
        if (freezeTimer > 0) return;

        for (i = 0; i < enemies.length; i++) {
            e = enemies[i];
            moved = tryMoveTank(e, e.dir, e.speed * dt, e.id);
            e.turnTimer -= dt;
            if (!moved || e.turnTimer <= 0) {
                e.dir = pickEnemyTurnDir(e);
                e.turnTimer = moved ? (1.2 + Math.random() * 1.8) : (0.35 + Math.random() * 0.6);
            }
            e.fireTimer -= dt;
            if (e.fireTimer <= 0) {
                fireEnemyBullet(e);
                e.fireTimer = (e.kind === "rapid") ? (0.65 + Math.random() * 0.7) : (1.1 + Math.random() * 1.4);
            }
        }
    }

    function collectPowerup(pw) {
        var t = THEMES[currentThemeName] || THEMES.dark;
        var i, e;
        addScore(500);
        spawnBurst(pw.x, pw.y, t.bonusBorder, 14, 1.1);

        if (pw.type === "star") {
            if (player.stars < 3) player.stars++;
            setStatus("statusBonusStar", player.stars);
        } else if (pw.type === "helmet") {
            player.shieldTimer = HELMET_SEC;
            setStatus("statusBonusHelmet");
        } else if (pw.type === "clock") {
            freezeTimer = FREEZE_SEC;
            setStatus("statusBonusClock");
        } else if (pw.type === "shovel") {
            shovelTimer = SHOVEL_SEC;
            buildFortressWall(TILE_STEEL);
            setStatus("statusBonusShovel");
        } else if (pw.type === "grenade") {
            for (i = enemies.length - 1; i >= 0; i--) {
                e = enemies[i];
                addScore((e.kind === "heavy") ? 400 : (e.kind === "rapid" ? 300 : (e.kind === "fast" ? 200 : 100)));
                addExplosion(e.x, e.y, 1.35, t.blastOuter);
                spawnBurst(e.x, e.y, t.blastCore, 10, 1.1);
            }
            enemies = [];
            setStatus("statusBonusGrenade");
            if (remainingTotalFoes() === 0) {
                var bonus = stage * 500 + lives * 150;
                addScore(bonus);
                gameState = "clear";
                clearTimer = 1.8;
                saveSettings();
                setStatus("statusStageClear", stage, bonus);
                if (uiHooks.onHud) uiHooks.onHud();
            }
        } else if (pw.type === "tank") {
            if (lives < 6) lives++;
            setStatus("statusBonusLife");
            if (uiHooks.onHud) uiHooks.onHud();
        }
    }

    function updatePowerups(dt) {
        var i, pw, nextP = [];
        for (i = 0; i < powerups.length; i++) {
            pw = powerups[i];
            pw.timer -= dt;
            if (pw.timer <= 0) continue;
            if (Math.abs(player.x - pw.x) < 1.65 && Math.abs(player.y - pw.y) < 1.65) {
                collectPowerup(pw);
                continue;
            }
            nextP.push(pw);
        }
        powerups = nextP;
    }

    function updatePlayer(dt) {
        var dir = activeMoveDir();
        var spd = 4.6;

        if (player.cooldown > 0) player.cooldown = Math.max(0, player.cooldown - dt);
        if (player.shieldTimer > 0) player.shieldTimer = Math.max(0, player.shieldTimer - dt);

        if (dir) {
            tryMoveTank(player, dir, spd * dt, -1);
            if (isTankOnIce(player.x, player.y)) {
                player.slideDir = dir;
                player.slideTimer = 0.22;
            } else {
                player.slideTimer = 0;
            }
        } else if (player.slideTimer > 0 && player.slideDir) {
            player.slideTimer = Math.max(0, player.slideTimer - dt);
            tryMoveTank(player, player.slideDir, spd * 0.55 * dt, -1);
        }
    }

    function updateParticlesAndExplosions(dt) {
        var i, p, ex;
        for (i = particles.length - 1; i >= 0; i--) {
            p = particles[i];
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.9;
            p.vy *= 0.9;
        }
        for (i = explosions.length - 1; i >= 0; i--) {
            ex = explosions[i];
            ex.timer -= dt;
            if (ex.timer <= 0) explosions.splice(i, 1);
        }
    }

    function stepSubframe(subDt) {
        if (freezeTimer > 0) freezeTimer = Math.max(0, freezeTimer - subDt);
        if (shovelTimer > 0) {
            shovelTimer -= subDt;
            if (shovelTimer <= 0) {
                shovelTimer = 0;
                buildFortressWall(TILE_BRICK);
            }
        }

        updateSpawns(subDt);
        updatePlayer(subDt);
        updatePowerups(subDt);
        updateEnemies(subDt);
        updateBullets(subDt);
    }

    function update(dt) {
        var rem, sub;
        if (dt <= 0) return;
        globalTime += dt;
        if (hitFlashTimer > 0) hitFlashTimer = Math.max(0, hitFlashTimer - dt);
        updateParticlesAndExplosions(dt);

        if (gameState === "clear") {
            clearTimer -= dt;
            if (clearTimer <= 0) {
                initStage(stage + 1);
                gameState = "play";
                setStatus("statusPlay");
                if (uiHooks.onHud) uiHooks.onHud();
            }
            return;
        }

        if (gameState !== "play") return;

        rem = dt;
        while (rem > 0) {
            sub = (rem > 0.04) ? 0.04 : rem;
            stepSubframe(sub);
            rem -= sub;
            if (gameState !== "play") break;
        }
    }

    function drawVectorText(g, strVal, cx, cy, glyphH, rgbColor, alpha, gapRatio) {
        var s = String(strVal).toUpperCase();
        var chW = glyphH * 0.62;
        var gap = glyphH * (gapRatio || 0.24);
        var totalW = s.length * chW + Math.max(0, s.length - 1) * gap;
        var x0 = cx - totalW * 0.5;
        var y0 = cy - glyphH * 0.5;
        var pen = g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(rgbColor, alpha), Math.max(1.3, glyphH * 0.13));
        var i, ch, strokes, j, poly, k, gx;

        g.newPath();
        for (i = 0; i < s.length; i++) {
            ch = s.charAt(i);
            gx = x0 + i * (chW + gap);
            strokes = GLYPHS[ch];
            if (!strokes) continue;
            for (j = 0; j < strokes.length; j++) {
                poly = strokes[j];
                if (poly.length < 4) continue;
                g.moveTo(gx + poly[0] * chW, y0 + poly[1] * glyphH);
                for (k = 2; k < poly.length; k += 2) {
                    g.lineTo(gx + poly[k] * chW, y0 + poly[k + 1] * glyphH);
                }
            }
        }
        g.strokePath(pen);
    }

    function drawHudCards(g, t) {
        var cardW = Math.floor((BOARD_W - 3 * 10) / 4);
        var cardY = PAD_TOP;
        var cardBg = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.hudBg, 1));
        var cardStroke = g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.hudStroke, 1), 1);
        var i, cx, pipList, emptyList, maxPips, spacing, startX;
        var starStr = "";

        for (i = 0; i < 4; i++) {
            cx = BOARD_X + i * (cardW + 10);
            fillRoundRect(g, cx, cardY, cardW, HUD_H, 8, cardBg);
            strokeRoundRect(g, cx, cardY, cardW, HUD_H, 8, cardStroke);
        }

        drawVectorText(g, "SCORE", BOARD_X + cardW * 0.5, cardY + 13, 7.5, t.textSub, 0.9, 0.24);
        drawVectorText(g, padZero(score, 6), BOARD_X + cardW * 0.5, cardY + 34, 16, t.accScore, 1, 0.18);
        drawVectorText(g, "BEST " + bestScore, BOARD_X + cardW * 0.5, cardY + 54, 6.8, t.textSub, 0.85, 0.18);

        cx = BOARD_X + (cardW + 10);
        drawVectorText(g, "STAGE", cx + cardW * 0.5, cardY + 13, 7.5, t.textSub, 0.9, 0.24);
        drawVectorText(g, padZero(stage, 2), cx + cardW * 0.5, cardY + 35, 18, t.accStage, 1, 0.20);
        for (i = 0; i < 3; i++) starStr += (i < player.stars) ? "*" : "-";
        drawVectorText(g, "RANK " + starStr, cx + cardW * 0.5, cardY + 54, 6.8, t.accScore, 0.95, 0.18);

        cx = BOARD_X + 2 * (cardW + 10);
        drawVectorText(g, "FOES", cx + cardW * 0.5, cardY + 13, 7.5, t.textSub, 0.9, 0.24);
        drawVectorText(g, padZero(remainingTotalFoes(), 2), cx + cardW * 0.5, cardY + 38, 19, t.accFoes, 1, 0.18);
        if (freezeTimer > 0) {
            drawVectorText(g, "FROZEN", cx + cardW * 0.5, cardY + 55, 6.5, t.accFoes, 0.95, 0.18);
        }

        cx = BOARD_X + 3 * (cardW + 10);
        drawVectorText(g, "LIVES", cx + cardW * 0.5, cardY + 13, 7.5, t.textSub, 0.9, 0.24);
        maxPips = Math.max(3, lives);
        spacing = 15;
        startX = cx + cardW * 0.5 - ((maxPips - 1) * spacing) * 0.5;
        pipList = [];
        emptyList = [];
        for (i = 0; i < lives; i++) pipList.push([startX + i * spacing, cardY + 40, 5.5]);
        for (i = lives; i < 3; i++) emptyList.push([startX + i * spacing, cardY + 40, 4]);
        if (pipList.length > 0) {
            fillBatchCircles(g, pipList, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.accLives, 1)));
        }
        if (emptyList.length > 0) {
            fillBatchCircles(g, emptyList, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.barTrack, 1)));
        }
    }

    function pushTankGeometry(rectList, barrelList, tank, bodyColor, trimColor, cxOffset, cyOffset) {
        var cx = cxOffset + tank.x * CELL;
        var cy = cyOffset + tank.y * CELL;
        var half = TANK_HALF * CELL;
        var trackW = 5.5;
        var isVert = (tank.dir === "up" || tank.dir === "down");
        var d = DIRS[tank.dir];

        // Side caterpillar treads
        if (isVert) {
            rectList.tracks.push([cx - half, cy - half, trackW, half * 2]);
            rectList.tracks.push([cx + half - trackW, cy - half, trackW, half * 2]);
            rectList.bodies.push({ rect: [cx - half + 4, cy - half + 2, half * 2 - 8, half * 2 - 4], col: bodyColor });
        } else {
            rectList.tracks.push([cx - half, cy - half, half * 2, trackW]);
            rectList.tracks.push([cx - half, cy + half - trackW, half * 2, trackW]);
            rectList.bodies.push({ rect: [cx - half + 2, cy - half + 4, half * 2 - 4, half * 2 - 8], col: bodyColor });
        }

        // Turret + Barrel
        rectList.turrets.push({ cx: cx, cy: cy, col: trimColor });
        if (d.dx !== 0) {
            var bx = (d.dx > 0) ? cx : (cx - half - 3);
            barrelList.push({ rect: [bx, cy - 2.2, half + 3, 4.4], col: trimColor });
        } else {
            var by = (d.dy > 0) ? cy : (cy - half - 3);
            barrelList.push({ rect: [cx - 2.2, by, 4.4, half + 3], col: trimColor });
        }
    }

    function drawTanksLayer(g, t) {
        var rectList = { tracks: [], bodies: [], turrets: [] };
        var barrelList = [];
        var i, e, bodyCol, trimCol, flash;

        pushTankGeometry(rectList, barrelList, player, t.playerBody, t.playerHi, BOARD_X, BOARD_Y);

        for (i = 0; i < enemies.length; i++) {
            e = enemies[i];
            flash = e.isBonus && (Math.floor(globalTime * 8) % 2 === 0);
            if (flash) {
                bodyCol = t.foeBonus;
                trimCol = t.playerHi;
            } else if (e.kind === "fast") {
                bodyCol = t.foeFast;
                trimCol = t.steelHi;
            } else if (e.kind === "rapid") {
                bodyCol = t.foeRapid;
                trimCol = t.steelHi;
            } else if (e.kind === "heavy") {
                bodyCol = (e.hp >= 4) ? t.foeHeavy4 : (e.hp === 3 ? t.foeHeavy3 : (e.hp === 2 ? t.foeHeavy2 : t.foeHeavy1));
                trimCol = t.steelHi;
            } else {
                bodyCol = t.foeBasic;
                trimCol = t.steelHi;
            }
            pushTankGeometry(rectList, barrelList, e, bodyCol, trimCol, BOARD_X, BOARD_Y);
        }

        if (rectList.tracks.length > 0) {
            fillBatchRects(g, rectList.tracks, 2, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.playerTrack, 1)));
        }
        for (i = 0; i < rectList.bodies.length; i++) {
            var b = rectList.bodies[i];
            fillRoundRect(g, b.rect[0], b.rect[1], b.rect[2], b.rect[3], 4,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(b.col, 1)));
        }
        for (i = 0; i < barrelList.length; i++) {
            var br = barrelList[i];
            fillBatchRects(g, [br.rect], 1, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(br.col, 1)));
        }
        for (i = 0; i < rectList.turrets.length; i++) {
            var trt = rectList.turrets[i];
            fillBatchCircles(g, [[trt.cx, trt.cy, 6.5]],
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(trt.col, 1)));
        }

        if (player.shieldTimer > 0) {
            var rad = TANK_HALF * CELL + 4 + 1.5 * Math.sin(globalTime * 16);
            strokeRoundRect(g, BOARD_X + player.x * CELL - rad, BOARD_Y + player.y * CELL - rad, rad * 2, rad * 2, 7,
                g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.playerShield, 0.85), 2));
        }
    }

    function drawOverlayCard(g, t, titleText, subText, accentRgb) {
        var boxW = 350;
        var boxH = 92;
        var bx = BOARD_X + (BOARD_W - boxW) * 0.5;
        var by = BOARD_Y + (BOARD_H - boxH) * 0.5;
        var pulse = 0.88 + 0.12 * Math.sin(globalTime * 4.5);

        fillRoundRect(g, bx, by, boxW, boxH, 12,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.overlayBg, 0.93)));
        strokeRoundRect(g, bx, by, boxW, boxH, 12,
            g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(accentRgb, pulse), 2));

        if (titleText) drawVectorText(g, titleText, bx + boxW * 0.5, by + 33, 15.5, accentRgb, 1, 0.20);
        if (subText) drawVectorText(g, subText, bx + boxW * 0.5, by + 65, 8.5, t.textSub, 0.95, 0.16);
    }

    function drawSceneUnsafe(g) {
        var t = THEMES[currentThemeName] || THEMES.dark;
        var x, y, px, py, i, tile, shovelFlash;
        var brickRects = [], brickMortar = [];
        var steelRects = [], steelHi = [];
        var waterRects = [], waterWaves = [];
        var iceRects = [], iceLines = [];
        var treeRects = [], treeHi = [];
        var playerBullets = [], foeBullets = [];
        var flashAlpha;

        if (!g) return;

        // 1. Frame + HUD
        fillBatchRects(g, [[0, 0, CANVAS_W, CANVAS_H]], 0,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.bg, 1)));
        drawHudCards(g, t);

        // 2. Arena base
        fillRoundRect(g, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 4,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.ground, 1)));

        // Subtle macro grid markers
        var dots = [];
        for (y = 2; y < ROWS; y += 2) {
            for (x = 2; x < COLS; x += 2) {
                dots.push([BOARD_X + x * CELL - 1, BOARD_Y + y * CELL - 1, 2, 2]);
            }
        }
        fillBatchRects(g, dots, 0, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.groundGrid, 0.7)));

        // 3. Collect terrain batches
        shovelFlash = (shovelTimer > 0 && shovelTimer < 3.0 && Math.floor(globalTime * 8) % 2 === 1);
        for (y = 0; y < ROWS; y++) {
            for (x = 0; x < COLS; x++) {
                tile = grid[y][x];
                if (tile === TILE_EMPTY || tile === TILE_EAGLE) continue;
                px = BOARD_X + x * CELL;
                py = BOARD_Y + y * CELL;
                if (tile === TILE_BRICK) {
                    brickRects.push([px + 0.5, py + 0.5, CELL - 1, CELL - 1]);
                    brickMortar.push([px + 0.5, py + CELL * 0.5 - 1, CELL - 1, 2]);
                } else if (tile === TILE_STEEL) {
                    if (shovelFlash && y >= 23 && x >= 11 && x <= 14) {
                        brickRects.push([px + 0.5, py + 0.5, CELL - 1, CELL - 1]);
                    } else {
                        steelRects.push([px + 0.5, py + 0.5, CELL - 1, CELL - 1]);
                        steelHi.push([px + 4, py + 4, CELL - 8, CELL - 8]);
                    }
                } else if (tile === TILE_WATER) {
                    waterRects.push([px, py, CELL, CELL]);
                    waterWaves.push([px + 3, py + 6 + Math.sin(globalTime * 3 + x) * 2, CELL - 6, 3]);
                } else if (tile === TILE_ICE) {
                    iceRects.push([px, py, CELL, CELL]);
                    iceLines.push([px + 3, py + 5, CELL - 7, 2], [px + 5, py + 13, CELL - 7, 2]);
                } else if (tile === TILE_TREES) {
                    treeRects.push([px + 1, py + 1, CELL - 2, CELL - 2]);
                    treeHi.push([px + 4, py + 4, CELL - 9, CELL - 9]);
                }
            }
        }

        if (iceRects.length > 0) {
            fillBatchRects(g, iceRects, 0, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.ice, 0.72)));
            fillBatchRects(g, iceLines, 0, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.iceLine, 0.7)));
        }
        if (waterRects.length > 0) {
            fillBatchRects(g, waterRects, 0, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.water, 0.92)));
            fillBatchRects(g, waterWaves, 1, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.waterWave, 0.7)));
        }
        if (brickRects.length > 0) {
            fillBatchRects(g, brickRects, 1, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.brick, 1)));
            fillBatchRects(g, brickMortar, 0, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.brickMortar, 0.85)));
        }
        if (steelRects.length > 0) {
            fillBatchRects(g, steelRects, 2, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.steelEdge, 1)));
            fillBatchRects(g, steelHi, 1, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.steelHi, 0.92)));
        }

        // 4. Eagle HQ (2x2 at 12..13, 24..25)
        var ex = BOARD_X + 12 * CELL + 2;
        var ey = BOARD_Y + 24 * CELL + 2;
        var ew = CELL * 2 - 4;
        fillRoundRect(g, ex, ey, ew, ew, 5,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(eagleDestroyed ? t.eagleDead : t.eagleBg, 1)));
        if (!eagleDestroyed) {
            fillRoundRect(g, ex + 6, ey + 6, ew - 12, ew - 12, 3,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.eagleGold, 1)));
            drawVectorText(g, "HQ", ex + ew * 0.5, ey + ew * 0.5, 13, t.eagleBg, 1, 0.12);
        } else {
            drawVectorText(g, "X", ex + ew * 0.5, ey + ew * 0.5, 18, t.playerHi, 1, 0);
        }

        // 5. Pending spawn flashes
        for (i = 0; i < pendingSpawns.length; i++) {
            var ps = pendingSpawns[i];
            var sr = 8 + 7 * Math.abs(Math.sin(globalTime * 14));
            strokeRoundRect(g, BOARD_X + ps.x * CELL - sr, BOARD_Y + ps.y * CELL - sr, sr * 2, sr * 2, 4,
                g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.spawnStar, 0.9), 2));
        }

        // 6. Tanks
        drawTanksLayer(g, t);

        // 7. Bullets
        for (i = 0; i < bullets.length; i++) {
            var bl = bullets[i];
            var pt = [BOARD_X + bl.x * CELL, BOARD_Y + bl.y * CELL, BULLET_RADIUS * CELL];
            if (bl.owner === "player") playerBullets.push(pt);
            else foeBullets.push(pt);
        }
        if (playerBullets.length > 0) {
            fillBatchCircles(g, playerBullets, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.bulletPlayer, 1)));
        }
        if (foeBullets.length > 0) {
            fillBatchCircles(g, foeBullets, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.bulletFoe, 1)));
        }

        // 8. Trees drawn ABOVE tanks & bullets (canopy cover)
        if (treeRects.length > 0) {
            fillBatchRects(g, treeRects, 5, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.trees, 0.88)));
            fillBatchRects(g, treeHi, 4, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.treesHi, 0.55)));
        }

        // 9. Powerups drawn above trees so never lost
        for (i = 0; i < powerups.length; i++) {
            var pw = powerups[i];
            if (pw.timer < 3.5 && Math.floor(globalTime * 10) % 2 === 1) continue;
            px = BOARD_X + pw.x * CELL - 15;
            py = BOARD_Y + pw.y * CELL - 15;
            fillRoundRect(g, px, py, 30, 30, 6,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.bonusBg, 0.95)));
            strokeRoundRect(g, px, py, 30, 30, 6,
                g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.bonusBorder, 1), 2));
            var ch = pw.type === "star" ? "*" :
                     (pw.type === "helmet" ? "H" :
                     (pw.type === "clock" ? "C" :
                     (pw.type === "shovel" ? "S" :
                     (pw.type === "grenade" ? "G" : "+"))));
            drawVectorText(g, ch, px + 15, py + 15, 14, t.bonusBorder, 1, 0);
        }

        // 10. Explosions & Particles
        for (i = 0; i < explosions.length; i++) {
            var exp = explosions[i];
            var frac = 1 - exp.timer / exp.maxTimer;
            var er = (0.3 + frac * 0.85) * exp.r * CELL;
            fillBatchCircles(g, [[BOARD_X + exp.x * CELL, BOARD_Y + exp.y * CELL, er]],
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(exp.color, 0.65 * (1 - frac * 0.5))));
            fillBatchCircles(g, [[BOARD_X + exp.x * CELL, BOARD_Y + exp.y * CELL, er * 0.45]],
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.blastCore, 0.9)));
        }
        if (particles.length > 0) {
            var pts = [];
            for (i = 0; i < particles.length; i++) {
                var p = particles[i];
                pts.push([BOARD_X + p.x, BOARD_Y + p.y, 2.5 * (p.life / p.maxLife) + 0.8]);
            }
            fillBatchCircles(g, pts, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.blastCore, 0.85)));
        }

        // 11. Playfield border + hit flash
        strokeRoundRect(g, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 4,
            g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.boardStroke, 1), 1.5));
        if (hitFlashTimer > 0) {
            flashAlpha = Math.min(0.45, hitFlashTimer * 1.1);
            strokeRoundRect(g, BOARD_X + 2, BOARD_Y + 2, BOARD_W - 4, BOARD_H - 4, 4,
                g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.hitFlash, flashAlpha), 4));
        }

        // 12. Overlays
        if (gameState === "ready") {
            drawOverlayCard(g, t, "BATTLE CITY", "ARROWS/WASD + SPACE TO FIRE", t.accScore);
        } else if (gameState === "pause") {
            drawOverlayCard(g, t, "PAUSED", "PRESS P OR RESUME", t.accScore);
        } else if (gameState === "clear") {
            drawOverlayCard(g, t, "STAGE " + stage + " CLEAR!",
                "+" + (stage * 500 + lives * 150) + " BONUS", t.accStage);
        } else if (gameState === "gameover") {
            drawOverlayCard(g, t, newRecordFlag ? "NEW RECORD!" : "GAME OVER",
                "SCORE " + score + " / STAGE " + stage, t.accLives);
        }
    }

    function addVectorTank(grp, originX, originY, tank, fillRgb) {
        var half = TANK_HALF * CELL;
        var rect, d = DIRS[tank.dir];
        var cx = originX + tank.x * CELL;
        var cy = originY - tank.y * CELL;
        rect = grp.pathItems.rectangle(cy + half, cx - half, half * 2, half * 2);
        rect.filled = true;
        rect.fillColor = makeRGBColor(fillRgb);
        rect.stroked = false;

        var bx = (d.dx === -1) ? (cx - half - 4) : ((d.dx === 1) ? cx : (cx - 2.2));
        var bw = (d.dx !== 0) ? (half + 4) : 4.4;
        var by = (d.dy === -1) ? (cy + half + 4) : ((d.dy === 1) ? cy : (cy + 2.2));
        var bh = (d.dy !== 0) ? (half + 4) : 4.4;
        rect = grp.pathItems.rectangle(by, bx, bw, bh);
        rect.filled = true;
        rect.fillColor = makeRGBColor(fillRgb);
        rect.stroked = false;
    }

    function exportToArtboard() {
        var doc, layerName, layer, grp, i, x, y, t, tile;
        var ab, abRect, originX, originY, hdrRect, tf, rect, circ, e, errMsg;

        try {
            if (typeof app === "undefined" || !app) {
                setStatus("statusNoDoc");
                return;
            }
            if (!app.documents || app.documents.length === 0) {
                doc = app.documents.add(DocumentColorSpace.RGB);
            } else {
                doc = app.activeDocument;
            }

            t = THEMES[currentThemeName] || THEMES.dark;
            layerName = "BattleCity_Vector_Board";
            layer = null;
            for (i = 0; i < doc.layers.length; i++) {
                if (doc.layers[i].name === layerName) {
                    layer = doc.layers[i];
                    break;
                }
            }
            if (!layer) {
                layer = doc.layers.add();
                layer.name = layerName;
            }
            layer.locked = false;
            layer.visible = true;

            grp = layer.groupItems.add();
            grp.name = "BattleCity_S" + stage + "_" + score + "pts";

            ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
            abRect = ab.artboardRect;
            originX = (abRect[0] + abRect[2]) * 0.5 - BOARD_W * 0.5;
            originY = (abRect[1] + abRect[3]) * 0.5 + BOARD_H * 0.5;

            hdrRect = grp.pathItems.rectangle(originY + 26, originX, BOARD_W, 22);
            hdrRect.filled = true;
            hdrRect.fillColor = makeRGBColor(t.hudBg);
            hdrRect.stroked = true;
            hdrRect.strokeColor = makeRGBColor(t.hudStroke);
            hdrRect.strokeWidth = 1;

            tf = grp.textFrames.add();
            tf.contents = "BATTLE CITY  |  STAGE " + stage + "  |  SCORE " + score + "  |  FOES " + remainingTotalFoes();
            tf.left = originX + 8;
            tf.top = originY + 21;
            try {
                tf.textRange.characterAttributes.size = 10;
                tf.textRange.characterAttributes.fillColor = makeRGBColor(t.textMain);
            } catch (tfErr) {}

            // Arena background
            rect = grp.pathItems.rectangle(originY, originX, BOARD_W, BOARD_H);
            rect.filled = true;
            rect.fillColor = makeRGBColor(t.ground);
            rect.stroked = true;
            rect.strokeColor = makeRGBColor(t.boardStroke);
            rect.strokeWidth = 1.5;

            // Ground / Brick / Steel / Water / Ice
            for (y = 0; y < ROWS; y++) {
                for (x = 0; x < COLS; x++) {
                    tile = grid[y][x];
                    if (tile === TILE_EMPTY || tile === TILE_EAGLE || tile === TILE_TREES) continue;
                    rect = grp.pathItems.rectangle(originY - y * CELL, originX + x * CELL, CELL, CELL);
                    rect.filled = true;
                    rect.fillColor = makeRGBColor(
                        tile === TILE_BRICK ? t.brick :
                        (tile === TILE_STEEL ? t.steel : (tile === TILE_WATER ? t.water : t.ice))
                    );
                    rect.stroked = false;
                }
            }

            // Eagle HQ
            rect = grp.pathItems.rectangle(originY - 24 * CELL - 2, originX + 12 * CELL + 2, CELL * 2 - 4, CELL * 2 - 4);
            rect.filled = true;
            rect.fillColor = makeRGBColor(eagleDestroyed ? t.eagleDead : t.eagleGold);
            rect.stroked = false;

            // Player & Enemies
            addVectorTank(grp, originX, originY, player, t.playerBody);
            for (i = 0; i < enemies.length; i++) {
                e = enemies[i];
                addVectorTank(grp, originX, originY, e,
                    e.kind === "heavy" ? t.foeHeavy4 :
                    (e.kind === "rapid" ? t.foeRapid : (e.kind === "fast" ? t.foeFast : t.foeBasic)));
            }

            // Bullets
            for (i = 0; i < bullets.length; i++) {
                var bl = bullets[i];
                var br = BULLET_RADIUS * CELL;
                circ = grp.pathItems.ellipse(originY - bl.y * CELL + br, originX + bl.x * CELL - br, br * 2, br * 2);
                circ.filled = true;
                circ.fillColor = makeRGBColor(bl.owner === "player" ? t.bulletPlayer : t.bulletFoe);
                circ.stroked = false;
            }

            // Trees canopy above tanks
            for (y = 0; y < ROWS; y++) {
                for (x = 0; x < COLS; x++) {
                    if (grid[y][x] !== TILE_TREES) continue;
                    rect = grp.pathItems.rectangle(originY - y * CELL - 1, originX + x * CELL + 1, CELL - 2, CELL - 2);
                    rect.filled = true;
                    rect.fillColor = makeRGBColor(t.trees);
                    rect.stroked = false;
                }
            }

            app.redraw();
            setStatus("statusExported", layerName);
        } catch (err) {
            errMsg = (err && err.message) ? err.message : String(err);
            setStatus("statusExportErr", errMsg);
        }
    }

    loadSettings();
    initStage(1);
    gameState = "ready";

    var win = new Window("dialog", WIN_TITLE);
    win.orientation = "column";
    win.alignChildren = ["center", "top"];
    win.spacing = 8;
    win.margins = 12;

    var canvas = win.add("group");
    canvas.preferredSize = [CANVAS_W, CANVAS_H];
    canvas.minimumSize = [CANVAS_W, CANVAS_H];
    canvas.maximumSize = [CANVAS_W, CANVAS_H];
    canvas.onDraw = function () {
        drawSceneUnsafe(this.graphics);
    };
    canvas.addEventListener("mousedown", function () {
        if (gameState === "ready") {
            gameState = "play";
            setStatus("statusPlay");
        }
        refocusControl();
        gameTick("mm");
    });

    var statusText = win.add("statictext", undefined, tr("statusReady"));
    statusText.preferredSize = [CANVAS_W, 20];

    var hintText = win.add("statictext", undefined, tr("hint"));
    hintText.preferredSize = [CANVAS_W, 18];

    var btnRow = win.add("group");
    btnRow.orientation = "row";
    btnRow.alignChildren = ["left", "center"];
    btnRow.preferredSize = [CANVAS_W, 28];
    btnRow.spacing = 6;

    var btnNew = btnRow.add("button", undefined, tr("btnNew"));
    btnNew.preferredSize = [80, 24];
    var btnPause = btnRow.add("button", undefined, tr("btnPause"));
    btnPause.preferredSize = [82, 24];
    var btnExport = btnRow.add("button", undefined, tr("btnExport"));
    btnExport.preferredSize = [104, 24];
    var btnTheme = btnRow.add("button", undefined,
        currentThemeName === "dark" ? tr("btnThemeDark") : tr("btnThemeLight"));
    btnTheme.preferredSize = [104, 24];

    var langList = [];
    var lIdx, selectedLangIdx = 0;
    for (lIdx = 0; lIdx < LANG_ORDER.length; lIdx++) {
        langList.push(LANG_NAMES[LANG_ORDER[lIdx]]);
        if (LANG_ORDER[lIdx] === currentLang) selectedLangIdx = lIdx;
    }
    var ddLang = btnRow.add("dropdownlist", undefined, langList);
    ddLang.preferredSize = [70, 24];
    ddLang.selection = selectedLangIdx;

    var btnClose = btnRow.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [82, 24];

    var HB = { title: WIN_TITLE, token: SAVE_TOKEN, tickMs: 16, highRes: true };
    var lastFrameMs = perfNow();
    var lastRenderMs = 0;
    var lastStatusShown = "";
    var lastPauseLabel = "";
    var lastActionKey = "";
    var lastActionMs = 0;
    var actionKeysDown = {};
    var hbActive = false;
    var closing = false;
    var drawErrLogged = false;
    var tickStats = { start: 0, ticks: 0, f15: 0, mm: 0 };

    perfInit({
        token: SAVE_TOKEN,
        canvases: 1,
        canvasW: CANVAS_W,
        canvasH: CANVAS_H,
        tickMs: HB.tickMs,
        theme: currentThemeName,
        lang: currentLang
    });

    function applyThemeColors() {
        var t = THEMES[currentThemeName] || THEMES.dark;
        try {
            if (win.graphics) {
                win.graphics.backgroundColor = win.graphics.newBrush(
                    win.graphics.BrushType.SOLID_COLOR, rgbToNorm(t.bg, 1)
                );
            }
            if (statusText.graphics) {
                statusText.graphics.foregroundColor = statusText.graphics.newPen(
                    statusText.graphics.PenType.SOLID_COLOR, rgbToNorm(t.textMain, 1), 1
                );
            }
            if (hintText.graphics) {
                hintText.graphics.foregroundColor = hintText.graphics.newPen(
                    hintText.graphics.PenType.SOLID_COLOR, rgbToNorm(t.textSub, 1), 1
                );
            }
        } catch (e) {}
    }

    function refocusControl() {
        try {
            if (!closing) btnPause.active = true;
        } catch (e) {}
    }

    function refreshUI(forceLabels) {
        var t0, t1, t2, t3;
        var nextPause, nextStatus;
        if (closing) return;
        t0 = perfNow();
        if (forceLabels) {
            applyThemeColors();
            win.text = WIN_TITLE;
            btnNew.text = tr("btnNew");
            btnExport.text = tr("btnExport");
            btnTheme.text = (currentThemeName === "dark") ? tr("btnThemeDark") : tr("btnThemeLight");
            btnClose.text = tr("btnClose");
            hintText.text = tr("hint");
        }
        nextPause = (gameState === "pause") ? tr("btnResume") : tr("btnPause");
        if (forceLabels || nextPause !== lastPauseLabel) {
            btnPause.text = nextPause;
            lastPauseLabel = nextPause;
        }
        nextStatus = relaxTranslate(I18N[currentLang] || I18N.en, I18N.en, currentStatusKey, currentStatusArgs);
        if (forceLabels || nextStatus !== lastStatusShown) {
            statusText.text = nextStatus;
            lastStatusShown = nextStatus;
        }
        t1 = perfNow();
        try {
            canvas.hide();
            canvas.show();
        } catch (e1) {}
        t2 = perfNow();
        try {
            canvas.notify("onDraw");
        } catch (e2) {
            if (!drawErrLogged) {
                drawErrLogged = true;
                perfNote("onDraw err: " + ((e2 && e2.message) ? e2.message : e2));
            }
        }
        t3 = perfNow();
        perfFrame(t1 - t0, t2 - t1, t3 - t2);
        lastRenderMs = t3;
    }

    function gameTick(srcTag) {
        var now, dt, elapsed;
        if (closing) return;
        now = perfNow();
        if (!tickStats.start) tickStats.start = now;
        tickStats.ticks++;
        if (srcTag === "f15") tickStats.f15++;
        else if (srcTag === "mm") tickStats.mm++;
        elapsed = now - tickStats.start;
        if (elapsed >= 1000) {
            perfNote("ticks/s=" + Math.round(tickStats.ticks * 1000 / elapsed) + " f15=" + tickStats.f15 + " mm=" + tickStats.mm);
            tickStats.start = now;
            tickStats.ticks = 0;
            tickStats.f15 = 0;
            tickStats.mm = 0;
        }
        dt = (now - lastFrameMs) / 1000;
        if (dt < 0) {
            lastFrameMs = now;
            return;
        }
        if (dt === 0) return;
        lastFrameMs = now;
        if (dt > 0.1) dt = 0.016;
        update(dt);
        if (now - lastRenderMs >= 12) {
            refreshUI(false);
        }
    }

    uiHooks.onStatus = function (msg) {
        if (closing) return;
        if (msg !== lastStatusShown) {
            statusText.text = msg;
            lastStatusShown = msg;
        }
    };
    uiHooks.onHud = function () {
        var nextPause;
        if (closing) return;
        nextPause = (gameState === "pause") ? tr("btnResume") : tr("btnPause");
        if (nextPause !== lastPauseLabel) {
            btnPause.text = nextPause;
            lastPauseLabel = nextPause;
        }
    };
    uiHooks.onInvalidate = function () {
        refreshUI(false);
    };

    function mapKeyToDir(k) {
        var ku;
        if (!k) return null;
        ku = String(k).toUpperCase();
        if (ku === "UP" || ku === "W") return "up";
        if (ku === "DOWN" || ku === "S") return "down";
        if (ku === "LEFT" || ku === "A") return "left";
        if (ku === "RIGHT" || ku === "D") return "right";
        return null;
    }

    function onKeyDown(e) {
        var raw = (e && e.keyName) ? String(e.keyName) : "";
        var k = raw.toUpperCase();
        var dir, now;

        perfKey();
        if (k === "F15") {
            if (e && e.preventDefault) e.preventDefault();
            gameTick("f15");
            return;
        }

        dir = mapKeyToDir(k);
        if (dir) {
            setKey(dir, true);
            refreshUI(false);
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            return;
        }

        if (k === "SPACE" || k === "E") {
            now = perfNow();
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            if (actionKeysDown[k] || (now - lastActionMs < 80 && lastActionKey === k)) return;
            actionKeysDown[k] = true;
            lastActionKey = k;
            lastActionMs = now;
            if (gameState === "gameover") {
                newGame();
            } else {
                firePlayerBullet();
                refreshUI(false);
            }
            refocusControl();
            return;
        }

        if (k === "P") {
            now = perfNow();
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            if (actionKeysDown.P || (now - lastActionMs < 80 && lastActionKey === "P")) return;
            actionKeysDown.P = true;
            lastActionKey = "P";
            lastActionMs = now;
            togglePause();
            refreshUI(false);
            refocusControl();
            return;
        }

        if (k === "R") {
            now = perfNow();
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            if (actionKeysDown.R || (now - lastActionMs < 120 && lastActionKey === "R")) return;
            actionKeysDown.R = true;
            lastActionKey = "R";
            lastActionMs = now;
            newGame();
            refocusControl();
            return;
        }

        if (k === "ESCAPE") {
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            closeWindow();
        }
    }

    function onKeyUp(e) {
        var k = (e && e.keyName) ? String(e.keyName).toUpperCase() : "";
        var dir = mapKeyToDir(k);
        if (dir) {
            setKey(dir, false);
            return;
        }
        if (k === "SPACE" || k === "E" || k === "P" || k === "R") {
            actionKeysDown[k] = false;
        }
    }

    function onMouseMove() {
        gameTick("mm");
    }

    var focusTargets = [win, btnNew, btnPause, btnExport, btnTheme, ddLang, btnClose];
    var fIdx;
    for (fIdx = 0; fIdx < focusTargets.length; fIdx++) {
        focusTargets[fIdx].addEventListener("keydown", onKeyDown);
        focusTargets[fIdx].addEventListener("keyup", onKeyUp);
    }
    win.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousemove", onMouseMove);

    win.onDeactivate = function () {
        clearInputState();
        actionKeysDown = {};
    };

    btnNew.onClick = function () {
        newGame();
        refocusControl();
    };

    btnPause.onClick = function () {
        togglePause();
        refreshUI(false);
        refocusControl();
    };

    btnExport.onClick = function () {
        exportToArtboard();
        refreshUI(false);
        refocusControl();
    };

    btnTheme.onClick = function () {
        currentThemeName = (currentThemeName === "dark") ? "light" : "dark";
        saveSettings();
        refreshUI(true);
        refocusControl();
    };

    ddLang.onChange = function () {
        var idx = ddLang.selection ? ddLang.selection.index : 0;
        if (idx >= 0 && idx < LANG_ORDER.length) {
            currentLang = LANG_ORDER[idx];
            saveSettings();
            refreshUI(true);
        }
        refocusControl();
    };

    function finalizeClose() {
        if (closing) return;
        closing = true;
        clearInputState();
        actionKeysDown = {};
        saveSettings();
        heartbeatStop();
        perfClose();
    }

    function closeWindow() {
        finalizeClose();
        try { win.close(); } catch (e) {}
    }

    btnClose.onClick = closeWindow;
    win.onClose = function () {
        finalizeClose();
    };

    win.onShow = function () {
        applyThemeColors();
        refocusControl();
        lastFrameMs = perfNow();
        hbActive = heartbeatStart(HB);
        perfNote(
            hbActive
                ? ("heartbeat started, tickMs=" + HB.tickMs + ", highRes=" + Boolean(HB.highRes))
                : ("heartbeat FAILED: " + heartbeatLastError())
        );
        if (!hbActive) {
            setStatus("statusNoHeartbeat");
        }
        refreshUI(true);
    };

    try {
        applyThemeColors();
        win.center();
        win.show();
    } finally {
        finalizeClose();
    }
})();
