#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"
#include "lib/GamePerf.jsx"

(function () {
    var WIN_TITLE = "Sokoban - Designer Edition";
    var SAVE_TOKEN = "Sokoban";

    var CANVAS_W = 560;
    var CANVAS_H = 540;
    var PAD_X = 16;
    var PAD_TOP = 12;
    var HUD_H = 70;
    var GAP_HUD = 10;
    var PAD_BOT = 12;

    var BOARD_X = PAD_X;
    var BOARD_Y = PAD_TOP + HUD_H + GAP_HUD;
    var BOARD_W = CANVAS_W - PAD_X * 2;
    var BOARD_H = CANVAS_H - BOARD_Y - PAD_BOT;

    var SLIDE_DUR = 0.055;
    var WALK_STEP_INTERVAL = 0.04;
    var KEY_DEDUP_MS = 95;

    var LANG_ORDER = ["en", "cs", "ro", "hi"];
    var LANG_NAMES = {
        en: "English",
        cs: "\u010ce\u0161tina",
        ro: "Rom\u00e2n\u0103",
        hi: "\u0939\u093f\u0928\u094d\u0926\u0940"
    };

    var I18N = {
        en: {
            btnPrev: "<",
            btnNext: ">",
            btnUndo: "Undo",
            btnReset: "Restart",
            btnExport: "\u2756 Artboard",
            btnThemeDark: "Dark",
            btnThemeLight: "Light",
            btnClose: "Close",
            hint: "Arrows/WASD or click: move | Z: undo | R: restart | [ ]: level",
            statusReady: "Stage {0}: {1}. Push all crates onto the glowing targets.",
            statusPlay: "Stage {0}: {1} ({2}/{3} crates placed).",
            statusMoved: "Stage {0}: {1} - {2} moves, {3} pushes.",
            statusUndid: "Undid step ({0} moves, {1} pushes).",
            statusNoUndo: "Nothing to undo on this stage.",
            statusBlocked: "Blocked! Cannot push two crates or through walls.",
            statusReset: "Stage {0} restarted.",
            statusClear: "Stage {0} cleared in {1} moves ({2} pushes)! Press Space for next.",
            statusAllClear: "All {0} stages solved! You mastered the warehouse!",
            statusNoPath: "No clear walking path to that tile.",
            statusNoDoc: "Open an Illustrator document first.",
            statusExported: "Exported to layer \"{0}\".",
            statusExportErr: "Export error: {0}",
            statusSaveErr: "Warning: could not save progress or settings.",
            statusNoHeartbeat: "Heartbeat unavailable - click canvas or press keys directly."
        },
        cs: {
            btnPrev: "<",
            btnNext: ">",
            btnUndo: "Zp\u011bt",
            btnReset: "Reset",
            btnExport: "\u2756 Pl\u00e1tno",
            btnThemeDark: "Tmav\u00fd",
            btnThemeLight: "Sv\u011btl\u00fd",
            btnClose: "Zav\u0159\u00edt",
            hint: "\u0160ipky/WASD nebo klik: pohyb | Z: zp\u011bt | R: restart | [ ]: \u00farove\u0148",
            statusReady: "\u00darove\u0148 {0}: {1}. Natla\u010dte v\u0161echny bedny na c\u00edle.",
            statusPlay: "\u00darove\u0148 {0}: {1} ({2}/{3} beden na c\u00edli).",
            statusMoved: "\u00darove\u0148 {0}: {1} - {2} tah\u016f, {3} tla\u010den\u00ed.",
            statusUndid: "Krok vr\u00e1cen ({0} tah\u016f, {1} tla\u010den\u00ed).",
            statusNoUndo: "Nen\u00ed co vr\u00e1tit.",
            statusBlocked: "Blokov\u00e1no! Nelze tla\u010dit dv\u011b bedny ani p\u0159es ze\u010f.",
            statusReset: "\u00darove\u0148 {0} restartov\u00e1na.",
            statusClear: "\u00darove\u0148 {0} vy\u0159e\u0161ena za {1} tah\u016f ({2} tla\u010den\u00ed)! Mezern\u00edk = dal\u0161\u00ed.",
            statusAllClear: "V\u0161ech {0} \u00farovn\u00ed vy\u0159e\u0161eno! Skv\u011bl\u00e1 pr\u00e1ce!",
            statusNoPath: "Na toto pole nevede voln\u00e1 cesta.",
            statusNoDoc: "Nejprve otev\u0159ete dokument Illustratoru.",
            statusExported: "Exportov\u00e1no do vrstvy \"{0}\".",
            statusExportErr: "Chyba exportu: {0}",
            statusSaveErr: "Varov\u00e1n\u00ed: nepoda\u0159ilo se ulo\u017eit postup ani nastaven\u00ed.",
            statusNoHeartbeat: "Heartbeat nedostupn\u00fd - pou\u017eijte kl\u00e1vesy nebo klik\u00e1n\u00ed."
        },
        ro: {
            btnPrev: "<",
            btnNext: ">",
            btnUndo: "\u00cenapoi",
            btnReset: "Reset",
            btnExport: "\u2756 Plan\u0219\u0103",
            btnThemeDark: "\u00cenchis",
            btnThemeLight: "Deschis",
            btnClose: "\u00cenchide",
            hint: "S\u0103ge\u021bi/WASD sau clic: mut\u0103 | Z: \u00eenapoi | R: restart | [ ]: nivel",
            statusReady: "Nivel {0}: {1}. \u00cempinge l\u0103zile pe \u021bintele luminoase.",
            statusPlay: "Nivel {0}: {1} ({2}/{3} l\u0103zi pe \u021bint\u0103).",
            statusMoved: "Nivel {0}: {1} - {2} mut\u0103ri, {3} \u00eempingeri.",
            statusUndid: "Pas anulat ({0} mut\u0103ri, {1} \u00eempingeri).",
            statusNoUndo: "Nimic de anulat la acest nivel.",
            statusBlocked: "Blocat! Nu po\u021bi \u00eempinge dou\u0103 l\u0103zi sau prin zid.",
            statusReset: "Nivelul {0} repornit.",
            statusClear: "Nivel {0} rezolvat \u00een {1} mut\u0103ri ({2} \u00eempingeri)! Space = urm\u0103torul.",
            statusAllClear: "Toate cele {0} niveluri rezolvate! Felicit\u0103ri!",
            statusNoPath: "Nu exist\u0103 drum liber c\u0103tre acea c\u0103su\u021b\u0103.",
            statusNoDoc: "Deschide mai \u00eent\u00e2i un document Illustrator.",
            statusExported: "Exportat \u00een stratul \"{0}\".",
            statusExportErr: "Eroare export: {0}",
            statusSaveErr: "Avertisment: progresul sau set\u0103rile nu au putut fi salvate.",
            statusNoHeartbeat: "Heartbeat indisponibil - folosi\u021bi tastele sau clicul."
        },
        hi: {
            btnPrev: "<",
            btnNext: ">",
            btnUndo: "\u092a\u0942\u0930\u094d\u0935\u0935\u0924",
            btnReset: "\u0930\u0940\u0938\u0947\u091f",
            btnExport: "\u2756 \u0906\u0930\u094d\u091f\u092c\u094b\u0930\u094d\u0921",
            btnThemeDark: "\u0921\u093e\u0930\u094d\u0915",
            btnThemeLight: "\u0932\u093e\u0907\u091f",
            btnClose: "\u092c\u0902\u0926",
            hint: "\u0924\u0940\u0930/WASD \u092f\u093e \u0915\u094d\u0932\u093f\u0915: \u091a\u0932\u0947\u0902 | Z: \u0935\u093e\u092a\u0938 | R: \u092a\u0941\u0928\u0903 | [ ]: \u0938\u094d\u0924\u0930",
            statusReady: "\u0938\u094d\u0924\u0930 {0}: {1}. \u0938\u092d\u0940 \u092c\u0915\u094d\u0938\u094b\u0902 \u0915\u094b \u091a\u092e\u0915\u0924\u0947 \u0932\u0915\u094d\u0937\u094d\u092f\u094b\u0902 \u092a\u0930 \u0927\u0915\u0947\u0932\u0947\u0902.",
            statusPlay: "\u0938\u094d\u0924\u0930 {0}: {1} ({2}/{3} \u092c\u0915\u094d\u0938\u0947 \u0938\u094d\u0925\u093e\u0928 \u092a\u0930).",
            statusMoved: "\u0938\u094d\u0924\u0930 {0}: {1} - {2} \u091a\u093e\u0932\u0947\u0902, {3} \u0927\u0915\u094d\u0915\u0947.",
            statusUndid: "\u0915\u0926\u092e \u0935\u093e\u092a\u0938 \u0932\u093f\u092f\u093e ({0} \u091a\u093e\u0932\u0947\u0902, {1} \u0927\u0915\u094d\u0915\u0947).",
            statusNoUndo: "\u0935\u093e\u092a\u0938 \u0932\u0947\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0915\u0941\u091b \u0928\u0939\u0940\u0902 \u0939\u0948.",
            statusBlocked: "\u0930\u0941\u0915\u093e! \u0926\u094b \u092c\u0915\u094d\u0938\u0947 \u092f\u093e \u0926\u0940\u0935\u093e\u0930 \u0915\u0947 \u092a\u093e\u0930 \u0928\u0939\u0940\u0902 \u0927\u0915\u0947\u0932 \u0938\u0915\u0924\u0947.",
            statusReset: "\u0938\u094d\u0924\u0930 {0} \u092b\u093f\u0930 \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u0941\u0906.",
            statusClear: "\u0938\u094d\u0924\u0930 {0} {1} \u091a\u093e\u0932\u094b\u0902 ({2} \u0927\u0915\u094d\u0915\u094b\u0902) \u092e\u0947\u0902 \u092a\u0942\u0930\u093e! \u0905\u0917\u0932\u0947 \u0915\u0947 \u0932\u093f\u090f Space \u0926\u092c\u093e\u090f\u0902.",
            statusAllClear: "\u0938\u092d\u0940 {0} \u0938\u094d\u0924\u0930 \u0939\u0932 \u0939\u094b \u0917\u090f! \u092c\u0927\u093e\u0908!",
            statusNoPath: "\u0909\u0938 \u0916\u093e\u0928\u0947 \u0924\u0915 \u0916\u0941\u0932\u093e \u0930\u093e\u0938\u094d\u0924\u093e \u0928\u0939\u0940\u0902 \u0939\u0948.",
            statusNoDoc: "\u092a\u0939\u0932\u0947 Illustrator \u0926\u0938\u094d\u0924\u093e\u0935\u0947\u091c\u093c \u0916\u094b\u0932\u0947\u0902.",
            statusExported: "\u0932\u0947\u092f\u0930 \"{0}\" \u092e\u0947\u0902 \u090f\u0915\u094d\u0938\u092a\u094b\u0930\u094d\u091f \u0939\u0941\u0906.",
            statusExportErr: "\u090f\u0915\u094d\u0938\u092a\u094b\u0930\u094d\u091f \u0924\u094d\u0930\u0941\u091f\u093f: {0}",
            statusSaveErr: "\u091a\u0947\u0924\u093e\u0935\u0928\u0940: \u0938\u0947\u0935 \u092b\u093c\u093e\u0907\u0932 \u0932\u093f\u0916\u0940 \u0928\u0939\u0940\u0902 \u091c\u093e \u0938\u0915\u0940.",
            statusNoHeartbeat: "Heartbeat \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 - \u0915\u0941\u0902\u091c\u0940 \u092f\u093e \u0915\u094d\u0932\u093f\u0915 \u091a\u0932\u093e\u090f\u0902."
        }
    };

    var THEMES = {
        dark: {
            bg: [18, 22, 30],
            hudBg: [27, 33, 46],
            hudStroke: [52, 65, 88],
            boardBg: [15, 19, 27],
            boardStroke: [64, 78, 102],
            floor: [32, 41, 56],
            floorAlt: [38, 48, 65],
            wallBase: [68, 82, 106],
            wallHi: [108, 126, 156],
            wallShade: [42, 52, 70],
            goalRing: [56, 189, 248],
            goalCore: [14, 165, 233],
            crateOuter: [180, 102, 40],
            crateInner: [217, 134, 62],
            crateBrace: [128, 66, 22],
            crateHi: [245, 178, 108],
            crateDoneOuter: [16, 150, 104],
            crateDoneInner: [52, 211, 153],
            crateDoneBrace: [6, 95, 70],
            crateDoneHi: [167, 243, 208],
            playerSuit: [236, 242, 250],
            playerTrim: [56, 189, 248],
            playerHelmet: [250, 204, 21],
            playerVisor: [15, 23, 42],
            accStage: [56, 189, 248],
            accMoves: [250, 204, 21],
            accPushes: [251, 146, 60],
            accCrates: [52, 211, 153],
            barTrack: [42, 51, 70],
            overlayBg: [15, 20, 30],
            textMain: [241, 245, 249],
            textSub: [156, 169, 190],
            spark: [52, 211, 153],
            sparkGold: [250, 204, 21]
        },
        light: {
            bg: [235, 240, 246],
            hudBg: [255, 255, 255],
            hudStroke: [203, 213, 225],
            boardBg: [222, 229, 238],
            boardStroke: [148, 163, 184],
            floor: [241, 245, 249],
            floorAlt: [229, 236, 243],
            wallBase: [92, 108, 130],
            wallHi: [134, 151, 174],
            wallShade: [62, 74, 92],
            goalRing: [2, 132, 199],
            goalCore: [14, 165, 233],
            crateOuter: [194, 104, 30],
            crateInner: [234, 146, 58],
            crateBrace: [140, 72, 18],
            crateHi: [253, 204, 142],
            crateDoneOuter: [5, 140, 96],
            crateDoneInner: [16, 185, 129],
            crateDoneBrace: [6, 95, 70],
            crateDoneHi: [167, 243, 208],
            playerSuit: [30, 41, 59],
            playerTrim: [14, 165, 233],
            playerHelmet: [234, 179, 8],
            playerVisor: [248, 250, 252],
            accStage: [2, 132, 199],
            accMoves: [202, 138, 4],
            accPushes: [234, 88, 12],
            accCrates: [5, 150, 105],
            barTrack: [216, 224, 234],
            overlayBg: [255, 255, 255],
            textMain: [15, 23, 42],
            textSub: [100, 116, 139],
            spark: [16, 185, 129],
            sparkGold: [245, 158, 11]
        }
    };

    // Ordered from gentle 4-push warmups up to tricky 13-push spatial puzzles.
    // Every map is verified solvable by tools/sokoban-headless.js (push-BFS).
    var LEVELS = [
        {
            name: "TWIN DOCKS",
            par: 4,
            map: [
                "######",
                "# .  #",
                "# #$ #",
                "# $@ #",
                "#  . #",
                "######"
            ]
        },
        {
            name: "LOADING BAY",
            par: 4,
            map: [
                "#####  ",
                "#   #  ",
                "# #$## ",
                "#   .# ",
                "## $ # ",
                " #.@## ",
                " ####  "
            ]
        },
        {
            name: "TIGHT TURN",
            par: 4,
            map: [
                "  ###### ",
                " ##    # ",
                " # ..# # ",
                "## $ $ # ",
                "#  .@  # ",
                "#  $   # ",
                "#   #### ",
                "#####    "
            ]
        },
        {
            name: "FIRST SHIFT",
            par: 4,
            map: [
                "#######",
                "#     #",
                "# . $ #",
                "#  @  #",
                "# $ . #",
                "#     #",
                "#######"
            ]
        },
        {
            name: "STORAGE ROOM",
            par: 5,
            map: [
                "########",
                "#   .. #",
                "#  #$$ #",
                "# @ $  #",
                "# # .  #",
                "#      #",
                "########"
            ]
        },
        {
            name: "YARD SHIFT",
            par: 5,
            map: [
                " #######",
                " #  .  #",
                "## #$# #",
                "#  $.$ #",
                "# @.   #",
                "#  # ###",
                "#### #  ",
                "   ###  "
            ]
        },
        {
            name: "CROSSDOCK",
            par: 5,
            map: [
                "  ##### ",
                " ##   # ",
                "## .$ ##",
                "#  $#  #",
                "# .@.  #",
                "#  #$  #",
                "## $. ##",
                " #   ## ",
                " #####  "
            ]
        },
        {
            name: "SHIPPING LANE",
            par: 6,
            map: [
                "#########",
                "#  ...  #",
                "# #$#$# #",
                "#   $   #",
                "### @ ###",
                "  #####  "
            ]
        },
        {
            name: "FORKLIFT",
            par: 6,
            map: [
                " ######",
                "##    #",
                "#  ## #",
                "# $$. #",
                "# @$. #",
                "#  #. #",
                "#######"
            ]
        },
        {
            name: "DEPOT SIX",
            par: 6,
            map: [
                " #######",
                "##  .  #",
                "#  $.$ #",
                "# #.$. #",
                "#  $$@ #",
                "#   .  #",
                "########"
            ]
        },
        {
            name: "CORRIDOR",
            par: 7,
            map: [
                "########",
                "#   .  #",
                "# #$$# #",
                "# . @ .#",
                "#  $#  #",
                "#      #",
                "########"
            ]
        },
        {
            name: "LOOP TRACK",
            par: 7,
            map: [
                "########",
                "#  . . #",
                "# $$$# #",
                "#  @   #",
                "# # .  #",
                "#      #",
                "########"
            ]
        },
        {
            name: "T-JUNCTION",
            par: 7,
            map: [
                "  #####  ",
                "###   ###",
                "#  .$.  #",
                "# #$$$# #",
                "#  .@.  #",
                "#       #",
                "###   ###",
                "  #####  "
            ]
        },
        {
            name: "CORNER LOCK",
            par: 9,
            map: [
                "#########",
                "#  . .  #",
                "# $#$#$ #",
                "#   @   #",
                "#  #$#  #",
                "#  ..   #",
                "#########"
            ]
        },
        {
            name: "TWO DOORS",
            par: 9,
            map: [
                "#########",
                "#   #   #",
                "# $ # $ #",
                "# . @ . #",
                "# $ # $ #",
                "#   .   #",
                "#   .   #",
                "#########"
            ]
        },
        {
            name: "BOX PUZZLE",
            par: 10,
            map: [
                "######## ",
                "# ..   # ",
                "# # #.## ",
                "# $$   # ",
                "#   $$.# ",
                "# @    # ",
                "######## "
            ]
        },
        {
            name: "GRAND FINALE",
            par: 10,
            map: [
                "  ####### ",
                "###     ##",
                "#   $.$  #",
                "#  # . # #",
                "#  $ @ $ #",
                "#   *#   #",
                "##   .. ##",
                " ######## "
            ]
        },
        {
            name: "SWITCHBACK",
            par: 11,
            map: [
                " ########",
                " #      #",
                "## .#$# #",
                "#  .$   #",
                "# .@ #$ #",
                "#       #",
                "#########"
            ]
        },
        {
            name: "WAREHOUSE",
            par: 12,
            map: [
                "  ##### ",
                "###   # ",
                "#.@$  # ",
                "### $.# ",
                "#.##$ # ",
                "# # . ##",
                "#$ *$$.#",
                "#   .  #",
                "########"
            ]
        },
        {
            name: "THREE BAYS",
            par: 13,
            map: [
                "#######",
                "#..   #",
                "#.. # #",
                "# $$$ #",
                "#  $ @#",
                "#     #",
                "#######"
            ]
        }
    ];

    var VECTOR_FONT = {
        "0": [[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0],[0,1,1,0]],
        "1": [[0.5,0,0.5,1],[0.25,0.18,0.5,0],[0.25,1,0.75,1]],
        "2": [[0,0.1,1,0.1],[1,0.1,1,0.5],[1,0.5,0,0.5],[0,0.5,0,1],[0,1,1,1]],
        "3": [[0,0,1,0],[1,0,1,1],[0.2,0.5,1,0.5],[0,1,1,1]],
        "4": [[0,0,0,0.55],[0,0.55,1,0.55],[1,0,1,1]],
        "5": [[1,0,0,0],[0,0,0,0.5],[0,0.5,1,0.5],[1,0.5,1,1],[1,1,0,1]],
        "6": [[1,0,0,0],[0,0,0,1],[0,1,1,1],[1,1,1,0.5],[1,0.5,0,0.5]],
        "7": [[0,0,1,0],[1,0,0.4,1]],
        "8": [[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0],[0,0.5,1,0.5]],
        "9": [[0,1,1,1],[1,1,1,0],[1,0,0,0],[0,0,0,0.5],[0,0.5,1,0.5]],
        "A": [[0,1,0.5,0],[0.5,0,1,1],[0.2,0.62,0.8,0.62]],
        "B": [[0,0,0,1],[0,0,0.8,0],[0.8,0,0.95,0.22],[0.95,0.22,0.75,0.48],[0,0.48,0.8,0.48],[0.8,0.48,1,0.72],[1,0.72,0.8,1],[0.8,1,0,1]],
        "C": [[1,0.12,0.75,0],[0.75,0,0.25,0],[0.25,0,0,0.25],[0,0.25,0,0.75],[0,0.75,0.25,1],[0.25,1,0.75,1],[0.75,1,1,0.88]],
        "D": [[0,0,0,1],[0,0,0.7,0],[0.7,0,1,0.3],[1,0.3,1,0.7],[1,0.7,0.7,1],[0.7,1,0,1]],
        "E": [[1,0,0,0],[0,0,0,1],[0,1,1,1],[0,0.5,0.75,0.5]],
        "F": [[1,0,0,0],[0,0,0,1],[0,0.5,0.75,0.5]],
        "G": [[1,0.12,0.75,0],[0.75,0,0.25,0],[0.25,0,0,0.25],[0,0.25,0,0.75],[0,0.75,0.25,1],[0.25,1,1,1],[1,1,1,0.55],[1,0.55,0.55,0.55]],
        "H": [[0,0,0,1],[1,0,1,1],[0,0.5,1,0.5]],
        "I": [[0.2,0,0.8,0],[0.5,0,0.5,1],[0.2,1,0.8,1]],
        "J": [[0.2,0,0.9,0],[0.75,0,0.75,0.78],[0.75,0.78,0.5,1],[0.5,1,0.2,1],[0.2,1,0,0.78]],
        "K": [[0,0,0,1],[1,0,0,0.55],[0.25,0.42,1,1]],
        "L": [[0,0,0,1],[0,1,1,1]],
        "M": [[0,1,0,0],[0,0,0.5,0.55],[0.5,0.55,1,0],[1,0,1,1]],
        "N": [[0,1,0,0],[0,0,1,1],[1,1,1,0]],
        "O": [[0.25,0,0.75,0],[0.75,0,1,0.25],[1,0.25,1,0.75],[1,0.75,0.75,1],[0.75,1,0.25,1],[0.25,1,0,0.75],[0,0.75,0,0.25],[0,0.25,0.25,0]],
        "P": [[0,0,0,1],[0,0,0.8,0],[0.8,0,1,0.25],[1,0.25,0.8,0.52],[0.8,0.52,0,0.52]],
        "Q": [[0.25,0,0.75,0],[0.75,0,1,0.25],[1,0.25,1,0.75],[1,0.75,0.75,1],[0.75,1,0.25,1],[0.25,1,0,0.75],[0,0.75,0,0.25],[0,0.25,0.25,0],[0.6,0.65,1,1]],
        "R": [[0,0,0,1],[0,0,0.8,0],[0.8,0,1,0.25],[1,0.25,0.8,0.52],[0.8,0.52,0,0.52],[0.55,0.52,1,1]],
        "S": [[1,0.12,0.75,0],[0.75,0,0.25,0],[0.25,0,0,0.25],[0,0.25,0.25,0.48],[0.25,0.48,0.75,0.52],[0.75,0.52,1,0.75],[1,0.75,0.75,1],[0.75,1,0.25,1],[0.25,1,0,0.88]],
        "T": [[0,0,1,0],[0.5,0,0.5,1]],
        "U": [[0,0,0,0.8],[0,0.8,0.25,1],[0.25,1,0.75,1],[0.75,1,1,0.8],[1,0.8,1,0]],
        "V": [[0,0,0.5,1],[0.5,1,1,0]],
        "W": [[0,0,0.25,1],[0.25,1,0.5,0.45],[0.5,0.45,0.75,1],[0.75,1,1,0]],
        "X": [[0,0,1,1],[1,0,0,1]],
        "Y": [[0,0,0.5,0.5],[1,0,0.5,0.5],[0.5,0.5,0.5,1]],
        "Z": [[0,0,1,0],[1,0,0,1],[0,1,1,1]],
        "-": [[0.2,0.5,0.8,0.5]],
        "+": [[0.2,0.5,0.8,0.5],[0.5,0.2,0.5,0.8]],
        "/": [[0.15,1,0.85,0]],
        ":": [[0.45,0.25,0.55,0.25],[0.45,0.75,0.55,0.75]],
        ".": [[0.45,0.9,0.55,0.9]],
        "!": [[0.5,0,0.5,0.68],[0.5,0.88,0.5,0.95]],
        "*": [[0.5,0.15,0.5,0.85],[0.2,0.32,0.8,0.68],[0.8,0.32,0.2,0.68]],
        "(": [[0.7,0,0.35,0.3],[0.35,0.3,0.35,0.7],[0.35,0.7,0.7,1]],
        ")": [[0.3,0,0.65,0.3],[0.65,0.3,0.65,0.7],[0.65,0.7,0.3,1]],
        " ": []
    };

    function drawVectorGlyph(g, ch, cx, cy, glyphH, brush) {
        var segs = VECTOR_FONT[ch];
        var s, gw, gx, gy, r;
        if (!segs || !segs.length) return;
        gw = glyphH * 0.62;
        gx = cx - gw * 0.5;
        gy = cy - glyphH * 0.5;
        r = Math.max(0.7, glyphH * 0.075);
        for (s = 0; s < segs.length; s++) {
            fillCapsule(
                g,
                gx + segs[s][0] * gw,
                gy + segs[s][1] * glyphH,
                gx + segs[s][2] * gw,
                gy + segs[s][3] * glyphH,
                r,
                brush
            );
        }
    }

    function drawVectorText(g, text, cx, cy, h, rgbColor, alpha, gapRatio) {
        drawGlyphRun(g, text, cx, cy, h, rgbColor, alpha, drawVectorGlyph, gapRatio);
    }

    // --------------------------------------------------------- game state

    var currentThemeName = "dark";
    var currentLang = "en";
    var currentStatusKey = "statusReady";
    var currentStatusArgs = [];

    var levelIndex = 0;
    var cols = 0;
    var rows = 0;
    var wallGrid = [];
    var goalGrid = [];
    var insideGrid = [];
    var crateGrid = [];
    var totalGoals = 0;
    var cratesOnGoal = 0;

    var player = {
        x: 0,
        y: 0,
        fromX: 0,
        fromY: 0,
        dir: "down"
    };
    var crateSlide = null; // { toX, toY, fromX, fromY }
    var slideTimer = 0;

    var moves = 0;
    var pushes = 0;
    var undoStack = [];
    var bestRecords = {}; // levelIndex -> { moves, pushes }
    var gameState = "ready"; // ready | play | clear | allclear
    var globalTime = 0;
    var particles = [];
    var walkQueue = [];
    var walkStepTimer = 0;

    var uiHooks = {
        onStatus: null,
        onHud: null
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

    function countSolvedLevels() {
        var i, count = 0;
        for (i = 0; i < LEVELS.length; i++) {
            if (bestRecords[i]) count++;
        }
        return count;
    }

    function loadSettings() {
        var data = readKeyValueFile(getGameSaveFile(SAVE_TOKEN));
        var i, raw, slash, m, p;
        if (!data) return;
        if (data.theme === "dark" || data.theme === "light") currentThemeName = data.theme;
        if (data.lang && inLangList(data.lang)) currentLang = data.lang;
        if (data.level !== undefined) {
            var lv = parseInt(data.level, 10);
            if (!isNaN(lv) && lv >= 0 && lv < LEVELS.length) levelIndex = lv;
        }
        for (i = 0; i < LEVELS.length; i++) {
            raw = data["best" + i];
            if (!raw) continue;
            slash = raw.indexOf("/");
            if (slash > 0) {
                m = parseInt(raw.substring(0, slash), 10);
                p = parseInt(raw.substring(slash + 1), 10);
                if (!isNaN(m) && !isNaN(p) && m > 0 && p > 0) {
                    bestRecords[i] = { moves: m, pushes: p };
                }
            }
        }
    }

    function saveSettings(reportError) {
        var pairs = [
            "theme=" + currentThemeName,
            "lang=" + currentLang,
            "level=" + levelIndex
        ];
        var i, ok;
        for (i = 0; i < LEVELS.length; i++) {
            if (bestRecords[i]) {
                pairs.push("best" + i + "=" + bestRecords[i].moves + "/" + bestRecords[i].pushes);
            }
        }
        ok = writeKeyValueFile(getGameSaveFile(SAVE_TOKEN), pairs);
        if (!ok) {
            perfNote("saveSettings failed: " + getGameSaveFile(SAVE_TOKEN).fsName);
            if (reportError) setStatus("statusSaveErr");
        }
        return ok;
    }

    // --------------------------------------------------------- board & levels

    function floodInside() {
        var q = [{ x: player.x, y: player.y }];
        var head = 0;
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        var cur, i, nx, ny;

        insideGrid = [];
        for (ny = 0; ny < rows; ny++) {
            insideGrid.push([]);
            for (nx = 0; nx < cols; nx++) insideGrid[ny].push(false);
        }
        insideGrid[player.y][player.x] = true;

        while (head < q.length) {
            cur = q[head++];
            for (i = 0; i < 4; i++) {
                nx = cur.x + dirs[i][0];
                ny = cur.y + dirs[i][1];
                if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
                if (wallGrid[ny][nx] || insideGrid[ny][nx]) continue;
                insideGrid[ny][nx] = true;
                q.push({ x: nx, y: ny });
            }
        }
    }

    function recalcGoals() {
        var x, y, cnt = 0;
        for (y = 0; y < rows; y++) {
            for (x = 0; x < cols; x++) {
                if (crateGrid[y][x] && goalGrid[y][x]) cnt++;
            }
        }
        cratesOnGoal = cnt;
    }

    function loadLevel(idx, keepReady) {
        var lvl, x, y, rowStr, ch;
        if (idx < 0) idx = LEVELS.length - 1;
        if (idx >= LEVELS.length) idx = 0;
        levelIndex = idx;
        lvl = LEVELS[idx];

        rows = lvl.map.length;
        cols = 0;
        for (y = 0; y < rows; y++) {
            if (lvl.map[y].length > cols) cols = lvl.map[y].length;
        }

        wallGrid = [];
        goalGrid = [];
        crateGrid = [];
        totalGoals = 0;

        for (y = 0; y < rows; y++) {
            wallGrid.push([]);
            goalGrid.push([]);
            crateGrid.push([]);
            rowStr = lvl.map[y];
            for (x = 0; x < cols; x++) {
                ch = x < rowStr.length ? rowStr.charAt(x) : " ";
                wallGrid[y].push(ch === "#");
                goalGrid[y].push(ch === "." || ch === "*" || ch === "+");
                crateGrid[y].push(ch === "$" || ch === "*");
                if (ch === "." || ch === "*" || ch === "+") totalGoals++;
                if (ch === "@" || ch === "+") {
                    player.x = x;
                    player.y = y;
                    player.fromX = x;
                    player.fromY = y;
                    player.dir = "down";
                }
            }
        }

        floodInside();
        recalcGoals();

        crateSlide = null;
        slideTimer = 0;
        walkQueue = [];
        walkStepTimer = 0;
        moves = 0;
        pushes = 0;
        undoStack = [];
        particles = [];
        gameState = keepReady ? "ready" : "play";

        if (keepReady) {
            setStatus("statusReady", levelIndex + 1, lvl.name);
        } else {
            setStatus("statusPlay", levelIndex + 1, lvl.name, cratesOnGoal, totalGoals);
        }
        if (uiHooks.onHud) uiHooks.onHud();
    }

    function spawnBurst(gx, gy, rgb, count) {
        var i, ang, spd;
        for (i = 0; i < count; i++) {
            ang = Math.random() * Math.PI * 2;
            spd = 1.2 + Math.random() * 2.8;
            particles.push({
                gx: gx + 0.5,
                gy: gy + 0.5,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 0.32 + Math.random() * 0.28,
                maxLife: 0.6,
                color: rgb
            });
        }
    }

    function dirFromDelta(dx, dy) {
        if (dx < 0) return "left";
        if (dx > 0) return "right";
        if (dy < 0) return "up";
        return "down";
    }

    function recordSolvedBest() {
        var cur = bestRecords[levelIndex];
        var nextMoves = cur ? Math.min(cur.moves, moves) : moves;
        var nextPushes = cur ? Math.min(cur.pushes, pushes) : pushes;
        if (!cur || nextMoves !== cur.moves || nextPushes !== cur.pushes) {
            bestRecords[levelIndex] = { moves: nextMoves, pushes: nextPushes };
        }
        return saveSettings(false);
    }

    function completeLevel() {
        var t = THEMES[currentThemeName] || THEMES.dark;
        var wasAllSolved = (countSolvedLevels() === LEVELS.length);
        var saveOk, x, y;
        saveOk = recordSolvedBest();
        for (y = 0; y < rows; y++) {
            for (x = 0; x < cols; x++) {
                if (goalGrid[y][x]) spawnBurst(x, y, t.sparkGold, 8);
            }
        }
        if (countSolvedLevels() === LEVELS.length && (!wasAllSolved || levelIndex === LEVELS.length - 1)) {
            gameState = "allclear";
            setStatus("statusAllClear", LEVELS.length);
        } else {
            gameState = "clear";
            setStatus("statusClear", levelIndex + 1, moves, pushes);
        }
        if (!saveOk) {
            setStatus("statusSaveErr");
        }
        if (uiHooks.onHud) uiHooks.onHud();
    }

    function tryMove(dx, dy, silentStatus, animateSlide) {
        var nx = player.x + dx;
        var ny = player.y + dy;
        var bx, by, pushed = false;
        var prevDir = player.dir;
        var t = THEMES[currentThemeName] || THEMES.dark;

        if (gameState === "ready") gameState = "play";
        if (gameState !== "play") return false;

        player.dir = dirFromDelta(dx, dy);

        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || wallGrid[ny][nx]) {
            slideTimer = 0;
            crateSlide = null;
            if (!silentStatus) setStatus("statusBlocked");
            return false;
        }

        if (crateGrid[ny][nx]) {
            bx = nx + dx;
            by = ny + dy;
            if (bx < 0 || bx >= cols || by < 0 || by >= rows || wallGrid[by][bx] || crateGrid[by][bx]) {
                slideTimer = 0;
                crateSlide = null;
                if (!silentStatus) setStatus("statusBlocked");
                return false;
            }
            crateGrid[ny][nx] = false;
            crateGrid[by][bx] = true;
            crateSlide = { fromX: nx, fromY: ny, toX: bx, toY: by };
            pushed = true;
            pushes++;
            if (goalGrid[by][bx]) {
                spawnBurst(bx, by, t.spark, 8);
            }
        } else {
            crateSlide = null;
        }

        undoStack.push({
            dx: dx,
            dy: dy,
            pushed: pushed,
            prevDir: prevDir
        });

        player.fromX = player.x;
        player.fromY = player.y;
        player.x = nx;
        player.y = ny;
        moves++;
        if (animateSlide) {
            slideTimer = SLIDE_DUR;
        } else {
            slideTimer = 0;
            crateSlide = null;
        }

        recalcGoals();
        if (cratesOnGoal === totalGoals && totalGoals > 0) {
            completeLevel();
            return true;
        }

        if (!silentStatus) {
            setStatus("statusMoved", levelIndex + 1, LEVELS[levelIndex].name, moves, pushes);
        }
        if (uiHooks.onHud) uiHooks.onHud();
        return true;
    }

    function undoMove() {
        var rec, cx, cy, px, py;
        walkQueue = [];
        walkStepTimer = 0;
        if (gameState === "clear" || gameState === "allclear") return false;
        if (gameState === "ready") gameState = "play";
        if (undoStack.length === 0) {
            setStatus("statusNoUndo");
            return false;
        }
        rec = undoStack.pop();
        px = player.x;
        py = player.y;
        player.fromX = px;
        player.fromY = py;
        player.x = px - rec.dx;
        player.y = py - rec.dy;
        player.dir = rec.prevDir || dirFromDelta(rec.dx, rec.dy);

        if (rec.pushed) {
            cx = px + rec.dx;
            cy = py + rec.dy;
            crateGrid[cy][cx] = false;
            crateGrid[py][px] = true;
            crateSlide = { fromX: cx, fromY: cy, toX: px, toY: py };
            pushes = Math.max(0, pushes - 1);
        } else {
            crateSlide = null;
        }
        moves = Math.max(0, moves - 1);
        slideTimer = 0;
        crateSlide = null;

        recalcGoals();
        setStatus("statusUndid", moves, pushes);
        if (uiHooks.onHud) uiHooks.onHud();
        return true;
    }

    // BFS shortest walking path (around walls and crates) to clicked cell
    function findWalkPath(tx, ty) {
        var q = [{ x: player.x, y: player.y }];
        var head = 0;
        var parent = [];
        var dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        var x, y, cur, i, nx, ny, found = false, path = [], step;

        if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) return null;
        if (wallGrid[ty][tx] || crateGrid[ty][tx]) return null;
        if (tx === player.x && ty === player.y) return [];

        for (y = 0; y < rows; y++) {
            parent.push([]);
            for (x = 0; x < cols; x++) parent[y].push(null);
        }
        parent[player.y][player.x] = { x: -1, y: -1 };

        while (head < q.length) {
            cur = q[head++];
            if (cur.x === tx && cur.y === ty) {
                found = true;
                break;
            }
            for (i = 0; i < 4; i++) {
                nx = cur.x + dirs[i][0];
                ny = cur.y + dirs[i][1];
                if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
                if (wallGrid[ny][nx] || crateGrid[ny][nx] || parent[ny][nx] !== null) continue;
                parent[ny][nx] = { x: cur.x, y: cur.y, dx: dirs[i][0], dy: dirs[i][1] };
                q.push({ x: nx, y: ny });
            }
        }
        if (!found) return null;

        x = tx;
        y = ty;
        while (x !== player.x || y !== player.y) {
            step = parent[y][x];
            path.push({ dx: step.dx, dy: step.dy });
            x = step.x;
            y = step.y;
        }
        path.reverse();
        return path;
    }

    function clickBoardCell(tx, ty, animateWalk) {
        var dx, dy, path, i;
        if (gameState === "ready") {
            gameState = "play";
            setStatus("statusPlay", levelIndex + 1, LEVELS[levelIndex].name, cratesOnGoal, totalGoals);
            if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) return false;
        }
        if (gameState === "clear") {
            loadLevel(levelIndex + 1, false);
            saveSettings(true);
            return true;
        }
        if (gameState === "allclear") {
            loadLevel(0, false);
            saveSettings(true);
            return true;
        }
        if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) return false;

        walkQueue = [];
        dx = tx - player.x;
        dy = ty - player.y;
        // Clicking an orthogonally adjacent crate pushes it directly
        if (Math.abs(dx) + Math.abs(dy) === 1 && crateGrid[ty][tx]) {
            return tryMove(dx, dy, false);
        }

        path = findWalkPath(tx, ty);
        if (path === null) {
            setStatus("statusNoPath");
            return false;
        }
        if (path.length === 0) return false;

        if (animateWalk && path.length > 1) {
            walkQueue = path;
            walkStepTimer = 0;
            // Execute first step immediately so click feels instant
            var first = walkQueue.shift();
            tryMove(first.dx, first.dy, true);
            walkStepTimer = WALK_STEP_INTERVAL;
            return true;
        }

        for (i = 0; i < path.length; i++) {
            tryMove(path[i].dx, path[i].dy, i < path.length - 1);
        }
        return true;
    }

    function computeBoardMetrics() {
        var maxCellW = Math.floor((BOARD_W - 20) / Math.max(1, cols));
        var maxCellH = Math.floor((BOARD_H - 20) / Math.max(1, rows));
        var cell = Math.max(22, Math.min(48, Math.min(maxCellW, maxCellH)));
        var gridW = cols * cell;
        var gridH = rows * cell;
        return {
            cell: cell,
            ox: BOARD_X + Math.floor((BOARD_W - gridW) * 0.5),
            oy: BOARD_Y + Math.floor((BOARD_H - gridH) * 0.5),
            gridW: gridW,
            gridH: gridH
        };
    }

    function update(dt) {
        var i, p, step;
        if (dt <= 0) return;
        globalTime += dt;
        if (slideTimer > 0) {
            slideTimer = Math.max(0, slideTimer - dt);
            if (slideTimer === 0) crateSlide = null;
        }
        if (walkQueue.length > 0 && gameState === "play") {
            walkStepTimer -= dt;
            if (walkStepTimer <= 0) {
                step = walkQueue.shift();
                if (!tryMove(step.dx, step.dy, walkQueue.length > 0, walkQueue.length > 0)) {
                    walkQueue = [];
                } else {
                    walkStepTimer = WALK_STEP_INTERVAL;
                }
            }
        }
        for (i = particles.length - 1; i >= 0; i--) {
            p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            p.gx += p.vx * dt;
            p.gy += p.vy * dt;
            p.vx *= 0.9;
            p.vy *= 0.9;
        }
    }

    // --------------------------------------------------------- rendering

    function drawHudCards(g, t) {
        var cardGap = 8;
        var cardW = (BOARD_W - cardGap * 3) / 4;
        var cardBg = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.hudBg, 1));
        var cardPen = g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.hudStroke, 1), 1);
        var cardRects = [];
        var labels = ["STAGE", "MOVES", "PUSHES", "CRATES"];
        var i, cx, bestRec, bestMoveStr, bestPushStr, stageTag, barW, fillW;

        for (i = 0; i < 4; i++) {
            cardRects.push([BOARD_X + i * (cardW + cardGap), PAD_TOP, cardW, HUD_H]);
        }
        fillBatchRects(g, cardRects, 8, cardBg);
        for (i = 0; i < 4; i++) {
            strokeRoundRect(g, cardRects[i][0], PAD_TOP, cardW, HUD_H, 8, cardPen);
            drawVectorText(g, labels[i], cardRects[i][0] + cardW * 0.5, PAD_TOP + 13, 8.5, t.textSub, 0.95, 0.22);
        }

        // Card 1: STAGE + solved star / level name
        cx = cardRects[0][0] + cardW * 0.5;
        bestRec = bestRecords[levelIndex];
        drawVectorText(g, padZero(levelIndex + 1, 2) + "/" + padZero(LEVELS.length, 2),
            cx, PAD_TOP + 37, 17, t.accStage, 1, 0.16);
        stageTag = (bestRec ? "* " : "") + LEVELS[levelIndex].name;
        drawVectorText(g, stageTag, cx, PAD_TOP + 57, 7.2, bestRec ? t.accCrates : t.textSub, 0.92, 0.14);

        // Card 2: MOVES
        cx = cardRects[1][0] + cardW * 0.5;
        drawVectorText(g, padZero(moves, 3), cx, PAD_TOP + 37, 18, t.accMoves, 1, 0.18);
        bestMoveStr = bestRec ? ("BEST " + padZero(bestRec.moves, 3)) : "BEST ---";
        drawVectorText(g, bestMoveStr, cx, PAD_TOP + 57, 7.5, t.textSub, 0.88, 0.16);

        // Card 3: PUSHES
        cx = cardRects[2][0] + cardW * 0.5;
        drawVectorText(g, padZero(pushes, 3), cx, PAD_TOP + 37, 18, t.accPushes, 1, 0.18);
        bestPushStr = bestRec ? ("BEST " + padZero(bestRec.pushes, 3)) : ("PAR " + padZero(LEVELS[levelIndex].par, 3));
        drawVectorText(g, bestPushStr, cx, PAD_TOP + 57, 7.5, t.textSub, 0.88, 0.16);

        // Card 4: CRATES ON TARGET + progress bar
        cx = cardRects[3][0] + cardW * 0.5;
        drawVectorText(g, cratesOnGoal + "/" + totalGoals, cx, PAD_TOP + 35, 16, t.accCrates, 1, 0.18);
        barW = cardW - 24;
        fillRoundRect(g, cx - barW * 0.5, PAD_TOP + 53, barW, 6, 3,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.barTrack, 1)));
        if (totalGoals > 0 && cratesOnGoal > 0) {
            fillW = Math.max(6, barW * (cratesOnGoal / totalGoals));
            fillRoundRect(g, cx - barW * 0.5, PAD_TOP + 53, fillW, 6, 3,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.accCrates, 1)));
        }
    }

    function drawOverlay(g, t, titleText, subText, accentColor) {
        var boxW = 380;
        var boxH = 98;
        var bx = BOARD_X + (BOARD_W - boxW) * 0.5;
        var by = BOARD_Y + (BOARD_H - boxH) * 0.5;

        fillRoundRect(g, bx, by, boxW, boxH, 12,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.overlayBg, 0.90)));
        strokeRoundRect(g, bx, by, boxW, boxH, 12,
            g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(accentColor, 0.95), 2));
        drawVectorText(g, titleText, bx + boxW * 0.5, by + 35, 17, accentColor, 1, 0.2);
        if (subText) {
            drawVectorText(g, subText, bx + boxW * 0.5, by + 68, 8.6, t.textSub, 0.95, 0.16);
        }
    }

    function drawCrateItem(g, t, px, py, cell, onGoal) {
        var pad = Math.max(2, Math.floor(cell * 0.08));
        var x = px + pad;
        var y = py + pad;
        var s = cell - pad * 2;
        var inset = Math.max(3, Math.floor(s * 0.16));
        var rad = Math.max(3, Math.floor(s * 0.14));
        var outerCol = onGoal ? t.crateDoneOuter : t.crateOuter;
        var innerCol = onGoal ? t.crateDoneInner : t.crateInner;
        var braceCol = onGoal ? t.crateDoneBrace : t.crateBrace;
        var hiCol = onGoal ? t.crateDoneHi : t.crateHi;
        var braceR = Math.max(1.2, s * 0.055);
        var innerBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(braceCol, 0.72));

        fillRoundRect(g, x, y, s, s, rad, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(outerCol, 1)));
        fillRoundRect(g, x + inset, y + inset, s - inset * 2, s - inset * 2, Math.max(2, rad - 1),
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(innerCol, 1)));

        // Top bevel glint
        fillRoundRect(g, x + inset, y + Math.max(1, inset * 0.4), s - inset * 2, Math.max(2, s * 0.07), 1,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(hiCol, 0.65)));

        // Cross-brace straps inside crate
        fillCapsule(g, x + inset + 2, y + inset + 2, x + s - inset - 2, y + s - inset - 2, braceR, innerBrush);
        fillCapsule(g, x + s - inset - 2, y + inset + 2, x + inset + 2, y + s - inset - 2, braceR, innerBrush);

        if (onGoal) {
            fillBatchCircles(g, [[px + cell * 0.5, py + cell * 0.5, Math.max(2.6, s * 0.11)]],
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(hiCol, 0.95)));
        }
    }

    function drawPlayerGlyph(g, t, cx, cy, cell) {
        var r = cell * 0.34;
        var hr = r * 0.68;
        var ex = 0, ey = 0;
        if (player.dir === "left") ex = -r * 0.28;
        else if (player.dir === "right") ex = r * 0.28;
        else if (player.dir === "up") ey = -r * 0.26;
        else ey = r * 0.26;

        // Body badge
        fillBatchCircles(g, [[cx, cy + r * 0.06, r]],
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.playerTrim, 1)));
        fillBatchCircles(g, [[cx, cy, r * 0.82]],
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.playerSuit, 1)));
        // Hard-hat cap + visor indicator
        fillBatchCircles(g, [[cx + ex * 0.25, cy - r * 0.14 + ey * 0.25, hr]],
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.playerHelmet, 1)));
        fillBatchCircles(g, [[cx + ex * 0.9, cy + ey * 0.85, Math.max(2.2, r * 0.24)]],
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.playerVisor, 1)));
    }

    function drawSceneUnsafe(g) {
        var t = THEMES[currentThemeName] || THEMES.dark;
        var m = computeBoardMetrics();
        var cell = m.cell;
        var ox = m.ox;
        var oy = m.oy;
        var x, y, px, py, i, cx, cy, pulse;
        var floorEven = [], floorOdd = [];
        var wallBase = [], wallHi = [], wallShade = [];
        var goalPads = [], goalCores = [];
        var prog, pInterpX, pInterpY, drawX, drawY, p;

        if (!g) return;

        // 1. Canvas & HUD
        fillBatchRects(g, [[0, 0, CANVAS_W, CANVAS_H]], 0,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.bg, 1)));
        drawHudCards(g, t);

        // 2. Board frame
        fillRoundRect(g, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 8,
            g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.boardBg, 1)));
        strokeRoundRect(g, BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 8,
            g.newPen(g.PenType.SOLID_COLOR, rgbToNorm(t.boardStroke, 0.85), 1.2));

        // 3. Collect interior floor tiles, goals, and walls (batched)
        for (y = 0; y < rows; y++) {
            for (x = 0; x < cols; x++) {
                px = ox + x * cell;
                py = oy + y * cell;
                if (wallGrid[y][x]) {
                    wallBase.push([px + 1, py + 1, cell - 2, cell - 2]);
                    wallHi.push([px + 3, py + 3, cell - 6, Math.max(3, Math.floor(cell * 0.14))]);
                    wallShade.push([px + 3, py + cell - Math.max(5, Math.floor(cell * 0.16)), cell - 6, Math.max(3, Math.floor(cell * 0.12))]);
                } else if (insideGrid[y][x]) {
                    if ((x + y) % 2 === 0) floorEven.push([px, py, cell, cell]);
                    else floorOdd.push([px, py, cell, cell]);
                    if (goalGrid[y][x]) {
                        goalPads.push([px + cell * 0.24, py + cell * 0.24, cell * 0.52, cell * 0.52]);
                        goalCores.push([px + cell * 0.5, py + cell * 0.5, Math.max(3, cell * 0.13)]);
                    }
                }
            }
        }

        if (floorEven.length > 0) {
            fillBatchRects(g, floorEven, 0, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.floor, 1)));
        }
        if (floorOdd.length > 0) {
            fillBatchRects(g, floorOdd, 0, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.floorAlt, 0.85)));
        }

        if (wallBase.length > 0) {
            fillBatchRects(g, wallBase, 4, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.wallBase, 1)));
            fillBatchRects(g, wallHi, 2, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.wallHi, 0.72)));
            fillBatchRects(g, wallShade, 2, g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.wallShade, 0.85)));
        }

        // 4. Target pads (with gentle beacon pulse)
        pulse = 0.65 + 0.35 * Math.sin(globalTime * 4.5);
        if (goalPads.length > 0) {
            fillBatchRects(g, goalPads, 6,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.goalRing, 0.22 + 0.14 * pulse)));
            fillBatchCircles(g, goalCores,
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(t.goalCore, 0.78 + 0.2 * pulse)));
        }

        // 5. Crates (smooth interpolation for actively pushed crate)
        prog = (slideTimer > 0) ? (1 - slideTimer / SLIDE_DUR) : 1;
        for (y = 0; y < rows; y++) {
            for (x = 0; x < cols; x++) {
                if (!crateGrid[y][x]) continue;
                drawX = x;
                drawY = y;
                if (crateSlide && crateSlide.toX === x && crateSlide.toY === y && slideTimer > 0) {
                    drawX = crateSlide.fromX + (crateSlide.toX - crateSlide.fromX) * prog;
                    drawY = crateSlide.fromY + (crateSlide.toY - crateSlide.fromY) * prog;
                }
                drawCrateItem(g, t, ox + drawX * cell, oy + drawY * cell, cell, goalGrid[y][x]);
            }
        }

        // 6. Player character
        pInterpX = player.fromX + (player.x - player.fromX) * prog;
        pInterpY = player.fromY + (player.y - player.fromY) * prog;
        cx = ox + (pInterpX + 0.5) * cell;
        cy = oy + (pInterpY + 0.5) * cell;
        drawPlayerGlyph(g, t, cx, cy, cell);

        // 7. Spark particles
        for (i = 0; i < particles.length; i++) {
            p = particles[i];
            fillBatchCircles(g, [[ox + p.gx * cell, oy + p.gy * cell, 2.2]],
                g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(p.color, Math.max(0.15, p.life / p.maxLife))));
        }

        // 8. State overlays
        if (gameState === "ready") {
            drawOverlay(g, t, "SOKOBAN", "ARROWS / WASD OR CLICK TO MOVE", t.accStage);
        } else if (gameState === "clear") {
            drawOverlay(g, t, "STAGE " + padZero(levelIndex + 1, 2) + " CLEAR!",
                moves + " MOVES * " + pushes + " PUSHES - SPACE NEXT", t.accCrates);
        } else if (gameState === "allclear") {
            drawOverlay(g, t, "ALL " + LEVELS.length + " CLEAR!",
                "WAREHOUSE MASTER - SPACE TO REPLAY", t.accMoves);
        }
    }

    // --------------------------------------------------------- artboard export

    function exportToArtboard() {
        var t = THEMES[currentThemeName] || THEMES.dark;
        var m = computeBoardMetrics();
        var cell = m.cell;
        var doc, layer = null, grp, bgRect, originX, originY, ab, x, y, r, rect, circ;

        try {
            if (!app.documents || app.documents.length === 0) {
                doc = app.documents.add(DocumentColorSpace.RGB);
            } else {
                doc = app.activeDocument;
            }
            layer = doc.layers.add();
            layer.name = "Sokoban - Stage " + padZero(levelIndex + 1, 2);
            grp = layer.groupItems.add();

            ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
            originX = (ab[0] + ab[2] - cols * cell) * 0.5;
            originY = (ab[1] + ab[3] + rows * cell) * 0.5;

            bgRect = grp.pathItems.rectangle(originY + 8, originX - 8, cols * cell + 16, rows * cell + 16);
            bgRect.filled = true;
            bgRect.fillColor = makeRGBColor(t.boardBg);
            bgRect.stroked = true;
            bgRect.strokeColor = makeRGBColor(t.boardStroke);
            bgRect.strokeWidth = 1.5;

            for (y = 0; y < rows; y++) {
                for (x = 0; x < cols; x++) {
                    if (wallGrid[y][x]) {
                        rect = grp.pathItems.rectangle(originY - y * cell - 1, originX + x * cell + 1, cell - 2, cell - 2);
                        rect.filled = true;
                        rect.fillColor = makeRGBColor(t.wallBase);
                        rect.stroked = false;
                    } else if (insideGrid[y][x]) {
                        rect = grp.pathItems.rectangle(originY - y * cell, originX + x * cell, cell, cell);
                        rect.filled = true;
                        rect.fillColor = makeRGBColor((x + y) % 2 === 0 ? t.floor : t.floorAlt);
                        rect.stroked = false;

                        if (goalGrid[y][x]) {
                            r = cell * 0.16;
                            circ = grp.pathItems.ellipse(
                                originY - (y + 0.5) * cell + r,
                                originX + (x + 0.5) * cell - r,
                                r * 2, r * 2
                            );
                            circ.filled = true;
                            circ.fillColor = makeRGBColor(t.goalCore);
                            circ.stroked = false;
                        }
                    }

                    if (crateGrid[y][x]) {
                        rect = grp.pathItems.rectangle(originY - y * cell - 3, originX + x * cell + 3, cell - 6, cell - 6);
                        rect.filled = true;
                        rect.fillColor = makeRGBColor(goalGrid[y][x] ? t.crateDoneInner : t.crateInner);
                        rect.stroked = true;
                        rect.strokeColor = makeRGBColor(goalGrid[y][x] ? t.crateDoneOuter : t.crateOuter);
                        rect.strokeWidth = 2;
                    }
                }
            }

            r = cell * 0.32;
            circ = grp.pathItems.ellipse(
                originY - (player.y + 0.5) * cell + r,
                originX + (player.x + 0.5) * cell - r,
                r * 2, r * 2
            );
            circ.filled = true;
            circ.fillColor = makeRGBColor(t.playerHelmet);
            circ.stroked = true;
            circ.strokeColor = makeRGBColor(t.playerTrim);
            circ.strokeWidth = 2;

            app.redraw();
            setStatus("statusExported", layer.name);
        } catch (err) {
            if (layer) {
                try { layer.remove(); } catch (eRem) {}
            }
            setStatus("statusExportErr", (err && err.message) ? err.message : String(err));
        }
    }

    // --------------------------------------------------------- headless test hook

    if (typeof __SOKOBAN_TEST__ === "object" && __SOKOBAN_TEST__ !== null) {
        __SOKOBAN_TEST__.exports = {
            LEVELS: LEVELS,
            loadLevel: loadLevel,
            tryMove: tryMove,
            undoMove: undoMove,
            findWalkPath: findWalkPath,
            clickBoardCell: clickBoardCell,
            update: update,
            drawSceneUnsafe: drawSceneUnsafe,
            saveSettings: saveSettings,
            loadSettings: loadSettings,
            completeLevel: completeLevel,
            getState: function () {
                return {
                    levelIndex: levelIndex,
                    cols: cols,
                    rows: rows,
                    wallGrid: wallGrid,
                    goalGrid: goalGrid,
                    crateGrid: crateGrid,
                    insideGrid: insideGrid,
                    player: player,
                    moves: moves,
                    pushes: pushes,
                    totalGoals: totalGoals,
                    cratesOnGoal: cratesOnGoal,
                    gameState: gameState,
                    statusKey: currentStatusKey,
                    bestRecords: bestRecords,
                    walkQueueLen: walkQueue.length,
                    undoDepth: undoStack.length,
                    THEMES: THEMES,
                    I18N: I18N
                };
            },
            setTheme: function (th) { currentThemeName = th; }
        };
        return;
    }

    // --------------------------------------------------------- ScriptUI dialog

    loadSettings();
    loadLevel(levelIndex, true);

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
    canvas.addEventListener("mousedown", function (ev) {
        var m = computeBoardMetrics();
        var gx = Math.floor((ev.clientX - m.ox) / m.cell);
        var gy = Math.floor((ev.clientY - m.oy) / m.cell);
        clickBoardCell(gx, gy, hbActive);
        refocusControl();
        refreshUI(false);
    });

    var statusText = win.add("statictext", undefined, tr("statusReady", levelIndex + 1, LEVELS[levelIndex].name));
    statusText.preferredSize = [CANVAS_W, 20];

    var hintText = win.add("statictext", undefined, tr("hint"));
    hintText.preferredSize = [CANVAS_W, 18];

    var btnRow = win.add("group");
    btnRow.orientation = "row";
    btnRow.alignChildren = ["left", "center"];
    btnRow.preferredSize = [CANVAS_W, 28];
    btnRow.spacing = 4;

    var btnPrev = btnRow.add("button", undefined, tr("btnPrev"));
    btnPrev.preferredSize = [32, 24];
    var btnNext = btnRow.add("button", undefined, tr("btnNext"));
    btnNext.preferredSize = [32, 24];
    var btnUndo = btnRow.add("button", undefined, tr("btnUndo"));
    btnUndo.preferredSize = [62, 24];
    var btnReset = btnRow.add("button", undefined, tr("btnReset"));
    btnReset.preferredSize = [68, 24];
    var btnExport = btnRow.add("button", undefined, tr("btnExport"));
    btnExport.preferredSize = [96, 24];
    var btnTheme = btnRow.add("button", undefined,
        currentThemeName === "dark" ? tr("btnThemeDark") : tr("btnThemeLight"));
    btnTheme.preferredSize = [92, 24];

    var langList = [];
    var lIdx, selectedLangIdx = 0;
    for (lIdx = 0; lIdx < LANG_ORDER.length; lIdx++) {
        langList.push(LANG_NAMES[LANG_ORDER[lIdx]]);
        if (LANG_ORDER[lIdx] === currentLang) selectedLangIdx = lIdx;
    }
    var ddLang = btnRow.add("dropdownlist", undefined, langList);
    ddLang.preferredSize = [72, 24];
    ddLang.selection = selectedLangIdx;

    var btnClose = btnRow.add("button", undefined, tr("btnClose"), { name: "cancel" });
    btnClose.preferredSize = [74, 24];

    var HB = { title: WIN_TITLE, token: SAVE_TOKEN, tickMs: 25, highRes: true };
    var lastFrameMs = perfNow();
    var lastStatusShown = "";
    var lastActionKey = "";
    var lastActionMs = 0;
    var hbActive = false;
    var closing = false;
    var drawErrLogged = false;

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
            if (!closing) btnUndo.active = true;
        } catch (e) {}
    }

    function refreshUI(forceLabels) {
        var t0, t1, t2, t3, nextStatus;
        if (closing) return;
        t0 = perfNow();
        if (forceLabels) {
            applyThemeColors();
            win.text = WIN_TITLE;
            btnPrev.text = tr("btnPrev");
            btnNext.text = tr("btnNext");
            btnUndo.text = tr("btnUndo");
            btnReset.text = tr("btnReset");
            btnExport.text = tr("btnExport");
            btnTheme.text = (currentThemeName === "dark") ? tr("btnThemeDark") : tr("btnThemeLight");
            btnClose.text = tr("btnClose");
            hintText.text = tr("hint");
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
        // Update status banner after canvas redraws so text never leads visual movement.
        nextStatus = relaxTranslate(I18N[currentLang] || I18N.en, I18N.en, currentStatusKey, currentStatusArgs);
        if (forceLabels || nextStatus !== lastStatusShown) {
            statusText.text = nextStatus;
            lastStatusShown = nextStatus;
        }
        perfFrame(t1 - t0, t2 - t1, t3 - t2);
    }

    function deltaFromKey(k) {
        if (k === "UP" || k === "W") return { dx: 0, dy: -1 };
        if (k === "DOWN" || k === "S") return { dx: 0, dy: 1 };
        if (k === "LEFT" || k === "A") return { dx: -1, dy: 0 };
        if (k === "RIGHT" || k === "D") return { dx: 1, dy: 0 };
        return null;
    }

    function gameTick() {
        var now, dt;
        if (closing) return;
        now = perfNow();
        dt = (now - lastFrameMs) / 1000;
        lastFrameMs = now;
        if (dt > 0.08) dt = 0.08;
        if (dt < 0) dt = 0;

        update(dt);
        refreshUI(false);
    }

    function finishKeyRefresh(key) {
        refreshUI(false);
        lastActionKey = key;
        lastActionMs = perfNow();
    }

    function handleKeyDown(ev) {
        var k = (ev && ev.keyName) ? String(ev.keyName).toUpperCase() : "";
        var now = perfNow();
        var d;

        if (k === "F15") {
            if (ev && ev.target && ev.currentTarget && ev.target !== ev.currentTarget) return;
            if (ev && ev.preventDefault) ev.preventDefault();
            gameTick();
            return;
        }

        // ScriptUI can still bubble a child button's keydown up to win even after
        // stopPropagation(), often >30ms later once refreshUI(false) finishes.
        if (ev && ev.target && ev.currentTarget && ev.target !== ev.currentTarget) {
            if (ev.preventDefault) ev.preventDefault();
            if (ev.stopPropagation) ev.stopPropagation();
            return;
        }
        if (k === lastActionKey && (now - lastActionMs) < KEY_DEDUP_MS) {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev && ev.stopPropagation) ev.stopPropagation();
            return;
        }
        lastActionKey = k;
        lastActionMs = now;
        perfKey();

        if (k === "ESCAPE") {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev && ev.stopPropagation) ev.stopPropagation();
            closeWindow();
            return;
        }

        d = deltaFromKey(k);
        if (d) {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev && ev.stopPropagation) ev.stopPropagation();
            walkQueue = [];
            tryMove(d.dx, d.dy, false, typeof requestAnimationFrame === "function");
            finishKeyRefresh(k);
            return;
        }

        if (k === "Z" || k === "U" || k === "BACKSPACE") {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev && ev.stopPropagation) ev.stopPropagation();
            undoMove();
            finishKeyRefresh(k);
            return;
        }
        if (k === "R") {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev && ev.stopPropagation) ev.stopPropagation();
            loadLevel(levelIndex, false);
            setStatus("statusReset", levelIndex + 1);
            finishKeyRefresh(k);
            return;
        }
        if (k === "LEFTBRACKET" || k === "[" || k === "PAGEUP") {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev && ev.stopPropagation) ev.stopPropagation();
            loadLevel(levelIndex - 1, false);
            saveSettings(true);
            finishKeyRefresh(k);
            return;
        }
        if (k === "RIGHTBRACKET" || k === "]" || k === "PAGEDOWN") {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev && ev.stopPropagation) ev.stopPropagation();
            loadLevel(levelIndex + 1, false);
            saveSettings(true);
            finishKeyRefresh(k);
            return;
        }
        if (k === "SPACE" || k === "ENTER" || k === "RETURN") {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev && ev.stopPropagation) ev.stopPropagation();
            walkQueue = [];
            if (gameState === "ready") {
                gameState = "play";
                setStatus("statusPlay", levelIndex + 1, LEVELS[levelIndex].name, cratesOnGoal, totalGoals);
            } else if (gameState === "clear") {
                loadLevel(levelIndex + 1, false);
                saveSettings(true);
            } else if (gameState === "allclear") {
                loadLevel(0, false);
                saveSettings(true);
            }
            finishKeyRefresh(k);
        }
    }

    var focusTargets = [win, canvas, btnPrev, btnNext, btnUndo, btnReset, btnExport, btnTheme, ddLang, btnClose];
    var fIdx;
    for (fIdx = 0; fIdx < focusTargets.length; fIdx++) {
        focusTargets[fIdx].addEventListener("keydown", handleKeyDown);
    }
    win.addEventListener("mousemove", function () {
        if (!hbActive) gameTick();
    });

    btnPrev.onClick = function () {
        loadLevel(levelIndex - 1, false);
        saveSettings(true);
        refocusControl();
        refreshUI(false);
    };
    btnNext.onClick = function () {
        loadLevel(levelIndex + 1, false);
        saveSettings(true);
        refocusControl();
        refreshUI(false);
    };
    btnUndo.onClick = function () {
        undoMove();
        refocusControl();
        refreshUI(false);
    };
    btnReset.onClick = function () {
        loadLevel(levelIndex, false);
        setStatus("statusReset", levelIndex + 1);
        refocusControl();
        refreshUI(false);
    };
    btnExport.onClick = function () {
        exportToArtboard();
        refocusControl();
        refreshUI(false);
    };
    btnTheme.onClick = function () {
        currentThemeName = (currentThemeName === "dark") ? "light" : "dark";
        saveSettings(true);
        refocusControl();
        refreshUI(true);
    };
    ddLang.onChange = function () {
        if (ddLang.selection) {
            currentLang = LANG_ORDER[ddLang.selection.index] || "en";
            saveSettings(true);
            refocusControl();
            refreshUI(true);
        }
    };

    function closeWindow() {
        if (closing) return;
        closing = true;
        saveSettings(false);
        if (hbActive) {
            heartbeatStop();
            hbActive = false;
        }
        perfClose();
        try { win.close(); } catch (e) {}
    }

    btnClose.onClick = closeWindow;
    win.onClose = function () {
        closing = true;
        saveSettings(false);
        if (hbActive) {
            heartbeatStop();
            hbActive = false;
        }
        perfClose();
        return true;
    };

    win.onShow = function () {
        applyThemeColors();
        hbActive = heartbeatStart(HB);
        if (!hbActive) {
            perfNote("heartbeat unavailable: " + heartbeatLastError());
            setStatus("statusNoHeartbeat");
        }
        refocusControl();
        refreshUI(true);
    };

    win.center();
    win.show();
})();
