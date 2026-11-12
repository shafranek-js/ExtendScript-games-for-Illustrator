#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"

(function () {
    var WIN_TITLE = "Xonix - Designer Edition";
    var SAVE_TOKEN = "Xonix";

    var COLS = 52;
    var ROWS = 34;
    var BORDER_THICK = 2;
    var CELL = 11;

    var PAD_X = 16;
    var PAD_TOP = 14;
    var HUD_H = 74;
    var GAP_HUD = 10;
    var PAD_BOT = 14;

    var BOARD_X = PAD_X;
    var BOARD_Y = PAD_TOP + HUD_H + GAP_HUD;
    var BOARD_W = COLS * CELL;
    var BOARD_H = ROWS * CELL;

    var CANVAS_W = PAD_X * 2 + BOARD_W;
    var CANVAS_H = BOARD_Y + BOARD_H + PAD_BOT;

    var CELL_SEA = 0;
    var CELL_LAND = 1;
    var CELL_TRAIL = 2;

    var TOTAL_INTERIOR = (COLS - BORDER_THICK * 2) * (ROWS - BORDER_THICK * 2);

    var CARVE_STEP_SEC = 0.088;
    var LAND_STEP_SEC = 0.072;
    var SEA_BALL_R = 0.38;
    var PATROL_R = 0.36;

    var DIRS = {
        up:    { dx:  0, dy: -1, opp: "down" },
        down:  { dx:  0, dy:  1, opp: "up" },
        left:  { dx: -1, dy:  0, opp: "right" },
        right: { dx:  1, dy:  0, opp: "left" }
    };

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
            winTitle: "Xonix - Designer Edition",
            btnNew: "New Game",
            btnPause: "Pause",
            btnResume: "Resume",
            btnExport: "\u2756 To Artboard",
            btnThemeDark: "Theme: Dark",
            btnThemeLight: "Theme: Light",
            btnClose: "Close (Esc)",
            hint: "Arrows / WASD: move & carve  |  Space / P: pause  |  R: restart  |  Claim 75%+ area",
            hudScore: "SCORE",
            hudBest: "BEST",
            hudArea: "AREA",
            hudStage: "STAGE",
            hudLives: "LIVES",
            bannerReadyTitle: "READY TO CARVE",
            bannerReadySub: "Press Arrow, WASD, or Space to launch",
            bannerPauseTitle: "PAUSED",
            bannerPauseSub: "Press Space or P to resume",
            bannerClearTitle: "STAGE {0} CLEARED!",
            bannerClearSub: "+{0} bonus pts  -  Advancing...",
            bannerOverTitle: "GAME OVER",
            bannerOverNew: "NEW RECORD!",
            bannerOverSub: "Score {0}  |  Stage {1}  |  Space / R to restart",
            statusReady: "Ready! Move onto the dark sea to slice territory.",
            statusCarve: "Carving sea... return to cyan land to capture!",
            statusSafe: "On safe land. Pick a spot to cut.",
            statusCaptured: "Captured territory! +{0} pts",
            statusBigCapture: "Mega slice! {1} sea tiles sealed (+{0} pts)",
            statusPaused: "Game paused. Press Space or P to resume.",
            statusLostTrail: "You crossed your own trail! Lives left: {0}",
            statusLostSea: "Sea orb severed your line! Lives left: {0}",
            statusLostPatrol: "Land patrol caught you! Lives left: {0}",
            statusStageClear: "Stage {0} cleared ({1}%)! +{2} bonus pts.",
            statusGameOver: "Game over! Final score: {0} (Stage {1}).",
            statusNoDoc: "Open an Illustrator document first to export vectors.",
            statusExported: "Exported Xonix board to layer \"{0}\".",
            statusExportErr: "Vector export failed: {0}",
            statusNoHeartbeat: "Heartbeat unavailable - move mouse over canvas."
        },
        ru: {
            winTitle: "Xonix - \u0414\u0438\u0437\u0430\u0439\u043D\u0435\u0440\u0441\u043A\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F",
            btnNew: "\u041D\u043E\u0432\u0430\u044F \u0438\u0433\u0440\u0430",
            btnPause: "\u041F\u0430\u0443\u0437\u0430",
            btnResume: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
            btnExport: "\u2756 \u041D\u0430 \u0430\u0440\u0442\u0431\u043E\u0440\u0434",
            btnThemeDark: "\u0422\u0435\u043C\u0430: \u0422\u0451\u043C\u043D\u0430\u044F",
            btnThemeLight: "\u0422\u0435\u043C\u0430: \u0421\u0432\u0435\u0442\u043B\u0430\u044F",
            btnClose: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C (Esc)",
            hint: "\u0421\u0442\u0440\u0435\u043B\u043A\u0438 / WASD: \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435  |  Space / P: \u043F\u0430\u0443\u0437\u0430  |  R: \u0440\u0435\u0441\u0442\u0430\u0440\u0442  |  \u0426\u0435\u043B\u044C: 75%+",
            hudScore: "SCORE",
            hudBest: "BEST",
            hudArea: "AREA",
            hudStage: "STAGE",
            hudLives: "LIVES",
            bannerReadyTitle: "\u0413\u041E\u0422\u041E\u0412 \u041A \u0417\u0410\u0425\u0412\u0410\u0422\u0423",
            bannerReadySub: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0441\u0442\u0440\u0435\u043B\u043A\u0443, WASD \u0438\u043B\u0438 Space \u0434\u043B\u044F \u0441\u0442\u0430\u0440\u0442\u0430",
            bannerPauseTitle: "\u041F\u0410\u0423\u0417\u0410",
            bannerPauseSub: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 Space \u0438\u043B\u0438 P, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
            bannerClearTitle: "\u042D\u0422\u0410\u041F {0} \u041F\u0420\u041E\u0419\u0414\u0415\u041D!",
            bannerClearSub: "+{0} \u0431\u043E\u043D\u0443\u0441  -  \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0443\u0440\u043E\u0432\u0435\u043D\u044C...",
            bannerOverTitle: "\u0418\u0413\u0420\u0410 \u041E\u041A\u041E\u041D\u0427\u0415\u041D\u0410",
            bannerOverNew: "\u041D\u041E\u0412\u042B\u0419 \u0420\u0415\u041A\u041E\u0420\u0414!",
            bannerOverSub: "\u0421\u0447\u0451\u0442 {0}  |  \u042D\u0442\u0430\u043F {1}  |  Space / R \u0434\u043B\u044F \u043F\u043E\u0432\u0442\u043E\u0440\u0430",
            statusReady: "\u0413\u043E\u0442\u043E\u0432\u043E! \u0412\u044B\u0445\u043E\u0434\u0438\u0442\u0435 \u0432 \u0442\u0451\u043C\u043D\u043E\u0435 \u043C\u043E\u0440\u0435 \u0438 \u043E\u0442\u0440\u0435\u0437\u0430\u0439\u0442\u0435 \u0442\u0435\u0440\u0440\u0438\u0442\u043E\u0440\u0438\u044E.",
            statusCarve: "\u0420\u0435\u0436\u0435\u043C \u043C\u043E\u0440\u0435... \u0432\u0435\u0440\u043D\u0438\u0442\u0435\u0441\u044C \u043D\u0430 \u0441\u0443\u0448\u0443 \u0434\u043B\u044F \u0437\u0430\u0445\u0432\u0430\u0442\u0430!",
            statusSafe: "\u041D\u0430 \u0441\u0443\u0448\u0435. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0435\u0441\u0442\u043E \u0434\u043B\u044F \u0441\u0440\u0435\u0437\u0430.",
            statusCaptured: "\u0422\u0435\u0440\u0440\u0438\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u0445\u0432\u0430\u0447\u0435\u043D\u0430! +{0} \u043E\u0447\u043A\u043E\u0432",
            statusBigCapture: "\u041C\u0435\u0433\u0430-\u0437\u0430\u0445\u0432\u0430\u0442! \u0417\u0430\u043A\u0440\u044B\u0442\u043E {1} \u043A\u043B\u0435\u0442\u043E\u043A (+{0} \u043E\u0447\u043A\u043E\u0432)",
            statusPaused: "\u041F\u0430\u0443\u0437\u0430. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 Space \u0438\u043B\u0438 P \u0434\u043B\u044F \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u044F.",
            statusLostTrail: "\u041F\u0435\u0440\u0435\u0441\u0435\u043A\u043B\u0438 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u0441\u043B\u0435\u0434! \u0416\u0438\u0437\u043D\u0435\u0439: {0}",
            statusLostSea: "\u041C\u043E\u0440\u0441\u043A\u043E\u0439 \u0448\u0430\u0440 \u043F\u0435\u0440\u0435\u0440\u0432\u0430\u043B \u043B\u0438\u043D\u0438\u044E! \u0416\u0438\u0437\u043D\u0435\u0439: {0}",
            statusLostPatrol: "\u041F\u043E\u0439\u043C\u0430\u043D\u044B \u0431\u0435\u0440\u0435\u0433\u043E\u0432\u044B\u043C \u043F\u0430\u0442\u0440\u0443\u043B\u0451\u043C! \u0416\u0438\u0437\u043D\u0435\u0439: {0}",
            statusStageClear: "\u042D\u0442\u0430\u043F {0} \u043F\u0440\u043E\u0439\u0434\u0435\u043D ({1}%)! +{2} \u0431\u043E\u043D\u0443\u0441\u0430.",
            statusGameOver: "\u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430! \u0421\u0447\u0451\u0442: {0} (\u042D\u0442\u0430\u043F {1}).",
            statusNoDoc: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 Illustrator.",
            statusExported: "\u041F\u043E\u043B\u0435 Xonix \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u043D\u0430 \u0441\u043B\u043E\u0439 \"{0}\".",
            statusExportErr: "\u041E\u0448\u0438\u0431\u043A\u0430 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430: {0}",
            statusNoHeartbeat: "\u0422\u0430\u0439\u043C\u0435\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D - \u0434\u0432\u0438\u0433\u0430\u0439\u0442\u0435 \u043C\u044B\u0448\u044C\u044E."
        },
        cs: {
            winTitle: "Xonix - Designer Edice",
            btnNew: "Nov\u00E1 hra",
            btnPause: "Pauza",
            btnResume: "Pokra\u010Dovat",
            btnExport: "\u2756 Na pl\u00E1tno",
            btnThemeDark: "Motiv: Tmav\u00FD",
            btnThemeLight: "Motiv: Sv\u011Btl\u00FD",
            btnClose: "Zav\u0159\u00EDt (Esc)",
            hint: "\u0160ipky / WASD: pohyb  |  Space / P: pauza  |  R: restart  |  Zaberte 75%+",
            hudScore: "SCORE",
            hudBest: "BEST",
            hudArea: "AREA",
            hudStage: "STAGE",
            hudLives: "LIVES",
            bannerReadyTitle: "P\u0158IPRAVENO",
            bannerReadySub: "Stiskn\u011Bte \u0161ipku, WASD nebo Space",
            bannerPauseTitle: "PAUZA",
            bannerPauseSub: "Pokra\u010Dujte kl\u00E1vesou Space nebo P",
            bannerClearTitle: "\u00DAROVE\u0147 {0} HOTOVA!",
            bannerClearSub: "+{0} bonus  -  Dal\u0161\u00ED kolo...",
            bannerOverTitle: "KONEC HRY",
            bannerOverNew: "NOV\u00DD REKORD!",
            bannerOverSub: "Sk\u00F3re {0}  |  Kolo {1}  |  Space / R restart",
            statusReady: "P\u0159ipraveno! Vje\u010Fte do mo\u0159e a odd\u011Blte \u00FAzem\u00ED.",
            statusCarve: "\u0158e\u017Eete \u00FAzem\u00ED... vra\u0165te se na pevninu!",
            statusSafe: "Na bezpe\u010Dn\u00E9 pevnin\u011B.",
            statusCaptured: "\u00DAzem\u00ED zabr\u00E1no! +{0} b.",
            statusBigCapture: "Velk\u00FD z\u00E1bor! {1} pol\u00ED (+{0} b.)",
            statusPaused: "Pozastaveno. Space nebo P pokra\u010Duje.",
            statusLostTrail: "P\u0159ekr\u00ED\u017Eili jste vlastn\u00ED stopu! \u017Divoty: {0}",
            statusLostSea: "Mo\u0159sk\u00E1 koule p\u0159eru\u0161ila stopu! \u017Divoty: {0}",
            statusLostPatrol: "Zas\u00E1hl v\u00E1s str\u00E1\u017Ece pevniny! \u017Divoty: {0}",
            statusStageClear: "Kolo {0} dokon\u010Deno ({1}%)! +{2} bonus.",
            statusGameOver: "Konec hry! Sk\u00F3re: {0} (Kolo {1}).",
            statusNoDoc: "Nejprve otev\u0159ete dokument Illustratoru.",
            statusExported: "Exportov\u00E1no na vrstvu \"{0}\".",
            statusExportErr: "Chyba exportu: {0}",
            statusNoHeartbeat: "\u010Casova\u010D nen\u00ED dostupn\u00FD - pohybujte my\u0161\u00ED."
        },
        ro: {
            winTitle: "Xonix - Edi\u021Bie Designer",
            btnNew: "Joc nou",
            btnPause: "Pauz\u0103",
            btnResume: "Continu\u0103",
            btnExport: "\u2756 Pe Artboard",
            btnThemeDark: "Tem\u0103: \u00CEntunecat",
            btnThemeLight: "Tem\u0103: Luminos",
            btnClose: "\u00CEnchide (Esc)",
            hint: "S\u0103ge\u021Bi / WASD: mi\u0219care  |  Space / P: pauz\u0103  |  R: restart  |  \u021Aint\u0103: 75%+",
            hudScore: "SCORE",
            hudBest: "BEST",
            hudArea: "AREA",
            hudStage: "STAGE",
            hudLives: "LIVES",
            bannerReadyTitle: "GATA DE START",
            bannerReadySub: "Apas\u0103 s\u0103ge\u021Bi, WASD sau Space",
            bannerPauseTitle: "PAUZ\u0102",
            bannerPauseSub: "Apas\u0103 Space sau P pentru continuare",
            bannerClearTitle: "NIVEL {0} COMPLET!",
            bannerClearSub: "+{0} bonus  -  Urm\u0103torul nivel...",
            bannerOverTitle: "JOC TERMINAT",
            bannerOverNew: "RECORD NOU!",
            bannerOverSub: "Scor {0}  |  Nivel {1}  |  Space / R restart",
            statusReady: "Gata! Intr\u0103 \u00EEn mare pentru a cuceri teritoriu.",
            statusCarve: "Traseu activ... \u00EEntoarce-te pe uscat!",
            statusSafe: "Pe uscat sigur.",
            statusCaptured: "Teritoriu cucerit! +{0} pct",
            statusBigCapture: "Captur\u0103 mare! {1} celule (+{0} pct)",
            statusPaused: "Pauz\u0103. Apas\u0103 Space sau P.",
            statusLostTrail: "Ai atins propriul traseu! Vie\u021Bi: {0}",
            statusLostSea: "Sfera marin\u0103 \u021Bi-a t\u0103iat linia! Vie\u021Bi: {0}",
            statusLostPatrol: "Patrula terestr\u0103 te-a prins! Vie\u021Bi: {0}",
            statusStageClear: "Nivel {0} trecut ({1}%)! +{2} bonus.",
            statusGameOver: "Joc terminat! Scor: {0} (Nivel {1}).",
            statusNoDoc: "Deschide \u00EEnt\u00E2i un document Illustrator.",
            statusExported: "Exportat pe stratul \"{0}\".",
            statusExportErr: "Eroare la export: {0}",
            statusNoHeartbeat: "Temporizator indisponibil - mi\u0219ca\u021Bi mouse-ul."
        },
        hi: {
            winTitle: "Xonix - \u0921\u093F\u091C\u093C\u093E\u0907\u0928\u0930 \u0938\u0902\u0938\u094D\u0915\u0930\u0923",
            btnNew: "\u0928\u092F\u093E \u0916\u0947\u0932",
            btnPause: "\u0935\u093F\u0930\u093E\u092E",
            btnResume: "\u091C\u093E\u0930\u0940 \u0930\u0916\u0947\u0902",
            btnExport: "\u2756 \u0906\u0930\u094D\u091F\u092C\u094B\u0930\u094D\u0921",
            btnThemeDark: "\u0925\u0940\u092E: \u0921\u093E\u0930\u094D\u0915",
            btnThemeLight: "\u0925\u0940\u092E: \u0932\u093E\u0907\u091F",
            btnClose: "\u092C\u0902\u0926 \u0915\u0930\u0947\u0902 (Esc)",
            hint: "Arrows / WASD: \u091A\u0932\u0947\u0902  |  Space / P: \u0935\u093F\u0930\u093E\u092E  |  R: \u092A\u0941\u0928\u0903 \u0936\u0941\u0930\u0942  |  \u0932\u0915\u094D\u0937\u094D\u092F: 75%+",
            hudScore: "SCORE",
            hudBest: "BEST",
            hudArea: "AREA",
            hudStage: "STAGE",
            hudLives: "LIVES",
            bannerReadyTitle: "\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0924\u0948\u092F\u093E\u0930",
            bannerReadySub: "\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F Arrow, WASD \u092F\u093E Space \u0926\u092C\u093E\u090F\u0902",
            bannerPauseTitle: "\u0935\u093F\u0930\u093E\u092E",
            bannerPauseSub: "\u091C\u093E\u0930\u0940 \u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F Space \u092F\u093E P \u0926\u092C\u093E\u090F\u0902",
            bannerClearTitle: "\u0938\u094D\u0924\u0930 {0} \u092A\u0942\u0930\u094D\u0923!",
            bannerClearSub: "+{0} \u092C\u094B\u0928\u0938  -  \u0905\u0917\u0932\u093E \u0938\u094D\u0924\u0930...",
            bannerOverTitle: "\u0916\u0947\u0932 \u0938\u092E\u093E\u092A\u094D\u0924",
            bannerOverNew: "\u0928\u092F\u093E \u0930\u093F\u0915\u0949\u0930\u094D\u0921!",
            bannerOverSub: "\u0938\u094D\u0915\u094B\u0930 {0}  |  \u0938\u094D\u0924\u0930 {1}  |  Space / R",
            statusReady: "\u0924\u0948\u092F\u093E\u0930! \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u091C\u0940\u0924\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u092E\u0941\u0926\u094D\u0930 \u092E\u0947\u0902 \u091C\u093E\u090F\u0902\u0964",
            statusCarve: "\u0915\u091F\u093E\u0908 \u091C\u093E\u0930\u0940... \u092D\u0942\u092E\u093F \u092A\u0930 \u0932\u094C\u091F\u0947\u0902!",
            statusSafe: "\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092D\u0942\u092E\u093F \u092A\u0930\u0964",
            statusCaptured: "\u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u0915\u092C\u094D\u091C\u093C\u093E! +{0}",
            statusBigCapture: "\u092C\u0921\u093C\u0940 \u091C\u0940\u0924! {1} \u0915\u094B\u0937 (+{0})",
            statusPaused: "\u0916\u0947\u0932 \u0930\u0941\u0915\u093E \u0939\u0948\u0964",
            statusLostTrail: "\u0905\u092A\u0928\u0940 \u0930\u0947\u0916\u093E \u091F\u0915\u0930\u093E \u0917\u0908! \u091C\u0940\u0935\u0928: {0}",
            statusLostSea: "\u0938\u092E\u0941\u0926\u094D\u0930\u0940 \u0917\u094B\u0932\u0947 \u0928\u0947 \u0930\u0947\u0916\u093E \u0915\u093E\u091F\u0940! \u091C\u0940\u0935\u0928: {0}",
            statusLostPatrol: "\u092D\u0942\u092E\u093F \u0917\u0936\u094D\u0924 \u0928\u0947 \u092A\u0915\u0921\u093C\u093E! \u091C\u0940\u0935\u0928: {0}",
            statusStageClear: "\u0938\u094D\u0924\u0930 {0} \u092A\u0942\u0930\u094D\u0923 ({1}%)! +{2} \u092C\u094B\u0928\u0938\u0964",
            statusGameOver: "\u0916\u0947\u0932 \u0938\u092E\u093E\u092A\u094D\u0924! \u0938\u094D\u0915\u094B\u0930: {0} (\u0938\u094D\u0924\u0930 {1})\u0964",
            statusNoDoc: "\u092A\u0939\u0932\u0947 Illustrator \u0926\u0938\u094D\u0924\u093E\u0935\u0947\u091C\u093C \u0916\u094B\u0932\u0947\u0902\u0964",
            statusExported: "\"{0}\" \u0932\u0947\u092F\u0930 \u092E\u0947\u0902 \u0928\u093F\u0930\u094D\u092F\u093E\u0924 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964",
            statusExportErr: "\u0928\u093F\u0930\u094D\u092F\u093E\u0924 \u0935\u093F\u092B\u0932: {0}",
            statusNoHeartbeat: "\u091F\u093E\u0907\u092E\u0930 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 - \u092E\u093E\u0909\u0938 \u0939\u093F\u0932\u093E\u090F\u0902\u0964"
        }
    };

    var THEMES = {
        dark: {
            bg: [11, 15, 26],
            hudBg: [18, 25, 42],
            hudStroke: [42, 58, 92],
            hudLabel: [130, 150, 185],
            sea: [8, 12, 23],
            seaGrid: [18, 28, 48],
            boardStroke: [52, 82, 130],
            land: [22, 84, 114],
            landHi: [46, 155, 198],
            trail: [250, 204, 21],
            trailCore: [254, 249, 195],
            runnerOuter: [255, 255, 255],
            runnerCore: [56, 189, 248],
            runnerAura: [56, 189, 248],
            seaBallGlow: [16, 185, 129],
            seaBallBody: [52, 211, 153],
            seaBallCore: [236, 253, 245],
            patrolGlow: [225, 29, 72],
            patrolBody: [244, 63, 94],
            patrolCore: [255, 228, 230],
            accScore: [250, 204, 21],
            accArea: [56, 189, 248],
            accStage: [52, 211, 153],
            accLives: [244, 63, 94],
            barTrack: [26, 36, 58],
            barTarget: [255, 255, 255],
            overlayBg: [12, 18, 32],
            overlayStroke: [56, 189, 248],
            textMain: [241, 245, 249],
            textSub: [148, 163, 184],
            hitFlash: [244, 63, 94]
        },
        light: {
            bg: [235, 240, 247],
            hudBg: [255, 255, 255],
            hudStroke: [203, 213, 225],
            hudLabel: [100, 116, 139],
            sea: [248, 250, 252],
            seaGrid: [226, 232, 240],
            boardStroke: [148, 163, 184],
            land: [14, 165, 233],
            landHi: [2, 132, 199],
            trail: [217, 119, 6],
            trailCore: [254, 243, 199],
            runnerOuter: [15, 23, 42],
            runnerCore: [56, 189, 248],
            runnerAura: [2, 132, 199],
            seaBallGlow: [124, 58, 237],
            seaBallBody: [139, 92, 246],
            seaBallCore: [245, 243, 255],
            patrolGlow: [190, 18, 60],
            patrolBody: [225, 29, 72],
            patrolCore: [255, 241, 242],
            accScore: [180, 83, 9],
            accArea: [2, 132, 199],
            accStage: [5, 150, 105],
            accLives: [225, 29, 72],
            barTrack: [226, 232, 240],
            barTarget: [15, 23, 42],
            overlayBg: [255, 255, 255],
            overlayStroke: [2, 132, 199],
            textMain: [15, 23, 42],
            textSub: [71, 85, 105],
            hitFlash: [225, 29, 72]
        }
    };

    // Normalized polyline glyph strokes in [0..1] x [0..1] box
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
        "%": [[0.16, 0.92, 0.84, 0.08], [0.16, 0.14, 0.34, 0.14, 0.34, 0.32, 0.16, 0.32, 0.16, 0.14], [0.66, 0.68, 0.84, 0.68, 0.84, 0.86, 0.66, 0.86, 0.66, 0.68]],
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
    var targetPct = 75;
    var capturedCount = 0;
    var capturedPct = 0;
    var gameState = "ready";
    var clearTimer = 0;
    var hitFlashTimer = 0;
    var globalTime = 0;
    var newRecordFlag = false;
    var nextBonusLifeScore = 15000;

    var currentStatusKey = "statusReady";
    var currentStatusArgs = [];

    var grid = [];
    var trail = [];
    var seaBalls = [];
    var landPatrols = [];
    var particles = [];

    var runner = {
        cx: 26,
        cy: 0,
        px: 26 * 11 + 5.5,
        py: 5.5,
        dir: "right",
        drawing: false,
        moveTimer: 0,
        invulnTimer: 0
    };

    var heldKeys = { up: false, down: false, left: false, right: false };
    var dirStack = [];
    var queuedDir = null;

    var uiHooks = {
        onStatus: null,
        onHud: null,
        onInvalidate: null
    };

    function tr(key) {
        var args = [];
        var i;
        for (i = 1; i < arguments.length; i++) args.push(arguments[i]);
        return translateString(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    function setStatus(key) {
        var args = [];
        var i;
        for (i = 1; i < arguments.length; i++) args.push(arguments[i]);
        currentStatusKey = key;
        currentStatusArgs = args;
        if (uiHooks.onStatus) {
            uiHooks.onStatus(translateString(I18N[currentLang] || I18N.en, I18N.en, key, args));
        }
    }

    function clampNum(v, lo, hi) {
        if (v < lo) return lo;
        if (v > hi) return hi;
        return v;
    }

    function padZero(n, width) {
        var s = String(Math.max(0, Math.floor(n)));
        while (s.length < width) s = "0" + s;
        return s;
    }

    function isKeyInStack(dirName) {
        var i;
        for (i = 0; i < dirStack.length; i++) {
            if (dirStack[i] === dirName) return i;
        }
        return -1;
    }

    function clearInputState() {
        heldKeys.up = false;
        heldKeys.down = false;
        heldKeys.left = false;
        heldKeys.right = false;
        dirStack = [];
        queuedDir = null;
    }

    function loadSettings() {
        var f, data;
        try {
            f = getGameSaveFile(SAVE_TOKEN);
            data = readKeyValueFile(f);
            if (!data) return;
            if (data.best) bestScore = parseInt(data.best, 10) || 0;
            if (data.theme && THEMES[data.theme]) currentThemeName = data.theme;
            if (data.lang && I18N[data.lang]) currentLang = data.lang;
        } catch (e) {}
    }

    function saveSettings() {
        try {
            var f = getGameSaveFile(SAVE_TOKEN);
            writeKeyValueFile(f, [
                "best=" + bestScore,
                "theme=" + currentThemeName,
                "lang=" + currentLang
            ]);
        } catch (e) {}
    }

    function buildEmptyGrid() {
        var y, x, row;
        grid = [];
        for (y = 0; y < ROWS; y++) {
            row = [];
            for (x = 0; x < COLS; x++) {
                if (x < BORDER_THICK || x >= COLS - BORDER_THICK ||
                    y < BORDER_THICK || y >= ROWS - BORDER_THICK) {
                    row.push(CELL_LAND);
                } else {
                    row.push(CELL_SEA);
                }
            }
            grid.push(row);
        }
    }

    function recountCaptured() {
        var y, x, cnt = 0;
        for (y = BORDER_THICK; y < ROWS - BORDER_THICK; y++) {
            for (x = BORDER_THICK; x < COLS - BORDER_THICK; x++) {
                if (grid[y][x] === CELL_LAND) cnt++;
            }
        }
        capturedCount = cnt;
        capturedPct = Math.floor((cnt * 100) / TOTAL_INTERIOR);
        return cnt;
    }

    function resetRunnerToTop(invSec) {
        var sx = Math.floor(COLS / 2);
        var i, pt;
        for (i = 0; i < trail.length; i++) {
            pt = trail[i];
            if (pt.y >= BORDER_THICK && pt.y < ROWS - BORDER_THICK &&
                pt.x >= BORDER_THICK && pt.x < COLS - BORDER_THICK) {
                grid[pt.y][pt.x] = CELL_SEA;
            }
        }
        trail = [];
        runner.cx = sx;
        runner.cy = 0;
        runner.px = (sx + 0.5) * CELL;
        runner.py = 0.5 * CELL;
        runner.dir = "right";
        runner.drawing = false;
        runner.moveTimer = 0;
        runner.invulnTimer = invSec;

        for (i = 0; i < landPatrols.length; i++) {
            var p = landPatrols[i];
            var dx = p.x - (sx + 0.5);
            var dy = p.y - 0.5;
            if (dx * dx + dy * dy < 49) {
                p.x = sx + 0.5;
                p.y = ROWS - 1.0;
            }
        }
        clearInputState();
    }

    function spawnStageEntities(stageNum) {
        var i, angleSignX, angleSignY, bx, by;
        var seaCount = Math.min(8, 1 + stageNum);
        var patrolCount = (stageNum >= 8) ? 3 : ((stageNum >= 4) ? 2 : 1);
        var seaSpeed = 8.8 + Math.min(4.8, (stageNum - 1) * 0.62);
        var patrolSpeed = 6.6 + Math.min(3.4, (stageNum - 1) * 0.45);
        var minX = BORDER_THICK + 3;
        var maxX = COLS - BORDER_THICK - 3;
        var minY = BORDER_THICK + 3;
        var maxY = ROWS - BORDER_THICK - 3;

        seaBalls = [];
        for (i = 0; i < seaCount; i++) {
            bx = minX + (((i * 13 + stageNum * 7) % (maxX - minX + 1)));
            by = minY + (((i * 9 + stageNum * 5) % (maxY - minY + 1)));
            angleSignX = ((i + stageNum) % 2 === 0) ? 1 : -1;
            angleSignY = (i % 3 === 0) ? -1 : 1;
            seaBalls.push({
                x: bx + 0.5,
                y: by + 0.5,
                vx: angleSignX * seaSpeed * 0.7071,
                vy: angleSignY * seaSpeed * 0.7071,
                phase: i * 0.9
            });
        }

        landPatrols = [];
        for (i = 0; i < patrolCount; i++) {
            var px = (i === 0) ? (Math.floor(COLS / 2) + 0.5) : ((i === 1) ? 1.0 : (COLS - 1.0));
            var py = (i === 0) ? (ROWS - 1.0) : (Math.floor(ROWS / 2) + 0.5);
            landPatrols.push({
                x: px,
                y: py,
                vx: ((i % 2 === 0) ? 1 : -1) * patrolSpeed * 0.7071,
                vy: ((i % 2 === 0) ? -1 : 1) * patrolSpeed * 0.7071,
                phase: i * 1.4
            });
        }
    }

    function initStage(stageNum) {
        stage = stageNum;
        targetPct = Math.min(85, 75 + Math.floor((stageNum - 1) / 2) * 2);
        buildEmptyGrid();
        trail = [];
        particles = [];
        recountCaptured();
        spawnStageEntities(stageNum);
        resetRunnerToTop(1.5);
        clearTimer = 0;
        hitFlashTimer = 0;
    }

    function newGame() {
        score = 0;
        lives = 3;
        newRecordFlag = false;
        nextBonusLifeScore = 15000;
        initStage(1);
        gameState = "ready";
        setStatus("statusReady");
        if (uiHooks.onHud) uiHooks.onHud();
        if (uiHooks.onInvalidate) uiHooks.onInvalidate();
    }

    function addScore(pts) {
        if (pts <= 0) return;
        score += pts;
        if (score >= nextBonusLifeScore) {
            if (lives < 5) lives++;
            nextBonusLifeScore += 20000;
        }
        if (score > bestScore) {
            bestScore = score;
            newRecordFlag = true;
            saveSettings();
        }
    }

    function spawnCaptureSparks(cells, rgbColor) {
        var i, c, count, step, idx;
        if (!cells || cells.length === 0) return;
        count = Math.min(26, cells.length);
        step = Math.max(1, Math.floor(cells.length / count));
        for (i = 0; i < count; i++) {
            idx = (i * step) % cells.length;
            c = cells[idx];
            particles.push({
                x: (c.x + 0.5) * CELL,
                y: (c.y + 0.5) * CELL,
                vx: ((i % 5) - 2) * 22,
                vy: (((i * 3) % 5) - 2) * 22,
                life: 0.45 + (i % 3) * 0.12,
                maxLife: 0.65,
                color: rgbColor
            });
        }
    }

    function triggerStageClear() {
        var extra = Math.max(0, capturedPct - targetPct) * 60 + stage * 500;
        addScore(extra);
        clearTimer = 1.6;
        gameState = "clear";
        runner.drawing = false;
        setStatus("statusStageClear", stage, capturedPct, extra);
        if (uiHooks.onHud) uiHooks.onHud();
    }

    function captureTerritory() {
        var trailCount = trail.length;
        var i, pt, x, y, nx, ny, cx, cy;
        var visited = [];
        var qx = [];
        var qy = [];
        var head = 0;
        var ddx = [1, -1, 0, 0];
        var ddy = [0, 0, 1, -1];
        var enclosed = 0;
        var capturedCells = [];
        var totalCells = COLS * ROWS;
        var gained, bonusPts, theme;

        for (i = 0; i < totalCells; i++) visited.push(0);

        for (i = 0; i < trailCount; i++) {
            pt = trail[i];
            grid[pt.y][pt.x] = CELL_LAND;
            capturedCells.push(pt);
        }
        trail = [];

        for (i = 0; i < seaBalls.length; i++) {
            cx = clampNum(Math.floor(seaBalls[i].x), 0, COLS - 1);
            cy = clampNum(Math.floor(seaBalls[i].y), 0, ROWS - 1);
            if (grid[cy][cx] === CELL_SEA && !visited[cy * COLS + cx]) {
                visited[cy * COLS + cx] = 1;
                qx.push(cx);
                qy.push(cy);
            }
        }

        while (head < qx.length) {
            cx = qx[head];
            cy = qy[head];
            head++;
            for (i = 0; i < 4; i++) {
                nx = cx + ddx[i];
                ny = cy + ddy[i];
                if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                    if (grid[ny][nx] === CELL_SEA && !visited[ny * COLS + nx]) {
                        visited[ny * COLS + nx] = 1;
                        qx.push(nx);
                        qy.push(ny);
                    }
                }
            }
        }

        for (y = BORDER_THICK; y < ROWS - BORDER_THICK; y++) {
            for (x = BORDER_THICK; x < COLS - BORDER_THICK; x++) {
                if (grid[y][x] === CELL_SEA && !visited[y * COLS + x]) {
                    grid[y][x] = CELL_LAND;
                    enclosed++;
                    capturedCells.push({ x: x, y: y });
                }
            }
        }

        recountCaptured();
        bonusPts = (enclosed >= 50) ? Math.floor(enclosed * 4) : 0;
        gained = (trailCount + enclosed) * 10 + bonusPts;
        addScore(gained);

        theme = THEMES[currentThemeName] || THEMES.dark;
        spawnCaptureSparks(capturedCells, theme.landHi);

        if (capturedPct >= targetPct) {
            triggerStageClear();
        } else {
            if (enclosed >= 50) {
                setStatus("statusBigCapture", gained, enclosed);
            } else {
                setStatus("statusCaptured", gained);
            }
            if (uiHooks.onHud) uiHooks.onHud();
        }
    }

    function loseLife(reason) {
        var theme = THEMES[currentThemeName] || THEMES.dark;
        if (gameState !== "play") return;

        spawnCaptureSparks([{ x: runner.cx, y: runner.cy }], theme.patrolBody);
        lives--;
        hitFlashTimer = 0.35;

        if (lives <= 0) {
            lives = 0;
            resetRunnerToTop(0);
            gameState = "gameover";
            setStatus("statusGameOver", score, stage);
            saveSettings();
        } else {
            resetRunnerToTop(1.6);
            if (reason === "trail") {
                setStatus("statusLostTrail", lives);
            } else if (reason === "sea" || reason === "cut") {
                setStatus("statusLostSea", lives);
            } else {
                setStatus("statusLostPatrol", lives);
            }
        }
        if (uiHooks.onHud) uiHooks.onHud();
    }

    function setKey(dirName, isDown) {
        var idx;
        if (!DIRS[dirName]) return;
        heldKeys[dirName] = isDown;
        idx = isKeyInStack(dirName);
        if (isDown) {
            if (gameState === "ready") {
                gameState = "play";
                setStatus("statusSafe");
                if (uiHooks.onHud) uiHooks.onHud();
            }
            if (idx >= 0) dirStack.splice(idx, 1);
            dirStack.push(dirName);
            queuedDir = dirName;
            perfKey();
        } else {
            if (idx >= 0) dirStack.splice(idx, 1);
        }
    }

    function togglePause() {
        if (gameState === "play") {
            gameState = "pause";
            setStatus("statusPaused");
        } else if (gameState === "pause") {
            gameState = "play";
            setStatus(runner.drawing ? "statusCarve" : "statusSafe");
        } else if (gameState === "ready") {
            gameState = "play";
            setStatus("statusSafe");
        } else if (gameState === "gameover") {
            newGame();
            gameState = "play";
            setStatus("statusSafe");
        }
        if (uiHooks.onHud) uiHooks.onHud();
    }

    function pickStepDirection() {
        var d, top;
        if (runner.drawing) {
            if (queuedDir && queuedDir !== DIRS[runner.dir].opp) {
                d = queuedDir;
                queuedDir = null;
                return d;
            }
            queuedDir = null;
            if (dirStack.length > 0) {
                top = dirStack[dirStack.length - 1];
                if (top !== DIRS[runner.dir].opp) return top;
            }
            return runner.dir;
        }

        if (queuedDir) {
            d = queuedDir;
            queuedDir = null;
            return d;
        }
        if (dirStack.length > 0) {
            return dirStack[dirStack.length - 1];
        }
        return null;
    }

    function checkRunnerHitEnemy() {
        var i, e, dx, dy;
        var rcx = runner.cx + 0.5;
        var rcy = runner.cy + 0.5;
        if (runner.drawing) {
            for (i = 0; i < seaBalls.length; i++) {
                e = seaBalls[i];
                dx = e.x - rcx;
                dy = e.y - rcy;
                if (dx * dx + dy * dy < 0.55 * 0.55) {
                    loseLife("sea");
                    return true;
                }
            }
        } else if (runner.invulnTimer <= 0) {
            for (i = 0; i < landPatrols.length; i++) {
                e = landPatrols[i];
                dx = e.x - rcx;
                dy = e.y - rcy;
                if (dx * dx + dy * dy < 0.62 * 0.62) {
                    loseLife("patrol");
                    return true;
                }
            }
        }
        return false;
    }

    function stepRunner() {
        var d = pickStepDirection();
        var nx, ny, targetCell;
        if (!d) return;

        nx = runner.cx + DIRS[d].dx;
        ny = runner.cy + DIRS[d].dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
            if (!runner.drawing) runner.dir = d;
            return;
        }

        targetCell = grid[ny][nx];
        if (targetCell === CELL_TRAIL) {
            loseLife("trail");
            return;
        }

        if (!runner.drawing && targetCell === CELL_LAND) {
            runner.cx = nx;
            runner.cy = ny;
            runner.dir = d;
            checkRunnerHitEnemy();
            return;
        }

        if (!runner.drawing && targetCell === CELL_SEA) {
            runner.drawing = true;
            runner.cx = nx;
            runner.cy = ny;
            runner.dir = d;
            grid[ny][nx] = CELL_TRAIL;
            trail.push({ x: nx, y: ny });
            setStatus("statusCarve");
            checkRunnerHitEnemy();
            return;
        }

        if (runner.drawing && targetCell === CELL_SEA) {
            runner.cx = nx;
            runner.cy = ny;
            runner.dir = d;
            grid[ny][nx] = CELL_TRAIL;
            trail.push({ x: nx, y: ny });
            checkRunnerHitEnemy();
            return;
        }

        if (runner.drawing && targetCell === CELL_LAND) {
            runner.cx = nx;
            runner.cy = ny;
            runner.dir = d;
            runner.drawing = false;
            captureTerritory();
        }
    }

    function updateSeaBalls(dt, checkCollision) {
        var i, s, b, maxSpeed, steps, sdt;
        var nx, ny, cxCur, cyCur, probeX, probeY, cxNext, cyNext, cVal, dx, dy;
        for (i = 0; i < seaBalls.length; i++) {
            b = seaBalls[i];
            b.phase += dt * 4.5;
            maxSpeed = Math.abs(b.vx) + Math.abs(b.vy);
            steps = Math.max(1, Math.ceil((maxSpeed * dt) / 0.16));
            sdt = dt / steps;

            for (s = 0; s < steps; s++) {
                cxCur = clampNum(Math.floor(b.x), 0, COLS - 1);
                cyCur = clampNum(Math.floor(b.y), 0, ROWS - 1);

                nx = b.x + b.vx * sdt;
                probeX = nx + (b.vx >= 0 ? SEA_BALL_R : -SEA_BALL_R);
                cxNext = Math.floor(probeX);
                if (cxNext < 0 || cxNext >= COLS) {
                    b.vx = -b.vx;
                } else {
                    cVal = grid[cyCur][cxNext];
                    if (cVal === CELL_TRAIL) {
                        if (checkCollision) {
                            loseLife("cut");
                            return;
                        }
                        b.vx = -b.vx;
                    } else if (cVal === CELL_LAND) {
                        b.vx = -b.vx;
                    } else {
                        b.x = nx;
                    }
                }

                cxCur = clampNum(Math.floor(b.x), 0, COLS - 1);
                ny = b.y + b.vy * sdt;
                probeY = ny + (b.vy >= 0 ? SEA_BALL_R : -SEA_BALL_R);
                cyNext = Math.floor(probeY);
                if (cyNext < 0 || cyNext >= ROWS) {
                    b.vy = -b.vy;
                } else {
                    cVal = grid[cyNext][cxCur];
                    if (cVal === CELL_TRAIL) {
                        if (checkCollision) {
                            loseLife("cut");
                            return;
                        }
                        b.vy = -b.vy;
                    } else if (cVal === CELL_LAND) {
                        b.vy = -b.vy;
                    } else {
                        b.y = ny;
                    }
                }

                // Corner guard so balls don't tunnel diagonally through corners
                cxNext = Math.floor(b.x + (b.vx >= 0 ? SEA_BALL_R : -SEA_BALL_R));
                cyNext = Math.floor(b.y + (b.vy >= 0 ? SEA_BALL_R : -SEA_BALL_R));
                if (cxNext >= 0 && cxNext < COLS && cyNext >= 0 && cyNext < ROWS) {
                    cVal = grid[cyNext][cxNext];
                    if (cVal === CELL_TRAIL && checkCollision) {
                        loseLife("cut");
                        return;
                    }
                    if (cVal === CELL_LAND && cxNext !== Math.floor(b.x) && cyNext !== Math.floor(b.y)) {
                        b.vx = -b.vx;
                        b.vy = -b.vy;
                    }
                }

                if (checkCollision && runner.drawing) {
                    dx = b.x - (runner.cx + 0.5);
                    dy = b.y - (runner.cy + 0.5);
                    if (dx * dx + dy * dy < 0.52 * 0.52) {
                        loseLife("sea");
                        return;
                    }
                }
            }
        }
    }

    function updateLandPatrols(dt) {
        var i, s, p, maxSpeed, steps, sdt;
        var nx, ny, cxCur, cyCur, probeX, probeY, cxNext, cyNext, dx, dy;
        for (i = 0; i < landPatrols.length; i++) {
            p = landPatrols[i];
            p.phase += dt * 5.2;
            maxSpeed = Math.abs(p.vx) + Math.abs(p.vy);
            steps = Math.max(1, Math.ceil((maxSpeed * dt) / 0.16));
            sdt = dt / steps;

            for (s = 0; s < steps; s++) {
                cxCur = clampNum(Math.floor(p.x), 0, COLS - 1);
                cyCur = clampNum(Math.floor(p.y), 0, ROWS - 1);

                nx = p.x + p.vx * sdt;
                probeX = nx + (p.vx >= 0 ? PATROL_R : -PATROL_R);
                cxNext = Math.floor(probeX);
                if (cxNext < 0 || cxNext >= COLS || grid[cyCur][cxNext] !== CELL_LAND) {
                    p.vx = -p.vx;
                } else {
                    p.x = nx;
                }

                cxCur = clampNum(Math.floor(p.x), 0, COLS - 1);
                ny = p.y + p.vy * sdt;
                probeY = ny + (p.vy >= 0 ? PATROL_R : -PATROL_R);
                cyNext = Math.floor(probeY);
                if (cyNext < 0 || cyNext >= ROWS || grid[cyNext][cxCur] !== CELL_LAND) {
                    p.vy = -p.vy;
                } else {
                    p.y = ny;
                }

                cxNext = Math.floor(p.x + (p.vx >= 0 ? PATROL_R : -PATROL_R));
                cyNext = Math.floor(p.y + (p.vy >= 0 ? PATROL_R : -PATROL_R));
                if (cxNext >= 0 && cxNext < COLS && cyNext >= 0 && cyNext < ROWS) {
                    if (grid[cyNext][cxNext] !== CELL_LAND &&
                        cxNext !== Math.floor(p.x) && cyNext !== Math.floor(p.y)) {
                        p.vx = -p.vx;
                        p.vy = -p.vy;
                    }
                }

                if (!runner.drawing && runner.invulnTimer <= 0) {
                    dx = p.x - (runner.cx + 0.5);
                    dy = p.y - (runner.cy + 0.5);
                    if (dx * dx + dy * dy < 0.62 * 0.62) {
                        loseLife("patrol");
                        return;
                    }
                }
            }
        }
    }

    function updateParticles(dt) {
        var i, pt;
        for (i = particles.length - 1; i >= 0; i--) {
            pt = particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vx *= 0.94;
            pt.vy *= 0.94;
            pt.life -= dt;
            if (pt.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function update(dt) {
        var targetX, targetY, lerpF, stepDelay;
        if (!dt || dt <= 0) return;
        if (dt > 0.1) dt = 0.1;

        globalTime += dt;
        if (hitFlashTimer > 0) hitFlashTimer = Math.max(0, hitFlashTimer - dt);
        updateParticles(dt);

        if (gameState === "ready") {
            updateSeaBalls(dt, false);
            return;
        }

        if (gameState === "clear") {
            clearTimer -= dt;
            if (clearTimer <= 0) {
                initStage(stage + 1);
                gameState = "play";
                setStatus("statusSafe");
                if (uiHooks.onHud) uiHooks.onHud();
            }
            return;
        }

        if (gameState !== "play") return;

        if (runner.invulnTimer > 0) {
            runner.invulnTimer = Math.max(0, runner.invulnTimer - dt);
        }

        stepDelay = runner.drawing ? CARVE_STEP_SEC : LAND_STEP_SEC;
        runner.moveTimer += dt;
        if (runner.moveTimer >= stepDelay) {
            runner.moveTimer -= stepDelay;
            if (runner.moveTimer > stepDelay) runner.moveTimer = stepDelay;
            stepRunner();
        }

        if (gameState === "play") {
            updateSeaBalls(dt, true);
        }
        if (gameState === "play") {
            updateLandPatrols(dt);
        }

        targetX = (runner.cx + 0.5) * CELL;
        targetY = (runner.cy + 0.5) * CELL;
        lerpF = Math.min(1, dt * 28);
        runner.px += (targetX - runner.px) * lerpF;
        runner.py += (targetY - runner.py) * lerpF;
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

    function collectLandSpans() {
        var rects = [];
        var rims = [];
        var y, x, startX;

        for (y = 0; y < ROWS; y++) {
            startX = -1;
            for (x = 0; x <= COLS; x++) {
                if (x < COLS && grid[y][x] === CELL_LAND) {
                    if (startX < 0) startX = x;
                } else if (startX >= 0) {
                    rects.push([
                        BOARD_X + startX * CELL,
                        BOARD_Y + y * CELL,
                        (x - startX) * CELL,
                        CELL
                    ]);
                    startX = -1;
                }
            }
        }

        function pushHorizontalRims(yIdx, adjY, drawY) {
            var sx = -1;
            var cx, endX, rx, rw;
            for (cx = 0; cx <= COLS; cx++) {
                if (cx < COLS && grid[yIdx][cx] === CELL_LAND && grid[adjY][cx] === CELL_SEA) {
                    if (sx < 0) sx = cx;
                } else if (sx >= 0) {
                    endX = cx;
                    rx = BOARD_X + sx * CELL;
                    rw = (endX - sx) * CELL;
                    if (sx > 0 && grid[yIdx][sx - 1] === CELL_LAND && grid[adjY][sx - 1] === CELL_LAND) {
                        rx -= 2;
                        rw += 2;
                    }
                    if (endX < COLS && grid[yIdx][endX] === CELL_LAND && grid[adjY][endX] === CELL_LAND) {
                        rw += 2;
                    }
                    rims.push([rx, drawY, rw, 2]);
                    sx = -1;
                }
            }
        }

        function pushVerticalRims(xIdx, adjX, drawX) {
            var sy = -1;
            var cy;
            for (cy = 0; cy <= ROWS; cy++) {
                if (cy < ROWS && grid[cy][xIdx] === CELL_LAND && grid[cy][adjX] === CELL_SEA) {
                    if (sy < 0) sy = cy;
                } else if (sy >= 0) {
                    rims.push([drawX, BOARD_Y + sy * CELL, 2, (cy - sy) * CELL]);
                    sy = -1;
                }
            }
        }

        // Draw crisp 2px bevel strips flush along sea-facing coastlines
        for (y = 0; y < ROWS; y++) {
            if (y > 0) pushHorizontalRims(y, y - 1, BOARD_Y + y * CELL);
            if (y + 1 < ROWS) pushHorizontalRims(y, y + 1, BOARD_Y + (y + 1) * CELL - 2);
        }
        for (x = 0; x < COLS; x++) {
            if (x > 0) pushVerticalRims(x, x - 1, BOARD_X + x * CELL);
            if (x + 1 < COLS) pushVerticalRims(x, x + 1, BOARD_X + (x + 1) * CELL - 2);
        }
        return { rects: rects, rims: rims };
    }

    function drawHudCards(g, t) {
        var cardW = Math.floor((BOARD_W - 3 * 10) / 4);
        var cardY = PAD_TOP;
        var i, cx, progressW, targetTickX;
        var cardBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.hudBg, 1));
        var cardPen = g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.hudStroke, 1), 1.2);
        var labels = [tr("hudScore"), tr("hudArea"), tr("hudStage"), tr("hudLives")];

        for (i = 0; i < 4; i++) {
            cx = BOARD_X + i * (cardW + 10);
            fillRoundRect(g, cx, cardY, cardW, HUD_H, 10, cardBrush);
            strokeRoundRect(g, cx, cardY, cardW, HUD_H, 10, cardPen);
            drawVectorText(g, labels[i], cx + cardW * 0.5, cardY + 15, 9, t.hudLabel, 0.95, 0.24);
        }

        // Card 0: Score + Best
        cx = BOARD_X;
        drawVectorText(g, padZero(score, 6), cx + cardW * 0.5, cardY + 38, 17, t.accScore, 1, 0.20);
        drawVectorText(g, tr("hudBest") + " " + padZero(bestScore, 5), cx + cardW * 0.5, cardY + 59, 8.5, t.textSub, 0.9, 0.22);

        // Card 1: Area % + progress bar with target tick
        cx = BOARD_X + (cardW + 10);
        drawVectorText(g, capturedPct + "%/" + targetPct + "%", cx + cardW * 0.5, cardY + 36, 15, t.accArea, 1, 0.18);
        fillRoundRect(g, cx + 12, cardY + 53, cardW - 24, 9, 4.5,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.barTrack, 1)));
        progressW = Math.max(0, Math.min(cardW - 24, Math.floor(((cardW - 24) * capturedPct) / 100)));
        if (progressW > 4) {
            fillRoundRect(g, cx + 12, cardY + 53, progressW, 9, 4.5,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.accArea, 1)));
        }
        targetTickX = cx + 12 + Math.floor(((cardW - 24) * targetPct) / 100);
        fillBatchRects(g, [[targetTickX - 1, cardY + 51, 2, 13]], 0,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.barTarget, 0.85)));

        // Card 2: Stage
        cx = BOARD_X + 2 * (cardW + 10);
        drawVectorText(g, padZero(stage, 2), cx + cardW * 0.5, cardY + 42, 22, t.accStage, 1, 0.22);

        // Card 3: Lives pips
        cx = BOARD_X + 3 * (cardW + 10);
        var lifePips = [];
        var maxPips = Math.max(3, lives);
        var pipSpacing = 18;
        var startPipX = cx + cardW * 0.5 - ((maxPips - 1) * pipSpacing) * 0.5;
        for (i = 0; i < lives; i++) {
            lifePips.push([startPipX + i * pipSpacing, cardY + 44, 6]);
        }
        if (lifePips.length > 0) {
            fillBatchCircles(g, lifePips,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.accLives, 1)));
        }
        var emptyPips = [];
        for (i = lives; i < 3; i++) {
            emptyPips.push([startPipX + i * pipSpacing, cardY + 44, 4.5]);
        }
        if (emptyPips.length > 0) {
            fillBatchCircles(g, emptyPips,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.barTrack, 1)));
        }
    }

    function drawOverlayCard(g, t, titleText, subText, accentRgb) {
        var boxW = 340;
        var boxH = 98;
        var bx = BOARD_X + (BOARD_W - boxW) * 0.5;
        var by = BOARD_Y + (BOARD_H - boxH) * 0.5;
        var pulse = 0.88 + 0.12 * Math.sin(globalTime * 4.5);

        fillRoundRect(g, bx, by, boxW, boxH, 12,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.overlayBg, 0.92)));
        strokeRoundRect(g, bx, by, boxW, boxH, 12,
            g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(accentRgb, pulse), 2));

        if (titleText) {
            drawVectorText(g, titleText, bx + boxW * 0.5, by + 35, 16, accentRgb, 1, 0.20);
        }
        if (subText) {
            drawVectorText(g, subText, bx + boxW * 0.5, by + 68, 9.5, t.textSub, 0.95, 0.18);
        }
    }

    function drawSceneUnsafe(g) {
        var t = THEMES[currentThemeName] || THEMES.dark;
        var spans, trailRects, i, pt, glowList, bodyList, coreList;
        var rx, ry, rRad, p, flashAlpha;

        if (!g) return;

        // 1. Background frame + HUD cards
        fillBatchRects(g, [[0, 0, CANVAS_W, CANVAS_H]], 0,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.bg, 1)));
        drawHudCards(g, t);

        // 2. Sea base
        fillRoundRect(g, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 6,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.sea, 1)));

        // Subtle grid dots every 4 cells on sea background
        var gridDots = [];
        var gx, gy;
        for (gy = 4; gy < ROWS - 2; gy += 4) {
            for (gx = 4; gx < COLS - 2; gx += 4) {
                if (grid[gy][gx] === CELL_SEA) {
                    gridDots.push([BOARD_X + gx * CELL + 4, BOARD_Y + gy * CELL + 4, 2, 2]);
                }
            }
        }
        if (gridDots.length > 0) {
            fillBatchRects(g, gridDots, 0,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.seaGrid, 0.7)));
        }

        // 3. Land merged spans + inner bevel rims
        spans = collectLandSpans();
        if (spans.rects.length > 0) {
            fillBatchRects(g, spans.rects, 0,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.land, 1)));
        }
        if (spans.rims.length > 0) {
            fillBatchRects(g, spans.rims, 0,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.landHi, 0.9)));
        }

        // 4. Active trail
        if (trail.length > 0) {
            trailRects = [];
            for (i = 0; i < trail.length; i++) {
                pt = trail[i];
                trailRects.push([BOARD_X + pt.x * CELL + 1, BOARD_Y + pt.y * CELL + 1, CELL - 2, CELL - 2]);
            }
            fillBatchRects(g, trailRects, 2,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.trail, 1)));
        }

        // 5. Capture / impact spark particles
        if (particles.length > 0) {
            var sparkBuckets = {};
            var sparkOrder = [];
            var cKey, rgbArr, bucket;
            for (i = 0; i < particles.length; i++) {
                p = particles[i];
                rgbArr = p.color || t.trailCore;
                cKey = rgbArr[0] + "," + rgbArr[1] + "," + rgbArr[2];
                if (!sparkBuckets[cKey]) {
                    sparkBuckets[cKey] = { rgb: rgbArr, pts: [] };
                    sparkOrder.push(cKey);
                }
                sparkBuckets[cKey].pts.push([BOARD_X + p.x, BOARD_Y + p.y, 2.5 * (p.life / p.maxLife) + 1]);
            }
            for (i = 0; i < sparkOrder.length; i++) {
                bucket = sparkBuckets[sparkOrder[i]];
                fillBatchCircles(g, bucket.pts,
                    g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(bucket.rgb, 0.85)));
            }
        }

        // 6. Sea Balls (glow + crisp orb + white highlight)
        if (seaBalls.length > 0) {
            glowList = [];
            bodyList = [];
            coreList = [];
            for (i = 0; i < seaBalls.length; i++) {
                var b = seaBalls[i];
                var bx = BOARD_X + b.x * CELL;
                var by = BOARD_Y + b.y * CELL;
                var pulseR = (SEA_BALL_R + 0.14 + 0.06 * Math.sin(b.phase)) * CELL;
                glowList.push([bx, by, pulseR]);
                bodyList.push([bx, by, SEA_BALL_R * CELL]);
                coreList.push([bx - 1.2, by - 1.2, 1.8]);
            }
            fillBatchCircles(g, glowList, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.seaBallGlow, 0.30)));
            fillBatchCircles(g, bodyList, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.seaBallBody, 1)));
            fillBatchCircles(g, coreList, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.seaBallCore, 0.95)));
        }

        // 7. Land Patrols
        if (landPatrols.length > 0) {
            glowList = [];
            bodyList = [];
            coreList = [];
            for (i = 0; i < landPatrols.length; i++) {
                var lp = landPatrols[i];
                var lpx = BOARD_X + lp.x * CELL;
                var lpy = BOARD_Y + lp.y * CELL;
                var lpPulse = (PATROL_R + 0.18 + 0.06 * Math.cos(lp.phase)) * CELL;
                glowList.push([lpx, lpy, lpPulse]);
                bodyList.push([lpx, lpy, PATROL_R * CELL]);
                coreList.push([lpx, lpy, 2.0]);
            }
            fillBatchCircles(g, glowList, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.patrolGlow, 0.34)));
            fillBatchCircles(g, bodyList, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.patrolBody, 1)));
            fillBatchCircles(g, coreList, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.patrolCore, 1)));
        }

        // 8. Runner (Player craft)
        rx = BOARD_X + runner.px;
        ry = BOARD_Y + runner.py;
        rRad = CELL * 0.48;
        if (runner.invulnTimer > 0) {
            fillBatchCircles(g, [[rx, ry, rRad + 4 + 2 * Math.sin(globalTime * 14)]],
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.runnerAura, 0.35)));
        } else if (runner.drawing) {
            fillBatchCircles(g, [[rx, ry, rRad + 3.5]],
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.trail, 0.32)));
        }
        fillRoundRect(g, rx - rRad, ry - rRad, rRad * 2, rRad * 2, 3.5,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.runnerOuter, 1)));
        fillBatchCircles(g, [[rx, ry, rRad * 0.45]],
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(runner.drawing ? t.trail : t.runnerCore, 1)));

        // 9. Playfield outer crisp frame
        strokeRoundRect(g, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 6,
            g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.boardStroke, 1), 1.5));

        // 10. Hit flash border feedback
        if (hitFlashTimer > 0) {
            flashAlpha = Math.min(0.45, hitFlashTimer * 1.2);
            strokeRoundRect(g, BOARD_X + 2, BOARD_Y + 2, BOARD_W - 4, BOARD_H - 4, 5,
                g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.hitFlash, flashAlpha), 4));
        }

        // 11. State overlays
        if (gameState === "ready") {
            drawOverlayCard(g, t, "READY TO CARVE", "ARROWS / WASD OR SPACE", t.accArea);
        } else if (gameState === "pause") {
            drawOverlayCard(g, t, "PAUSED", "PRESS SPACE OR P", t.accScore);
        } else if (gameState === "clear") {
            drawOverlayCard(g, t, "STAGE " + stage + " CLEAR!",
                "+" + (Math.max(0, capturedPct - targetPct) * 60 + stage * 500) + " BONUS", t.accStage);
        } else if (gameState === "gameover") {
            drawOverlayCard(g, t,
                newRecordFlag ? "NEW RECORD!" : "GAME OVER",
                "SCORE " + score + " / STAGE " + stage, t.accLives);
        }
    }

    function exportXonixToArtboard() {
        var doc, layerName, layer, grp, i, pt, spans, s, rect, circ, t;
        var ab, abRect, abCenterX, abCenterY, originX, originY, scale;
        var b, br, lp, lpr, rr, hdrRect, tf, errMsg;

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
            layerName = "Xonix_Vector_Board";

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
            grp.name = "Xonix_Snapshot_S" + stage + "_" + capturedPct + "pct";

            ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
            abRect = ab.artboardRect;
            scale = 1;
            abCenterX = (abRect[0] + abRect[2]) * 0.5;
            abCenterY = (abRect[1] + abRect[3]) * 0.5;
            originX = abCenterX - (BOARD_W * scale) * 0.5;
            originY = abCenterY + (BOARD_H * scale) * 0.5;

            // Header bar + label
            hdrRect = grp.pathItems.rectangle(originY + 26, originX, BOARD_W * scale, 22);
            hdrRect.filled = true;
            hdrRect.fillColor = makeRGBColor(t.hudBg);
            hdrRect.stroked = true;
            hdrRect.strokeColor = makeRGBColor(t.hudStroke);
            hdrRect.strokeWidth = 1;

            tf = grp.textFrames.add();
            tf.contents = "XONIX  |  STAGE " + stage + "  |  SCORE " + score + "  |  AREA " + capturedPct + "%/" + targetPct + "%";
            tf.left = originX + 8;
            tf.top = originY + 21;
            try {
                tf.textRange.characterAttributes.size = 11;
                tf.textRange.characterAttributes.fillColor = makeRGBColor(t.textMain);
            } catch (tfErr) {}

            // Sea background
            rect = grp.pathItems.rectangle(originY, originX, BOARD_W * scale, BOARD_H * scale);
            rect.filled = true;
            rect.fillColor = makeRGBColor(t.sea);
            rect.stroked = true;
            rect.strokeColor = makeRGBColor(t.boardStroke);
            rect.strokeWidth = 1.5;

            // Land spans + edge bevel rims
            spans = collectLandSpans();
            for (i = 0; i < spans.rects.length; i++) {
                s = spans.rects[i];
                rect = grp.pathItems.rectangle(
                    originY - (s[1] - BOARD_Y) * scale,
                    originX + (s[0] - BOARD_X) * scale,
                    s[2] * scale,
                    s[3] * scale
                );
                rect.filled = true;
                rect.fillColor = makeRGBColor(t.land);
                rect.stroked = false;
            }
            for (i = 0; i < spans.rims.length; i++) {
                s = spans.rims[i];
                if (s[2] <= 0 || s[3] <= 0) continue;
                rect = grp.pathItems.rectangle(
                    originY - (s[1] - BOARD_Y) * scale,
                    originX + (s[0] - BOARD_X) * scale,
                    s[2] * scale,
                    s[3] * scale
                );
                rect.filled = true;
                rect.fillColor = makeRGBColor(t.landHi);
                rect.stroked = false;
            }

            // Trail
            for (i = 0; i < trail.length; i++) {
                pt = trail[i];
                rect = grp.pathItems.rectangle(
                    originY - pt.y * CELL * scale,
                    originX + pt.x * CELL * scale,
                    CELL * scale,
                    CELL * scale
                );
                rect.filled = true;
                rect.fillColor = makeRGBColor(t.trail);
                rect.stroked = false;
            }

            // Sea Balls
            for (i = 0; i < seaBalls.length; i++) {
                b = seaBalls[i];
                br = SEA_BALL_R * CELL * scale;
                circ = grp.pathItems.ellipse(
                    originY - b.y * CELL * scale + br,
                    originX + b.x * CELL * scale - br,
                    br * 2,
                    br * 2
                );
                circ.filled = true;
                circ.fillColor = makeRGBColor(t.seaBallBody);
                circ.stroked = false;
            }

            // Land Patrols
            for (i = 0; i < landPatrols.length; i++) {
                lp = landPatrols[i];
                lpr = PATROL_R * CELL * scale;
                circ = grp.pathItems.ellipse(
                    originY - lp.y * CELL * scale + lpr,
                    originX + lp.x * CELL * scale - lpr,
                    lpr * 2,
                    lpr * 2
                );
                circ.filled = true;
                circ.fillColor = makeRGBColor(t.patrolBody);
                circ.stroked = false;
            }

            // Runner
            rr = CELL * 0.48 * scale;
            rect = grp.pathItems.rectangle(
                originY - runner.py * scale + rr,
                originX + runner.px * scale - rr,
                rr * 2,
                rr * 2
            );
            rect.filled = true;
            rect.fillColor = makeRGBColor(t.runnerOuter);
            rect.stroked = true;
            rect.strokeColor = makeRGBColor(t.runnerCore);
            rect.strokeWidth = 1.5;

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
    btnNew.preferredSize = [88, 24];
    var btnPause = btnRow.add("button", undefined, tr("btnPause"));
    btnPause.preferredSize = [90, 24];
    var btnExport = btnRow.add("button", undefined, tr("btnExport"));
    btnExport.preferredSize = [110, 24];
    var btnTheme = btnRow.add("button", undefined,
        currentThemeName === "dark" ? tr("btnThemeDark") : tr("btnThemeLight"));
    btnTheme.preferredSize = [112, 24];

    var langList = [];
    var lIdx, selectedLangIdx = 0;
    for (lIdx = 0; lIdx < LANG_ORDER.length; lIdx++) {
        langList.push(LANG_NAMES[LANG_ORDER[lIdx]]);
        if (LANG_ORDER[lIdx] === currentLang) selectedLangIdx = lIdx;
    }
    var ddLang = btnRow.add("dropdownlist", undefined, langList);
    ddLang.preferredSize = [80, 24];
    ddLang.selection = selectedLangIdx;

    var btnClose = btnRow.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [94, 24];

    var HB = { title: WIN_TITLE, token: SAVE_TOKEN, tickMs: 16, highRes: true };
    var lastFrameMs = perfNow();
    var lastRenderMs = 0;
    var lastStatusShown = "";
    var lastPauseLabel = "";
    var lastSpaceMs = 0;
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
        nextStatus = translateString(I18N[currentLang] || I18N.en, I18N.en, currentStatusKey, currentStatusArgs);
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

        if (k === "SPACE" || k === "P") {
            now = perfNow();
            if (k === "SPACE") lastSpaceMs = now;
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();
            if (actionKeysDown[k] || (now - lastActionMs < 80 && lastActionKey === k)) return;
            actionKeysDown[k] = true;
            lastActionKey = k;
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
        if (k === "SPACE" || k === "P" || k === "R") {
            actionKeysDown[k] = false;
            if (k === "SPACE") lastSpaceMs = perfNow();
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
        if (perfNow() - lastSpaceMs < 200) {
            refocusControl();
            return;
        }
        togglePause();
        refreshUI(false);
        refocusControl();
    };

    btnExport.onClick = function () {
        exportXonixToArtboard();
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
