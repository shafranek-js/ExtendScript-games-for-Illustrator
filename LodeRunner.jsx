#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameI18n.jsx"
#include "lib/GameHeartbeat.jsx"
#include "lib/GamePerf.jsx"
#include "lib/GameAnim.jsx"
#include "lib/GamePersist.jsx"

/**
 * LODE RUNNER - Adobe Illustrator Edition (ExtendScript / ScriptUI).
 *
 * Static single-screen puzzle platformer: climb ladders, swing along ropes,
 * dig holes in brick, collect every lump of gold and escape through the exit
 * at the top. No jumping - the whole game is grid movement.
 *
 * Grid: 28 x 15 cells of 20 px, HUD 40 px, canvas 560 x 340.
 *
 * Legend: '#' brick (diggable), '=' concrete (not diggable), 'H' ladder,
 *         '-' rope, '$' gold, 'P' player, 'E' enemy, 'X' exit, ' ' air.
 */

(function () {
    // ------------------------------------------------------------ constants

    var TILE = 24;                       // 24 px cell: crisp retro proportions
    var COLS = 28;
    var ROWS = 16;
    var PLAY_W = COLS * TILE;           // 672
    var PLAY_H = ROWS * TILE;           // 384
    var HUD_H = 26;                      // bottom retro HUD bar
    var CANVAS_W = PLAY_W;               // 672
    var CANVAS_H = PLAY_H + HUD_H;       // 410

    var MOVE_MS = 180;                   // ms per cell (runner: ~5.5 cells/sec)
    var GUARD_MOVE_MS = 410;             // ms per cell (guard: ~2.4 cells/sec, ~0.44x runner)
    var GUARD_STRIDE_PX = TILE;          // Distance travelled in one full running cycle
    var GUARD_STANCE = 0.41;             // Fraction of a cycle each foot is on the ground
    var RUNNER_STRIDE_PX = TILE * 1.4;
    var RUNNER_STANCE = 0.33;
    var FALL_MS = 70;                    // ms per cell while falling
    var DIG_SWING_MS = 180;              // ms laser dig beam
    var HOLE_MS = 7500;                  // a dug hole refills after this (7.5 s)
    var GUARD_TRAP_MS = 3800;            // guard stuck in hole before climb out (3.8 s)
    var GUARD_RESPAWN_MS = 1200;         // delay before crushed guard reborn (1.2 s)

    var WIN_TITLE = "LODE RUNNER - Adobe Illustrator Edition";
    var HB = { title: WIN_TITLE, token: "LodeRunner", tickMs: 16, highRes: true };

    // Authentic Apple II color palette matching the arcade original
    var PAL = {
        back: [0, 0, 0],                 // pure black screen
        brick: [0, 144, 255],            // Apple II cyan-blue
        brickDark: [0, 0, 0],            // black mortar seams
        solid: [136, 144, 156],          // concrete grey
        solidDark: [84, 92, 102],
        ladder: [255, 255, 255],         // white ladders
        ladderDark: [180, 180, 180],
        rope: [255, 255, 255],           // white ropes
        goldOrange: [242, 94, 0],        // classic orange gold stripe
        goldWhite: [255, 255, 255],      // white middle stripe
        player: [255, 255, 255],         // white runner stickman
        guardBody: [242, 94, 0],         // orange guard body and cap
        guardWhite: [255, 255, 255],     // white running legs and face
        guardRedHat: [235, 30, 30],      // red cap when guard carries gold
        digBeam: [0, 220, 255],          // cyan laser dig beam
        hole: [0, 0, 0],                 // empty pit
        hudBg: [0, 0, 0],                // bottom HUD black
        hudCyan: [0, 144, 255],          // Apple II blue font
        hudWhite: [255, 255, 255]
    };

    var LANGS = ["en", "ru", "cs", "ro", "hi"];

    var I18N = {
        en: {
            langName: "EN",
            hudLevel: "LEVEL {0}",
            hudGold: "GOLD {0}",
            hudScore: "SCORE {0}",
            hudLives: "LIVES {0}",
            hudTime: "TIME {0}",
            hudExit: "EXIT OPEN",
            statusPlay: "Arrows / WASD: move   Z: dig left   X: dig right   P: pause   R: restart",
            statusPause: "PAUSED - press P to continue",
            statusDead: "Caught! Lives left: {0}",
            statusClear: "LEVEL CLEAR!",
            statusOver: "GAME OVER - press R",
            statusNoHeartbeat: "Timer unavailable - move the mouse to advance.",
            btnRestart: "Restart (R)",
            btnClose: "Close (Esc)",
            btnLang: "Lang: {0}"
        },
        ru: {
            langName: "RU",
            hudLevel: "УРОВЕНЬ {0}",
            hudGold: "ЗОЛОТО {0}",
            hudScore: "СЧЁТ {0}",
            hudLives: "ЖИЗНИ {0}",
            hudTime: "ВРЕМЯ {0}",
            hudExit: "ВЫХОД ОТКРЫТ",
            statusPlay: "Стрелки / WASD: ход   Z: копать влево   X: копать вправо   P: пауза   R: заново",
            statusPause: "ПАУЗА - нажмите P",
            statusDead: "Поймали! Осталось жизней: {0}",
            statusClear: "УРОВЕНЬ ПРОЙДЕН!",
            statusOver: "ИГРА ОКОНЧЕНА - нажмите R",
            statusNoHeartbeat: "Таймер недоступен - двигайте мышь.",
            btnRestart: "Заново (R)",
            btnClose: "Закрыть (Esc)",
            btnLang: "Язык: {0}"
        },
        cs: {
            langName: "CS",
            hudLevel: "ÚROVEŇ {0}",
            hudGold: "ZLATO {0}",
            hudScore: "SKÓRE {0}",
            hudLives: "ŽIVOTY {0}",
            hudTime: "ČAS {0}",
            hudExit: "VÝCHOD OTEVŘEN",
            statusPlay: "Šipky / WASD: pohyb   Z: kopat vlevo   X: kopat vpravo   P: pauza   R: znovu",
            statusPause: "PAUZA - stiskněte P",
            statusDead: "Chycen! Zbývá životů: {0}",
            statusClear: "ÚROVEŇ DOKONČENA!",
            statusOver: "KONEC HRY - stiskněte R",
            statusNoHeartbeat: "Časovač není dostupný - hýbejte myší.",
            btnRestart: "Znovu (R)",
            btnClose: "Zavřít (Esc)",
            btnLang: "Jazyk: {0}"
        },
        ro: {
            langName: "RO",
            hudLevel: "NIVEL {0}",
            hudGold: "AUR {0}",
            hudScore: "SCOR {0}",
            hudLives: "VIEȚI {0}",
            hudTime: "TIMP {0}",
            hudExit: "IEȘIRE DESCHISĂ",
            statusPlay: "Săgeți / WASD: mișcare   Z: sapă stânga   X: sapă dreapta   P: pauză   R: restart",
            statusPause: "PAUZĂ - apăsați P",
            statusDead: "Prins! Vieți rămase: {0}",
            statusClear: "NIVEL COMPLET!",
            statusOver: "JOC TERMINAT - apăsați R",
            statusNoHeartbeat: "Cronometru indisponibil - mișcați mouse-ul.",
            btnRestart: "Restart (R)",
            btnClose: "Închide (Esc)",
            btnLang: "Limbă: {0}"
        },
        hi: {
            langName: "HI",
            hudLevel: "स्तर {0}",
            hudGold: "सोना {0}",
            hudScore: "स्कोर {0}",
            hudLives: "जीवन {0}",
            hudTime: "समय {0}",
            hudExit: "निकास खुला",
            statusPlay: "तीर / WASD: चलें   Z: बाएँ खोदें   X: दाएँ खोदें   P: विराम   R: पुनः",
            statusPause: "विराम - P दबाएँ",
            statusDead: "पकड़े गए! शेष जीवन: {0}",
            statusClear: "स्तर पूरा!",
            statusOver: "खेल समाप्त - R दबाएँ",
            statusNoHeartbeat: "टाइमर उपलब्ध नहीं - माउस हिलाएँ।",
            btnRestart: "पुनः (R)",
            btnClose: "बंद (Esc)",
            btnLang: "भाषा: {0}"
        }
    };

    var currentLang = "en";

    function tr(key, args) {
        return relaxTranslate(I18N[currentLang] || I18N.en, I18N.en, key, args);
    }

    // --------------------------------------------------------------- levels

    var LEVELS = [
        {
            name: "1",
            map: [
                "                  S         ",
                "    $             S         ",
                "#######H#######   S         ",
                "       H----------S    $    ",
                "       H    ##H   #######H##",
                "       H    ##H          H  ",
                "     E H    ##H       $E H  ",
                "##H#####    ########H#######",
                "  H                 H       ",
                "  H           E     H       ",
                "#########H##########H       ",
                "         H          H       ",
                "       $ H----------H   $   ",
                "    H######         #######H",
                "    H         P  $         H",
                "############################",
            ]
        },
        {
            name: "2",
            map: [
                "   $                       H",
                "H==#==H           $        H",
                "H     H    H#########H $   H",
                "H $ E H    H         H####XH",
                "H#=#=#H    H         H     S",
                "H     H----H------  EH     S",
                "H     H    H     H###======H",
                "H     H    H  $  H         H",
                "H   E H $  H#####H         H",
                "=###=##=##=H         H###H##",
                "=###=      H         H   H  ",
                "=$  =      H   ------H   H $",
                "########H###====     H  ####",
                "        H            H      ",
                "        H   P        H      ",
                "############################",
            ]
        },
        {
            name: "3",
            map: [
                "                           S",
                "----------    $            S",
                "H $      H##########H      S",
                "#####H   H          H=======",
                "     H E H     $    H       ",
                "     H######H#####H##       ",
                "  $  H      H     H  --     ",
                "####H#      H  E  H    --   ",
                "    H    H######H##      --$",
                "    H----H      H  E       #",
                "    H       H#########H     ",
                "    H       H#########H     ",
                "###H##########   $   #####H#",
                "###H########## H###H #####H#",
                "   H      P    H###H   $  H ",
                "############################",
            ]
        },
        {
            name: "4",
            map: [
                "S                           ",
                "S-----------                ",
                "H     H     # $ #     H     ",
                "H $  HHH  $ ##### $  HHH  $ ",
                "H HH  H  HH       HH  H  HH ",
                "H H HHHHH H       H HHHHH H ",
                "H H  $E$  H   H   H  $E$  H ",
                "H  H#####H   HHH   H#####H  ",
                "H   HHHHH HH  H  HH HHHHH   ",
                "H         H HHHHH H         ",
                "H    $    H  $E$  H     $   ",
                "H######H   H#####H  H#######",
                "H      H    HHHHH   H       ",
                "H      H            H       ",
                "H      H       $  P H       ",
                "############################",
            ]
        },
        {
            name: "5",
            map: [
                "         S                  ",
                "         S       $      E   ",
                "###      S      ####H#######",
                "  ##     S     ##   H       ",
                "   ##    S    ##    H       ",
                "$E ###   S  $###    H   $   ",
                "##H####  S  ####H###H#######",
                "  H   ## S ##   H           ",
                "  H$E  ##H##    H     $     ",
                "H###H    H     #H##H###     ",
                "H   H              H        ",
                "H   H    $     E   H        ",
                "H   H#######H######H#####H##",
                "H           H            H  ",
                "H           H  P         H  ",
                "############################",
            ]
        },
        {
            name: "6",
            map: [
                "##################S#########",
                "# $               S# E $   #",
                "#X###H####H   $   S#######H#",
                "#X###H############## ###  H#",
                "#    H  $ E     #### ###  H#",
                "#H#########H######## ###  H#",
                "#H   ######H#####$$# ###$ H#",
                "#H   ######H##############H#",
                "#H   #    $H    $  E   $ #H#",
                "#H   ###H#######H#######H#H#",
                "#H  $###H       H#######H#H#",
                "#H##X#  H    P  H  ##   H#H#",
                "#H##X#H#####H########$$ H#H#",
                "#H##X#H#####H######$######H#",
                "#HE   H##$##H    $  E     H#",
                "############################",
            ]
        },
        {
            name: "7",
            map: [
                "  S                         ",
                "  S                 --------",
                "  S          E      H      H",
                "#####H#    #H###   EH    $ H",
                "     H      H    ###H#######",
                "  E  H   $  H       H       ",
                "#####H####  H       H       ",
                "     H      H       H       ",
                "  $  H   $  H       H       ",
                "##H############H    H #### H",
                "  H            H $  H #### H",
                "  H  $         H----H # $# H",
                "#######H            H #####H",
                "       H            H      H",
                "       H P        $ H  E   H",
                "############################",
            ]
        },
        {
            name: "8",
            map: [
                "           S    S           ",
                "           S    S           ",
                "   $ E   H#S    S#H   E $   ",
                "H#####H--H#S    S#H--H#####H",
                "H#   #H   #S    S#   H#   #H",
                "H#   #H   #S    S#   H#   #H",
                "H# $ #H   #S    S#   H# $ #H",
                "H#####H   #S    S#   H#####H",
                "H#   #H   #S    S#   H#   #H",
                "H#   #H---#H####H#---H#   #H",
                "H#   #   H#H    H#H   #   #H",
                "H#E$ #   H#H  $EH#H   # $E#H",
                "H##X##   H#======#H   ##X##H",
                "H     X  H        H  X     H",
                "H      XEH    P   H X      H",
                "############################",
            ]
        },
        {
            name: "9",
            map: [
                "S                           ",
                "S---------------------------",
                "H# E   #             #     #",
                "H #####               ##### ",
                "H # ###               #$### ",
                "H ##### E    E      E ##### ",
                "H ### #X################# # ",
                "H #####X### $## $########H# ",
                "H #####X#################H# ",
                "H #####X#################H# ",
                "H #####X####    #########H# ",
                "H #####X####    #########H# ",
                "H #####X####   $H########H# ",
                "H           ####H--------H  ",
                "H          ====             ",
                "H      P  ====      E       ",
            ]
        },
        {
            name: "10",
            map: [
                "          $              S  ",
                "        H#######  $      S  ",
                "    $   H      ######    S  ",
                "##########H         $    S  ",
                "          H######S#####H##  ",
                "E         H      S     H    ",
                "##########H      S E   H   $",
                "##########H#######==   H####",
                "##########H            H    ",
                "##########H       $ ---H    ",
                "##      ##H       ##   H    ",
                "##  $$  ##H     $      H    ",
                "###########H#######H   H    ",
                "           H       ########H",
                "    $    P H               H",
                "############################",
            ]
        },
        {
            name: "11",
            map: [
                "       H                    ",
                " E$    H                 $E ",
                "H##E$  H               $E##H",
                "H  ##  H####SH#####H   ##  H",
                "H           HH$    H       H",
                "H           $HH    H       H",
                "H           HH$            H",
                "H           $HH            H",
                "H           HH$            H",
                "H           $HH            H",
                "H           HH$            H",
                "H           $HH            H",
                "H           HH$            H",
                "H           $HH            H",
                "H       P   HH$            H",
                "H    H################H    H",
            ]
        },
        {
            name: "12",
            map: [
                "      $     $           H   ",
                "H#################H     H   ",
                "H             $   H-----H  $",
                "#########H#########     H###",
                "########HH              H   ",
                "#######HH-------H       H   ",
                "#$ $##HH      E H  $  E H  $",
                "#####HH     H####===####H###",
                "     H      H           H   ",
                "     H      H           H   ",
                "    EH   $  H-----------H  $",
                "H###########H  $     $  H###",
                "H           H ######### H   ",
                "H           H           H   ",
                "H      $    H    P $    H   ",
                "############################",
            ]
        },
        {
            name: "13",
            map: [
                "            E          E    ",
                "XHXHXHXHXHXHXHXHXHXHXHXHXHXS",
                "XHXHXHXHXHXHXHXHXHXHXHXHXHXS",
                "$H#H H#H$H#H H#H$H#H H#H$H#S",
                "XH#HXH#HXH#HXH#HXH#HXH#HXH#S",
                "XH#HXH#HXH#HXH#HXH#HXH#HXH#S",
                "XH#HXH#HXH#HXH#HXH#HXH#HXH#S",
                " H#H$H#H H#H$H#H H#H$H#H H#S",
                "XH#HXH#HXH#HXH#HXH#HXH#HXH#S",
                "XH#HXH#HXH#HXH#HXH#HXH#HXH#S",
                "$H H H H H H H H H H H H H#S",
                "H##########################S",
                "H         $ E $   $ E      S",
                "H==========================S",
                "H$       P                $S",
                "############################",
            ]
        },
        {
            name: "14",
            map: [
                "  H   E    -   E-H    H-   $",
                " -H   -H-   -  - H-   H -  H",
                "- H  - H -    -  H -  H  - H",
                "$ H -  H  -  -   H  -$H   -H",
                "  H-  -H   --    H$  -H    H",
                "H-   - H-  --  - H------ -  ",
                "H -   -H  -$ -   H  -   H - ",
                "H- -   H$--H  -  H     -H  -",
                "H - -  H-- H   - H    - H  -",
                "H- $ -EH-  H -  -H-  -  H  -",
                "H -H  -    H   -   -    H  -",
                "H- H   -   H  - -   -   H  -",
                "H -H -  -  H$-   -   -  H $-",
                "H- H   - - H- -  $-   - H - ",
                "H -H  -   -H     - - - -H-  ",
                "   H     $     $P       H   ",
            ]
        },
        {
            name: "15",
            map: [
                "S                          S",
                "S     $ E  $     $  E $    S",
                "SSSS########H   H########SSS",
                "            H   H           ",
                "       H#############H      ",
                "$  E  $H     $ $     H$ E  $",
                "#######H $ $#####$ $ H######",
                "       H ####   #### H      ",
                "    $  H      $      H $    ",
                "  H######################H  ",
                "  H           P          H  ",
                "  H $    $H#######H$   $ H  ",
                "##########H       H#########",
                "          H       H         ",
                "  $       H       H      $  ",
                "#=#=#=#=#=#=#=#=#=#=#=#=#=#=",
            ]
        },
        {
            name: "16",
            map: [
                "                         S  ",
                "                    P     S ",
                "   X####HH######HHHHH      S",
                "         H   #  H         S ",
                "    $     H H#  H        S  ",
                "    #$     HH#  H       S   ",
                "   ###$     H#  H      S    ",
                "  #####$    H#  H     S     ",
                "########    H#  H      S    ",
                " $#####     H#  H       S   ",
                "   ###      H#  H        S  ",
                "    #       H#  H         S ",
                "       E    H#  H   E      S",
                " H##############X######### S",
                " ###############         H#S",
                "################   $$$$$$H##",
            ]
        },
        {
            name: "17",
            map: [
                "S                          S",
                "S                          S",
                "S         E                S",
                "H###X######################H",
                "H###X######################H",
                "H   $   ##--------##       H",
                "H       $#H    E $##    E  H",
                "H  ###  ##H ########  #####H",
                "H  #$#  ##H       ##  ##$##H",
                "H   P   ##H       ##  #####H",
                "H  ###  ########HH##  ##$##H",
                "H  ###  ########HH##  #####H",
                "H  ###  ##      H ##       H",
                "H  ###  ##     $H ##    $  H",
                "##########H#########H#######",
                "#######  $H###### $ H#######",
            ]
        },
        {
            name: "18",
            map: [
                "   S                        ",
                "   S      $         $      $",
                "HX#H    H###H     H###H#  #H",
                "H  ######   H#####H   H  $ H",
                "H$ E        H     H   #### H",
                "HX####         ###H#       H",
                "H =####       ##        H# H",
                "H =#####     ##       H#H  H",
                "H =###########    $   H   ##",
                "H =###########   ###  H     ",
                "H =    ### ###        H   E$",
                "H =  $ ## $ ##     E  H   ##",
                "H =H###########H######H   ##",
                "H  H           H      H   ##",
                "H  H       P          H   ##",
                "############################",
            ]
        },
        {
            name: "19",
            map: [
                "            H##H            ",
                "          E$H##H$E          ",
                "          H######H          ",
                "         $H######H$         ",
                "        H##########H        ",
                "      E$H##########H$E      ",
                "      H##############H      ",
                "     $H   $$$$$$$$   H$     ",
                "    H##################H    ",
                "   $H##################H$   ",
                "  H######################H  ",
                "  H######################H  ",
                "  H                      H  ",
                "  H                      H  ",
                "  H          P           H  ",
                "############################",
            ]
        },
        {
            name: "20",
            map: [
                "             E$             ",
                "           ########H   E $  ",
                "       E $         H#H#####H",
                "     $#####H       H H     H",
                "###X###    H-------H H$    H",
                "           H       H #######",
                " $         H       H        ",
                "###H#######H       H--------",
                "$  H   E   H    $  H       $",
                "#########  ########H    ####",
                "       $   $       H        ",
                "#####H###X###H  $  H   $    ",
                "     H       ##############H",
                "     H                     H",
                "     H $   P      $        H",
                "############################",
            ]
        },
        {
            name: "21",
            map: [
                "==========================S#",
                "H----------------------HSSS#",
                "H  H     ##  E   $     HS$ #",
                "H  H #####################H#",
                "H  H ###            $     H#",
                "H  H   # ###################",
                "H  H  H#   $  # $ # $ # $  #",
                "H  H  H##H##################",
                "H  H--H  H##### #####      #",
                "H  H  H  H    # $#     E   #",
                "H  H  H  H--H ####H--#######",
                "H  H  H  H  H     H  #######",
                "H  H  H  H  H--H  H  #######",
                "H  H  H  H  H  H #H### $$$ #",
                "H  HP H  H EH  H  H###H#####",
                "##################H $$H#####",
            ]
        },
        {
            name: "22",
            map: [
                "       $    $               ",
                "$$################H         ",
                "##          $  $  H         ",
                "         H########H  $   $  ",
                "         H        H######## ",
                "    $ E$ H                  ",
                "   H######H------     $     ",
                "   H      H      H#########H",
                " $ H      H      H         H",
                "###H    E H  E $ H       $ H",
                "      H###H######H    H#####",
                "      H--------    $  H     ",
                "    $ H$       H######H   $ ",
                "#######H       H      H#####",
                "       H       H            ",
                "       H  $  P H      $     ",
            ]
        },
        {
            name: "23",
            map: [
                "   =========           S    ",
                "  =         =          S == ",
                " =   $$ E    #H        S == ",
                "==##H########==H    E  S$== ",
                "=###H###########H##===#H====",
                "=##HHH#-------#HHH#----H---H",
                "=##H H#  $    #H H# $    $ H",
                "=##H H#  P    #H H#        H",
                "=##H$H####H####H$H#=      =H",
                "=#########H################H",
                "=      ##HHH##  $    $   $ H",
                "=------#HH HH--------------H",
                "= $    #H   H            E H",
                "=       H   H  ########### H",
                "====    H   H ### $##  $ ##H",
                "=######=H$ $H  #############",
            ]
        },
        {
            name: "24",
            map: [
                "                S           ",
                "               SS           ",
                "              SS            ",
                "             SS             ",
                "            SS              ",
                "            S               ",
                "          H##H              ",
                "          H##H$             ",
                "       H#######H  E         ",
                " #H  E H# $ $ #H #H#H       ",
                "  ###H############H###H     ",
                "   ## $  #### $   H$  ##H   ",
                "    ####H  $ ###H H##H #H   ",
                "     #$#H###H $ H H$#H$#H   ",
                "  E   ##################H P ",
                "============================",
            ]
        },
        {
            name: "25",
            map: [
                "    =     =     =         S=",
                "    =     =     =   $     S=",
                "    =X####=     =####  ###S=",
                "###         ###HE  $     $S=",
                "###########H   H######## #H=",
                "       P   H ##H#   $    #H=",
                "#H#########H $#H# #####H #H=",
                "#--------##H ##H# #    H #H=",
                "#  #  # $##H   HH # ###H #H=",
                "#  #  #  #HH####H##$###H #H=",
                "#  # $#  #H#      # ###H  H=",
                "#  ####  #H# #### #    H#HH=",
                "#H##  ##HHH# #$## #######H =",
                "#H   ==#HH##   #  ##$    H#=",
                "#H   =   H##X####X#######H#=",
                "#H###    H     E         H =",
            ]
        },
        {
            name: "26",
            map: [
                "                          S ",
                "     E                    S ",
                "H##########H  E  $     $  S ",
                "H          H#####H   ###H###",
                "H $      $ H    =H      H   ",
                "H #  ### # H $$ =H    E H   ",
                "H # ###  # H == =#########==",
                "H #  ### # H ==           =$",
                "H # ###  # H =-------  $  =H",
                "H #$ ### # H =$      ####H=H",
                "H #####  # H ==          H H",
                "H ######## H ==    $     H##",
                "H          H == ######   H  ",
                "H========#=====          H  ",
                "H             P          H  ",
                "############################",
            ]
        },
        {
            name: "27",
            map: [
                "S                          S",
                "S      P            E      S",
                "S   =#H#=----------=#H#=   S",
                "S   =$H = $      $ = H =   S",
                "S =## H ##=      =## H$##= S",
                "SS=$  H  $= $   $= $ H #$=SS",
                "=S### H   ##=  =#####H # #S=",
                "=     H     = $=$    H #  $=",
                "=     H#####=H#=##  $H ## #=",
                "= $ E H   E  H     ##H     =",
                "=H####H   =##H###=   H   #H=",
                " H= $ H   #  H $ #   H  E=H ",
                " H=## H ###  H   ### H ##=H ",
                " H $= H =    H    $= H =$ H ",
                " H   ###     H      ###   H ",
                "############################",
            ]
        },
        {
            name: "28",
            map: [
                "             S              ",
                "-----------  S              ",
                "  $    $ =H  S $            ",
                "#########=======H  $H=H     ",
                "#=#=#=#=====   =======H     ",
                "          ==  $      =H E$  ",
                "--------H ==#####H   ==####H",
                "        H ==     HE    ####H",
                "        H == ########H ####H",
                " $    $ H == #      #H ####H",
                "###E  # H == #   $  #H ##$#H",
                "####### H == ########H ## #H",
                "        H    #  $   #H    #H",
                "############## H##H #######H",
                "          P    H $H        H",
                "############################",
            ]
        },
        {
            name: "29",
            map: [
                "  E -- -             E      ",
                "####  H   -         ##H     ",
                "####  H ## -   E   -##H     ",
                "#$$#  H ##- #######  -H     ",
                "####  H     ####### H H###  ",
                "      H---  ####### H  #$#  ",
                "    -     H ####### H  ###  ",
                "     #### H ##$$$## H       ",
                "   - #### H ####### H       ",
                "###- #$$# H-     - -H       ",
                "#$#  #### H -   - H  ####   ",
                "###       H   P   H  ####   ",
                "          H  ###  H  #$$#   ",
                "   ##     H  #$#  H  ####   ",
                "   ##     H  #X#  H         ",
                "          H       H         ",
            ]
        },
        {
            name: "30",
            map: [
                "=                          S",
                "=     $$$$E E E      P     S",
                "=##########X###############H",
                "                           H",
                "    = $  $       $      $= H",
                "    =#######X#######X####= H",
                "                           H",
                "      =  $    $     $  =   H",
                "      =###X######X#####=   H",
                "                           H",
                "       =  $     $    $=    H",
                "      ==##############=    H",
                "                           H",
                "                           H",
                "$$$$   E          E     H= H",
                "##########======#######=== H",
            ]
        },
        {
            name: "31",
            map: [
                "             S              ",
                "             S              ",
                "$            SS            $",
                "#H H----------S---------H H#",
                "##HH E                $ HH##",
                "###H H------ ---------H H###",
                "####HH $              HH####",
                "####XH H------ -----HEHX####",
                "####X#HH          $ HH#X####",
                "####X##H H--- ----H H##X####",
                "####X###HH $      HH###X####",
                "####X####H H-- -H H####X####",
                "####X#####HH    HH#####X####",
                "####X######H    H######X####",
                "####X#######HP$H#######X####",
                "####E       H##H        ####",
            ]
        },
        {
            name: "32",
            map: [
                "                            ",
                "###S####         ------ E   ",
                "   S --  E            =====H",
                "   H#  #####H######---   # H",
                "H####  #$---H-----#   ####H#",
                "H      ####   ###H#   #$  H ",
                "H      #----H----H#   #-  H ",
                "H P#   #H$#$H$#H$H#   #   H$",
                "#H##   ############   ##H###",
                " H    $#     $    #     H   ",
                " H    ##   ###H   #     H   ",
                " H  $# #      H   #$  H#####",
                " H  #  #   $  H   ##  H     ",
                " H$#   # H######H # #$H     ",
                " H#  $ # H#  $ #H    #H     ",
                "############################",
            ]
        },
        {
            name: "33",
            map: [
                "#####S################# ####",
                "    #S# -------            #",
                "S##S S# #$   #H#         E #",
                "S ##### ######H#####$ #H####",
                "#S    $---####H########H# ##",
                "#######   #  #H### ####H# ##",
                "       E     #H### ## #H#$ #",
                "H#######H#H$ #H### ## #H####",
                "H       H#####H###$ # #H## #",
                "H         ####H###### #H##$#",
                "H       #     H        H   #",
                "H###H####H#=#=#=#=#=#=#H#=#=",
                "H###H####H######  #####H#=#=",
                "H   H    H#######  ####H    ",
                "H########H########$ #######H",
                "HP       H $ ######  E     H",
            ]
        },
        {
            name: "34",
            map: [
                " --------$$######$$-------- ",
                "H       $###HHHH###$       H",
                "H      $##HHHEEHHH##$      H",
                "H      ##HH      HH##      H",
                "H     $#HH        HH#$     H",
                "H     ##H$        $H##     H",
                "H     #HH$        $HH#     H",
                "H     #H$$        $$H#     H",
                "H     #HH$        $HH#     H",
                "H     ##H$        $H##     H",
                "H      #HH$      $HH#      H",
                "H      #XHH$$  $$HHX#      H",
                "H       X#HHH$$HHH#X       H",
                "H        ###HHHH###        H",
                "HP      E  ######  E       H",
                "#########H        H#########",
            ]
        },
        {
            name: "35",
            map: [
                "S            ##            S",
                "S            ==            S",
                "S $       $  ##  $       $ S",
                "=#=#=#=#=#=#H==H#=#=#=#=#=#=",
                "   $     $  H##H  $     $   ",
                "H=#=#=#=#=#=#==#=#=#=#=#=#=H",
                "H   $   $    ##    $   $   H",
                "=#=#=#=#=#=#H==H#=#=#=#=#=#=",
                "    $E E$   H##H   $E E$    ",
                "H=#=#=#=#=#=#==#=#=#=#=#=#=H",
                "H  $     $   ##   $     $  H",
                "=#=#=#=#=#=#H==H#=#=#=#=#=#=",
                "  $       $ H##H $       $  ",
                "H=#=#=#=#=#=#==#=#=#=#=#=#=H",
                "H            P             H",
                "#=#=#=#=#=#=#=#=#=#=#=#=#=#=",
            ]
        },
        {
            name: "36",
            map: [
                "    $    $     $       E$   ",
                "H######H### #####H### #####H",
                "H      H         H         H",
                " H      H  -    H         H ",
                "H      H  - -    H         H",
                " H      H-   -  H --------H ",
                "H------H      -  H         H",
                "    E   H-     -H         H ",
                "###### H  -   -  H    E$ $ H",
                "## ###  H  - -  H    -###===",
                " $   $ H    -    H   -###===",
                "##X###  H  - -  H    -###===",
                "##X# # H  -   -  H   -##$$==",
                "  $ $   H-     -H    -======",
                "###### H    $ P  H $  ======",
                "############################",
            ]
        },
        {
            name: "37",
            map: [
                "S                           ",
                "S      E                    ",
                "S##########======#====#====H",
                "$                     H    H",
                "##         =   $    $---$  H",
                "#####HH#HH########  #   #  H",
                "    #HH HH# ==####     E   H",
                "    #HH$HH# = #### ###H####H",
                "    ####### =$###     H    H",
                "                      H    H",
                "       P       #H#####H====H",
                "##H########H### H $$  H    H",
                "  H        H    H ==     ##H",
                "  H##$#    H  ### ==###### H",
                "  H####   EH   $  ==       H",
                "##################==####====",
            ]
        },
        {
            name: "38",
            map: [
                "S                          S",
                "S                          S",
                "######H####HE EH####H#######",
                " -    H    H=H=H    H     - ",
                "H #####      H   $  ###### H",
                "H #####  #HHHHHHH#  ###### H",
                "H ###$#  #H=====H#  ##$### H",
                "H #####  #HHHHHHH#  ###### H",
                "H         -------          H",
                "H E   H      =      H    E H",
                "H=====H    $===$    H======H",
                "H     H    =====    H      H",
                "H#####H   =======   H######H",
                "H     H $=========$ H      H",
                "H=====H =========== H======H",
                "$     H=============H  P   $",
            ]
        },
        {
            name: "39",
            map: [
                "###  S ##    ##    ## S  ###",
                "#### S#### E#### E####S ####",
                "H  ##H#  ##H#  #H##  #H##  H",
                "H   #H--H #H   $H# H--H#   H",
                "H E####$H####HH####H$#### PH",
                "H###  ##H#  #H##  #H##  ###H",
                "H##    #H$   H#   $H#    ##H",
                "H###  ####HH####HH####  ###H",
                "H  ##H#  ##H#  #H##  #H##  H",
                "H   #H    #H   $H#    H#   H",
                "H  ####HH####HH####HH####  H",
                "H###  ##H#  #H##  #H##  ###H",
                "H##    #H    H#    H#    ##H",
                "H###  ####HH####HH####  ###H",
                "H    $    HH $  HH    $    H",
                "H##########################H",
            ]
        },
        {
            name: "40",
            map: [
                "S          #################",
                "S          ########= ------#",
                "S    $   H#    $   =H # $  #",
                "#########H=####### =H ######",
                "    $    H=    $   =H ######",
                "H#########= ##X### =H ######",
                "H    E$   =      $ =H   E   ",
                "#########H= ##XXX# ########H",
                " $       H=    $           H",
                "H#########= ##X###         H",
                "H  $      =      $         H",
                "#########H= ##XXX#  #####  H",
                "        $H=      $  #  $#  H",
                "H#########= ##X###    H##  H",
                "H   E       P         H# $ H",
                "############################",
            ]
        },
        {
            name: "41",
            map: [
                "    --$ --------E----- -----",
                "   H $#$        H- # -H  $$$",
                "$PH $# #$      H- ### -H  $$",
                "## $#   #$    H- #   # -H  $",
                " E X  #  #   H- ##   ## -H E",
                "H##  ###  ===-   #$$$#   -#H",
                "H   #   #   $   HH###      H",
                "H  - ###   $H  H##H#       H",
                "H   - #   $H   H$$H -------H",
                "H    -   $H   H====H       H",
                "===H  ---H    H$  $H ------H",
                "   H         H######H      H",
                "###H###H     H$    $H -----H",
                "       H    H========H     H",
                "       H  E H$   E  $H ----H",
                "########=====########H     H",
            ]
        },
        {
            name: "42",
            map: [
                "  $       $          $    $ ",
                "H###    H###    H##########H",
                "H $   $ H     $ H $    $   H",
                "H###H###H   #####=##=####=##",
                "H   H  EH   --------------- ",
                "####H######H      $   $E   H",
                "    H      H =####======###H",
                "    H===== H =      $  $   H",
                "#   H  $ = H =   ========= H",
                "#$$===###= H =   =  $ $  = H",
                "###===###= H = $ = H####H= H",
                "  $  $     H ==X== H    H= H",
                "#########  H =     H   EH= H",
                "  $ $   =  H =########==== H",
                "######H ====####=   $  $  PH",
                "####$#H           H#########",
            ]
        },
        {
            name: "43",
            map: [
                "                            ",
                "  S                       S ",
                "  H#######################H ",
                "  H H##   $   $ E $   ##H H ",
                "  H###H###############H###H ",
                "  H H H ### $   $E##H H H H ",
                "  ##H###H H#######H H###H## ",
                "  H H H H H H###H H H H H H ",
                "  H###H###H H $ H H###H###H ",
                "$ H H H H HEH===HEH H H H H$",
                "####H###H$H=H===H=H$H###H###",
                "##H H H H=H=H===H=H=H H H H#",
                "##H## H=H=H=H===H=H=H=H ##H#",
                "##H H=H=H=H=H===H=H=H=H=H H#",
                "##H=H H H H H  PH H H H H=H#",
                "############H#$#H###########",
            ]
        },
        {
            name: "44",
            map: [
                "###########################S",
                "#   HHHHHHHHHHHHHHHHHHH   #S",
                "# P H HHH    H   HH   H E #S",
                "####H HHH HH H HH H HHH####S",
                "#   H HHH HH H HH H   H   #S",
                "# E H HHH HH H HH H HHH E #S",
                "####H   H    H   HH   H####S",
                "HHHHHHHHHHHHHHHHHHHHHHHHHHHS",
                "H $ H $ H $  H  $ H $ H $ HS",
                "HHHHHHHHHHHHHHHHHHHHHHHHHHHS",
                "H   H H H HH H HH H   H   HS",
                "H H H H H  H H  H H HHH H HS",
                "H  HH H H H  H H  H   H  HHS",
                "H H H H H HH H HH H HHH H HS",
                "H H H   H HH H HH H   H H HS",
                "HHHHHHHHHHHHHHHHHHHHHHHHHHHS",
            ]
        },
        {
            name: "45",
            map: [
                "===============  S =========",
                "  EH      H---   S H      $ ",
                "===S##=====#X#===S H==== H=#",
                "=--H       H----H  H   #####",
                "=  H       $ #$#HE H  $   ##",
                "$ XH       H    =#H ==####=#",
                "=#XH-------H-----=H-------H=",
                "#$ =       H   $H===      H#",
                "==X#    $$$H    H=----  $ HH",
                "=          H    H=H $   X#=H",
                "###X##     H P  H=H        H",
                "#H---- H=###=##X==H        H",
                "#H$   #H        H#H  =#### H",
                "#H=--###H       H=H  # $ = H",
                "#H  ###=#H  E   H H   #==#==",
                "=#####====##############=###",
            ]
        },
        {
            name: "46",
            map: [
                " $                   S      ",
                "####H            E   S      ",
                "  $ H          H######H   $ ",
                "########H######H     #######",
                "        H      H $        $ ",
                "     $  H      H############",
                "#H######H   $  H            ",
                " H   $  H======H      $     ",
                "#H######H      #####H######H",
                "        H E    $    H      H",
                " $      H###H#######========",
                "###H#####   H  $      $ E   ",
                "   H       H########H#######",
                "   H-------H        H       ",
                "   H         P      H     $ ",
                "#######################S####",
            ]
        },
        {
            name: "47",
            map: [
                "=               ===========S",
                "=E        E     =  $ =     S",
                "==------#####H P= H= =H=###S",
                "=#####   $  ###== H= =H=###S",
                "=    ######       H= =H=   S",
                "###H      ####H $ H= =H= $ S",
                "# ###=#H      H###== =H=###S",
                "#  $  ##=#H   H    = =H=###S",
                "#####    ###=#H    = =H=   S",
                "# $ #=H#     ##=##H= =H=$$ S",
                "###   H##==#  $  =H= =H=###S",
                "# #=##H    ###==#=H= =H=###S",
                "#   ###=##H  $   =H= =H= ##S",
                "# H##   $###==#H#=H= =H=  #S",
                "# H#           H $H=  H   $S",
                "#$H#=####=#####=##==##=#####",
            ]
        },
        {
            name: "48",
            map: [
                "            $               ",
                " ------- ####HP             ",
                "H          $ H    $      $  ",
                "H        H==== #######H#####",
                "H        H $          H     ",
                "H######H ####H        H     ",
                "H      H   $ HEH###########H",
                "H      H H==== H===========H",
                "H    $H# H$    H=     $   =H",
                "H    H#  ####H H=H=======H=H",
                "H  $H#      $H H=H=   $  H=H",
                "H  H#    H==== H=H=========H",
                "H H#     H $   H=H    $    H",
                "HH#      ####H H============",
                "HH  E        S H    E       ",
                "############################",
            ]
        },
        {
            name: "49",
            map: [
                "     -     - -      -  $  $ ",
                "-   - -   - H -    - H######",
                " - -   - -  H  -  -  H      ",
                "  -     -   H   --   H  E   ",
                " $   $  $   H   -    H=====H",
                "=======X======H-     H= $ =H",
                "              =      H=H=$=H",
                "             $=  P $ H=H=$=H",
                "H##########H#==H####-H=H=$=H",
                "H     E    H##HH     H=H=$=H",
                "H    ##    H##H   $E  =H=$=H",
                "H ###  ### H##==#####H=H----",
                "H ###  ### H##       H      ",
                "H ###$$### H#     --$H #### ",
                "H $ $##$ $ H##  H#  #H##$$##",
                "############################",
            ]
        },
        {
            name: "50",
            map: [
                "H   -                  H----",
                "H    H                 H =  ",
                "H    H             E   H =$$",
                "H $  H####  $  $H#####X#H###",
                "H##  H   #########      HH#X",
                "H    H                   HHX",
                "H     H-------------------HH",
                "H     H                    H",
                "H     H $       E   $     $H",
                "H     #####H==========##X###",
                "H---       H          ---   ",
                "   E$      H         H      ",
                "#########H H   $     H-   $ ",
                "        #####H===H#### #$###",
                "$       P    H   H   E #####",
                "#############H   H##########",
            ]
        },
        {
            name: "51",
            map: [
                "#=#==#             S=#==###=",
                "##==##             S#==###==",
                "   =#=#  $      $  S#=     =",
                "H#   =##=###=H##=  S#= #=H =",
                "H#=  =#==###=H ## $S=  #=H =",
                "H##     =##==H  #=### $#=H =",
                "H=##$    #==#H        ##=H$ ",
                "H#=####   =##H  -------#==#H",
                "H ==#=##$  #=H $       #=  H",
                "H     H##   ==#==#=    #=  H",
                "=###==H=##            $#=  H",
                "#=#===H#=##$   E    $###=  H",
                "   $  H==###X======X###==H##",
                "H#=###==   E         P   H=#",
                "H=###=  H##==#==##=#==##===#",
                "H   $   H            E   =#=",
            ]
        },
        {
            name: "52",
            map: [
                "         H                  ",
                "         H      $    E      ",
                "----  $  S     ============H",
                "H  =======                 H",
                "H         -----  ----- H====",
                "H---------        H    H    ",
                "    E          $  H#   H    ",
                "H==================#   ====H",
                "H                         HH",
                "H      $      $     E  =  H ",
                "====##====H #==#========  H ",
                "          H               H ",
                "       $  H      $        H ",
                "H========== ========      H ",
                "H                   ------H ",
                "H          P        E       ",
            ]
        },
        {
            name: "53",
            map: [
                "                            ",
                "         E     E        $ $S",
                "      H##############  H####",
                "      H ############  H#####",
                "H######  #$##$##$##  H######",
                "H#######           EH#######",
                "H#############X#########    ",
                "H########$ $    $ $##### $$ ",
                "H#########X###X#############",
                "H       E          $######  ",
                "H  H#####H#####H  -H####  $H",
                "H  H  H  H  H  H   ###  $H##",
                "H  H$$H$$H$$H$$H   #  $H####",
                "H  H#####H#####H    $H######",
                "H              P   H########",
                "H###########################",
            ]
        },
        {
            name: "54",
            map: [
                "S              #############",
                "S  $     $     #############",
                "##############H  $          ",
                "###########################H",
                "     $ E   E $             H",
                "H###########################",
                "H        $          $       ",
                "###########################H",
                "    $        $      $      H",
                "H###########################",
                "H   $  E E  E     $         ",
                "###########################H",
                "   $      $      $      $  H",
                "H###########################",
                "H     $           $  P      ",
                "############################",
            ]
        },
        {
            name: "55",
            map: [
                "############S ##############",
                "#---------# S  #---------#  ",
                " #$  H  $#  S   #$  H  $#   ",
                "  #$ H $#   S    #$ H $#    ",
                "   #$H$#    S     #$H$#     ",
                "    #H#     S=====##H#      ",
                " P  #H#     S=   $ #H#  E   ",
                "###H#H######X#######H######H",
                "   H H E            H      H",
                "H##=#H##############H#=#####",
                "H---#H#------------#H#      ",
                "H $# H #$        $# H #     ",
                "H$# $H$ #$      $#  H  #    ",
                "H# $#H#$ #$  H###   H   # $ ",
                "H $##H$#HH#=H#=#  E H  $ ###",
                "#########H  H $#############",
            ]
        },
        {
            name: "56",
            map: [
                "$$$----$$$ $$$-----------$$$",
                "###    ###H###           ###",
                "###    ###H###           ###",
                "###    ###H###    $$$    ###",
                "###    ###H###    ###    ###",
                "###    ###H###    ###    ###",
                "###    ###H###    ###    ###",
                "###    ###H###    ###    ###",
                "###    ###H###    ###    ###",
                "###$--$###H###$--$###$--$###",
                "####$$####H####$$#####$$####",
                "##########H#################",
                " ######## H ####### ####### ",
                "  ######  H  #####   #####  ",
                "   E     PH          E      ",
                "############################",
            ]
        },
        {
            name: "57",
            map: [
                "#S##########################",
                "#S------------------------ #",
                "#S#===#===#===#==#=H#=---#H#",
                "#S#    $    $   $  H   $H#H#",
                "#S$H====================H=H#",
                "#S#H#----------------= $H#H#",
                "#S$H# ================####H#",
                "#S#H# = $$$$$$$$$$$$   $#$H#",
                "#S$H# =###======#=====H###H#",
                "#S#H#     E           H$#$H#",
                "#S$H#===========##====H# =H#",
                "#S#H------------------  H#H#",
                "#S#==##==H==#=#==H======H$H#",
                "#S E     H ==    H  E  $H#H#",
                "#===#=###====H==#=#==##==#H#",
                " P           H            H#",
            ]
        },
        {
            name: "58",
            map: [
                "#####################     S#",
                "# P##--- ==   $           S#",
                "# #=  $ H==######HH H#H H S#",
                "# #     H    ==# HH$H H H S#",
                "# #H####=##$   # HH H H#H S#",
                "# #H#      =##   HH H H H S#",
                "#$ H#   $  #=# H# H H H H S#",
                "##HH##X#=###=# H#$#S##H#H S#",
                "##H      E     H#X#S# H H S#",
                "##H##=#######=HHH #S# H H S#",
                "##H #=#######=HH  #S# H HEH#",
                "# H  =  $    =H   #S#HH###H#",
                "# HH#=#######=H $ #S#HE   H#",
                "# #H#=#######=H===#S####  H#",
                "# #H#     $  ==#   S   #  H#",
                "# $H #=========# E S   #####",
            ]
        },
        {
            name: "59",
            map: [
                "   -- $         -$    $     ",
                "  H  ##        H ##   ##H   ",
                "  H        $E  H        H  $",
                " $H--      ## $H  E$    HH##",
                "##H  H$E     ##H  ##   $ H  ",
                "   $ H##       H      ## H  ",
                "  ## H- --E$---H         H  ",
                "  $    H  ##    $   $-   H$ ",
                " ##    H       ##  ## H$H## ",
                "    - $H  $           H##   ",
                "   H ##H  ##   $      H     ",
                " $ H     $    ## $    H$    ",
                "H##H    ##       ##   H##   ",
                "H                           ",
                "H             P             ",
                "############################",
            ]
        },
        {
            name: "60",
            map: [
                "               -----        ",
                "          ----H     E$  $   ",
                "     ----H      E $ #######H",
                " ---H         $ #####  $  #H",
                "H         P$ ####   $E#X#H#H",
                "H  X#X ## ####  $ #X### #H#H",
                "H  $ $ $  #  $ ##X#  $  #H#H",
                "H ## X#X  # ####   $###H#H#H",
                "H  $ $ $  # #  $ #X#X #H#H#H",
                "H  ### X# # # ##X#  $ #H#H#H",
                "H  $ $ $  # # #  $ ##H#H#H#H",
                "H #X X##  # # # #####H#H#H#H",
                "H  $ $ $  # # # #   #H#H#H#H",
                "H  ##X X# # # # # $ #H#H#H#H",
                "H        E# # # #####H#H#H#H",
                "###########          H H H H",
            ]
        },
        {
            name: "61",
            map: [
                "          S                 ",
                "          S                 ",
                " $ E $   =H=   -------- P   ",
                "H=###==# =H$          ####  ",
                "H=       =H=    $          $",
                "H=----   =H=  ####---      H",
                "H=      $=H=  $         $  H",
                "H  $=###==H=###      H#### H",
                "H=#==    =H=      E$ H#    H",
                "H=-------$H=   ########    H",
                "H=    $  =H=   $        $  H",
                "H=   =###=H=--####--  H##  H",
                "H=$      =H=        $ H    H",
                "H=##     =H=      #####    H",
                "H     E   H                H",
                "=###=####====###=####==##===",
            ]
        },
        {
            name: "62",
            map: [
                "##S####S#####S#####S#####S##",
                "# S$E  S     S   $ S $   S #",
                "#H########X####X##########H#",
                "#H#$       E$        $   #H#",
                "#H#####X########X#######H#H#",
                "#H#  $          $      #H#H#",
                "#H#H####X####X#####X##H#H#H#",
                "#H#H#                #H#H#H#",
                "#H#H#H#$     E     $ #H#H#H#",
                "#H#H#H###X##X###X#####H#H#H#",
                "#H#H#H   $        $   H#H#H#",
                "#H#H###X############X###H#H#",
                "#H#H   $         $      H#H#",
                "#H###X####X####X######X###H#",
                "#H   E   $    P     $  E  H#",
                "############################",
            ]
        },
        {
            name: "63",
            map: [
                "                  E         ",
                "###########################S",
                "$ E     #       $  # $     S",
                "###H# #H#H######## #H# ##H##",
                "###H#H#H#H#  $   # #H# ##H##",
                "###H#H# #H# #### # #H#   H H",
                "#$#H#H#H#H#H#P # # #H# ####H",
                "#  H#H#H#H#H## # # #H# #H  H",
                " H#H#H#H#H#H  $# # #H# #H###",
                "H### H#H#H###### # #H# #H  H",
                "H## #H#H#H $     # #H -####H",
                "H  -#H#H########## #H# #H  H",
                "H## #H#H           #H# #H###",
                "--# #H##############H# #H  H",
                "     H      E       H# ####H",
                "###################### E   H",
            ]
        },
        {
            name: "64",
            map: [
                "=S                        S=",
                "=S  E$$$$$$$$ $$$$$$$$$E  S=",
                "=============S==============",
                "      $ $    S     $  $     ",
                "    =H====   S   =H=====    ",
                "     H$ $    S    H$  $     ",
                "   ======H=  S  =======H=   ",
                "      $ $H   S     $  $H    ",
                "  =H======== S =H=========  ",
                "   H  $ $    S  H  $  $     ",
                " ==========H=S===========H= ",
                "      $  $ H S    $   $  H  ",
                " =H==========S============= ",
                "  H                         ",
                "  H   $  $      P $   $    E",
                "############################",
            ]
        },
        {
            name: "65",
            map: [
                "                   #######  ",
                "----------$      ES ######  ",
                "H        H#H----   S ######H",
                "H       HX#XH $H$   S ##  #H",
                "H-------HX#XH ###H   S #$ #H",
                "H       HX#XHE###H    S ###H",
                "HE      HHHHH ###H     S ##H",
                "#-----  =XHX= ###H      S #H",
                "##$  H  =XHX=    H       SSH",
                "###$ H  =XHX= H--H---------H",
                "####$H  =XHX= H             ",
                "#####HE =XHX= H------H##$###",
                "     H  =XHX= H     H=######",
                "     H  =XHX= H    H=#######",
                "     H   PH   H    H=#######",
                "############################",
            ]
        },
        {
            name: "66",
            map: [
                "#######HH----------HH#######",
                "######HH   -    -   HH######",
                "#####HH     #EE#     HH#####",
                "####HH    - #### -    HH####",
                "###HH    - ###### -    HH###",
                "##HH----- ######## -----HH##",
                "#HH    - ####$$#### -    HH#",
                "HH      ############      HH",
                "#HH    - ####$$#### -    HH#",
                "##HH    - ######## -    HH##",
                "###HH    - ###### -    HH###",
                "####HH    - #### -    HH####",
                "#####HH    -    -    HH#####",
                "######HH            HH######",
                "#######HHE   P    EHH#######",
                "############################",
            ]
        },
        {
            name: "67",
            map: [
                "S                           ",
                "S    #   E #       E   E    ",
                "S------$H#H ##H##SS#SS##H   ",
                "H      #H #H# H# $# $#  H   ",
                "H P     #  # H# H#  #   H   ",
                "#####    ## H#  #  #    H   ",
                "    #   $# H# $#  # --- H   ",
                "   #    # HHH #    #  #####H",
                " $#   $#  #HH#  ##  X      H",
                "##    # $# H#  #  #  #     H",
                "#   $#  # H#  #    #  #$   H",
                "    # $# H# $#  H#  #$ #   H",
                "  $#  # H#  #   H #  #  #  H",
                "  # $# H#  #    H  #$ #  # H",
                " #  # HH     $  H   #     #H",
                "      H##################  H",
            ]
        },
        {
            name: "68",
            map: [
                "======================S    =",
                "=         E           S    =",
                "=    H#=##==#H=       S    =",
                "=    H      SH=#=##==#S    =",
                "= ##=H     HSH# # E#-------=",
                "=$   H   $SHS## # =#      $=",
                "=    H   HSHS#  #  #      E=",
                "=H   H   HSHS# $#P #      #=",
                "=H   H   HS=##  ## #     $#=",
                "=H====X#==S=     # #     ##=",
                "=H --------=-----# #  $   #=",
                "=H     $  H     ## #    ###=",
                "=H  H=X===H===#H#  #   $#  =",
                "=H  H=   =H=  #H####X#=# $ =",
                "=H  H=   =H=$ #H        ##==",
                "=H $H= E =H=#####==###=####=",
            ]
        },
        {
            name: "69",
            map: [
                "H E ##          ------------",
                "H#####       ##H            ",
                "H#####       ##H #=#=#=#=#=#",
                "H#####       ##H $ $ $ $ $ $",
                "H##$##       ##H#X#X#X#X#X#X",
                "H##### $  E  ##H#X#X#X#X#X#X",
                "H##############H------------",
                "H##############H   = = = = =",
                "H  P E         H   #X#X#X###",
                "H########H########H     X###",
                "H########H   #####H####HX###",
                "H########H##$  ###H####HX###",
                "H########H####$  #H E  HX###",
                "         H######  H####HX###",
                "    $ $  H########H####HX###",
                "##################H $$ HX###",
            ]
        },
        {
            name: "70",
            map: [
                "                           S",
                "                           S",
                "                     E-$$$-S",
                "  $-$-               H$###$H",
                "$H# # $-            $H#####H",
                "#H    #           $ #H##$##H",
                " H      $-        #H-H#####H",
                " H      #       $ -H  $###$ ",
                " H              #H          ",
                " H        $      H    $$$$  ",
                " H        #   $ -H   $####$ ",
                " H            #H     ####HX ",
                " H         $-  H     ###HX# ",
                " H         # $-H     ##HX## ",
                " H          $# H     #HX### ",
                " H  P       #  H E   HX#### ",
            ]
        },
        {
            name: "71",
            map: [
                "    S                       ",
                "    S              E        ",
                "    S            H#####H    ",
                " $H####H#HE    $ H#   #H    ",
                "#H#####H#####H##H######H###H",
                "#H    =H $  =H =H  =# #H  $H",
                "#H ###=H =# =H =H $=# #H ##H",
                "#H $##=H   $=H =H # # #H ##H",
                "#H ###=H # #=H =H ==  #H ##H",
                "#H   $=H =   H$#H ##$ #HE $H",
                "#H#####H#####HX#H######H###H",
                "$H------- $$ H  E ##     =$H",
                "===H    ##===##H==#$     $=H",
                "   H###$#=====#H======H====H",
                "P  H#$##$$$$$$ H$     H    H",
                "======####=======###########",
            ]
        },
        {
            name: "72",
            map: [
                "S                           ",
                "S      ------------------###",
                "H    $E         H          #",
                "H##X####        H          #",
                "H      #        H $EH ## $ #",
                "H $ H  # $   ---H###H#######",
                "H###H$ ##### $  H   H       ",
                "    H##########XH   H      $",
                "H   H##  $ ####XH $#H-----##",
                "H###H##########XH###H $ H ##",
                "H     #---------H#$#HX##H ##",
                "H$EH  #     $   H###H   H ##",
                "###H  #   $ ##  H###H   H ##",
                "   H  # $ ##    H###H   H ##",
                "   H P####    $ H###H  EH ##",
                "############################",
            ]
        },
        {
            name: "73",
            map: [
                "                            ",
                "      SSSSSSSPS       S     ",
                "    E    S    SS     SSE=   ",
                "  $H$    S     SS   SS ===  ",
                " $HHH$   S      SS SS ===== ",
                "$HHHHH$  S       SSS =======",
                "HHHHHHH--S  $E $  S----HHH  ",
                "   H    ############    H   ",
                "  $=$   # $      $ #    H   ",
                " $===$  # -------- #    H   ",
                " =====  # H      H #    H   ",
                "  ===   # H      H #    H   ",
                "H#####H #$H   E  H$#    H   ",
                "H     H ############    H   ",
                "H     H  H        H     H   ",
                "H#####HH############HH#####H",
            ]
        },
        {
            name: "74",
            map: [
                "     S                      ",
                "     S           ===========",
                "=====S=====H----H          =",
                "=    S     H P  H   E      =",
                "#####H######################",
                "##H  H  H###    ####      ##",
                "#HH#####H### ## ############",
                "#H###### H## $# ### ##  ## #",
                "#H# ### #H## ## ### $### $ #",
                "#H## $ ##H##    ### ## $## #",
                "#H#######H#########X########",
                "#H  # #$ HH              EH#",
                "#H####### H########H######H#",
                "#H $###   H      ##H      H#",
                "#H      E H   $  ##H   $  H#",
                "############################",
            ]
        },
        {
            name: "75",
            map: [
                "         $   $              ",
                " $   $   ##H##   $   $    $ ",
                " ##H##     H     ##H##   #H#",
                "   H      H        H      H ",
                "    H      H        H    H  ",
                "   H       EH   $$   H    H ",
                "  H        H    ##  H ---- H",
                "   H      H        H      H ",
                "    H      H ------ H    HP ",
                "   H ----- EH        H    ##",
                "  H   $$   H        H       ",
                "   H  ##  H        H        ",
                "  E H      H        H E     ",
                "#####XXXXXXXXXXXXXXX#######H",
                "                           H",
                "############################",
            ]
        },
        {
            name: "76",
            map: [
                "###############            S",
                "#             #            S",
                "# ------------HH#######$   S",
                "#             H#  $  # #---H",
                "#$ $E      P  H#     # #E  H",
                "#H######H======#==   H  ## H",
                "#H     #H      ###   H     H",
                "#H$    #H-------   E #H    H",
                "#H   ##=H      #######H   H#",
                "#H  ##$=H    ###     #H#####",
                "#H  #  =H  $##$# $$  #H## ##",
                "#H##   =H  ##  #######H# # #",
                "#H#$   =H ##   #-----#H## ##",
                "#H     HHH#    #  $  #H#$# #",
                "#H     H#H           #H## ##",
                "############################",
            ]
        },
        {
            name: "77",
            map: [
                " ----      $$$$$$$     ---- ",
                "H    ##################    H",
                "H ===##################=== H",
                "H    ##################    H",
                "HE=H ################## H=EH",
                "===H #    #    #    ### H===",
                "   H #$$$$#$$$$#$$$$### H   ",
                "   H ################## H   ",
                "   H ################## H   ",
                "   H ################## H   ",
                "   H ###    #    #    # H   ",
                "   H ###$$$$#$$$$#$$$$# H   ",
                "   H ################## H   ",
                "   H ################## H   ",
                "   H ################## H   ",
                "   H                   PH   ",
            ]
        },
        {
            name: "78",
            map: [
                "#                         #S",
                "#      $  E   -----------$#S",
                "#############HH    E $  H##S",
                "####         HH########### S",
                "#####  $  E  HH        ##  S",
                "#############HH  $    ###H S",
                "#######      HH########  H S",
                "   $  ##  $  HH     ###X#H S",
                "H############HH $  ##    H S",
                "H## # ####   HH##### $   H S",
                "H  H#H# $##  HH  #####X##H S",
                "===H H#H####PHH ## $     H S",
                "=====H H# ###HH#####X####H S",
                "=======HHH# #HH#         H S",
                "         H H HH          H S",
                "############################",
            ]
        },
        {
            name: "79",
            map: [
                "                     S      ",
                "    E           =    S   E $",
                "H===== =======H==   #S#H####",
                "H       ---   H=$##H#S#H####",
                "##H## ##  H#E H ###H#S#H##$#",
                "  H  ##$# H # H##  H#S#H####",
                "H#   ####XH  #H  H###S#H    ",
                "H    P    H   #  H#  S ####H",
                "H######## # $#  $H#H#######H",
                "H########X# #  ####H##     H",
                "H########X#     $##H  ######",
                "H##$   ##X#----H# #H------  ",
                "H##   $##X#H   #  #$    # #H",
                "H########X#H  #######H###$#H",
                "H   ##$    H ##      H  ###H",
                "H##########H###########    H",
            ]
        },
        {
            name: "80",
            map: [
                "      -----------$          ",
                "======   ##     #======#H   ",
                "=------  $$     #      #H   ",
                "=H      ###X    # E   $#H   ",
                "=H$$    $  $    ######X#H   ",
                "====H $ #X##          EHH   ",
                "    H       $   $   E-- H   ",
                "    H     #=========#-- H   ",
                "    H$E $ #E     $  #   H   ",
                "    H####H######X####   H   ",
                "     #  #H              H   ",
                "     #  #H              H   ",
                "     #$$#H              H   ",
                "     ##X#H              H   ",
                "         H    E  P      H   ",
                "###=====###====###====###===",
            ]
        },
        {
            name: "81",
            map: [
                "S                           ",
                "S                           ",
                "=======H               H====",
                "       H   E         E H    ",
                "       H#######===#####H    ",
                "   #   H               H    ",
                "  #  --H               H    ",
                "  # $ $H    $#$     $$$H    ",
                "  # #$#H--  # # $$$ ###H--  ",
                " #  #$#H$ $--$# ### #$#H$ $-",
                " #  ###H#$# $#$ $$$ ###H#$# ",
                " #    #H$#$ ### ### #$#H$#$ ",
                "#     #H#$#         ###H#$# ",
                "       H-H             H-H  ",
                "       H    P          H    ",
                "###===#########====#########",
            ]
        },
        {
            name: "82",
            map: [
                "============ S =============",
                "=--------H#=-S-=#H---------=",
                "=      $ H#--S--#H $       =",
                "=   $  ##H--$S$--H##  $    =",
                "=  $##X-HH#=#S#=#HH-#X# $  =",
                "= $##--H-#X-HSH-X#-H--###$ =",
                "#$##--H-----HSH-----H---##$=",
                "#X---H------HSH------H----X#",
                "#---HE------HSH------EH----#",
                "#   H######XHPHX######H    #",
                "# $ H       ###       H  $ #",
                "H   H    E  #$#  E    H    H",
                "H---H#X#####H H#####X#H----H",
                "H $  H      H H      H  $  H",
                "H    H  $   H H  $   H     H",
                "#########=#######=######====",
            ]
        },
        {
            name: "83",
            map: [
                " ----$                $ $P#S",
                "     #H              H#####S",
                "     #H             HX#####S",
                "     #H            H#X##  #S",
                "     #H           H##X##$ #S",
                " $ E #H          H#$#X##XX#S",
                "####  #H        H# H#X##  #S",
                "$   #$ #H$     H# $H#X##  #S",
                "###H #  ##H   H####H#X##  #S",
                "$  #H #$ #H$EH# $ $H#X##  #S",
                "##H #H #  ##H######H#X##  #S",
                "$ #H #H #$ #H $ $ -H#X##  #S",
                "#H #H #H # #H##### H#X##XX#S",
                " #H #H #H          H#X##   S",
                "  H  H  H     E    H       S",
                "############################",
            ]
        },
        {
            name: "84",
            map: [
                "                      S     ",
                "                      S     ",
                "E       $#$           S#$   ",
                "#####H########H#H##########H",
                "$   #H $      H#H    #     H",
                "###H#####H##########H#H#####",
                "$  H     H  E       H#H    $",
                "#H##############H###########",
                "$H##$  #      $#H    E #$   ",
                "#########H#########H########",
                "##H     EH###$ ##  H  ##  $#",
                "##H####H#########H###H######",
                "$ H####H# $#####$H###H    ##",
                "##H####H#########H######H###",
                "##H   #H     # P H  #   H  $",
                "############################",
            ]
        },
        {
            name: "85",
            map: [
                "              E  $          ",
                "         $  ######H# $      ",
                "     ###X####     H#####X#  ",
                "     #      #     H#     #  ",
                "     # E$   #     H#     #  ",
                " ######## $ #$  #H#####$$#  ",
                " #      ###X#####H    #X####",
                " #      #     $ #H E$    - #",
                " #      #    H########### H#",
                " #   $ $#    H#         $ H#",
                " #  #####    H# $  H#H H####",
                " ####   # $#H####  H###X#   ",
                "    # $ ####H   # $H#       ",
                "    #####  #H   ###X#       ",
                "            H      P        ",
                "=#=#=#=#=#=#=#=#=#=#=#=#=#=#",
            ]
        },
        {
            name: "86",
            map: [
                "S                          S",
                "S--------------------------S",
                "HH                        HH",
                "H  #X##    ###X##  ######  H",
                "H  #  ##   #    #  #    X  H",
                "H  #   ##  #       #       H",
                "H  #    #  #       #       H",
                "H  #   $#  #    $  #       H",
                "H  #   ##  #   ##  #    $  H",
                "H  #$ ##   #   $#  #$  $#  H",
                "H  ####    ###X##  ##X###  H",
                "H      P                   H",
                "H H######  ######  #H####  H",
                "H H#   $#  ######H #H##$#  H",
                "HEH#    # E## $##H  H####  H",
                "############################",
            ]
        },
        {
            name: "87",
            map: [
                " S                          ",
                "  S                         ",
                " H$    $H      $H     $H    ",
                " $H    H$      H$     H$    ",
                " H$    $H      $H     $H    ",
                " $H    H$      H$     H$    ",
                " H$    $H      $H     $H    ",
                " $H    H$      H$     H$    ",
                " H$    $H      $H     $H    ",
                " $H    H$      H$     H$    ",
                " H$    $H      $H     $H    ",
                " $H    H$      H$     H$    ",
                " H$    $H      $H     $H    ",
                " $H    H$      H$     H$    ",
                "PH$    $H     E$H   E $H  E ",
                "############################",
            ]
        },
        {
            name: "88",
            map: [
                " --------#          E       ",
                "H        #  $    H####H # #H",
                "H XXXXXX #####H= H=   H # #H",
                "H XXXXXX #  $ H= H=H= H # #H",
                "H XXXXXX #H####= H=H= H # #H",
                "H XX$$XX #H $  = H=H= H # #H",
                "H XXXXXX #####H= H=H= H # #H",
                "H XXXXXX #  $ H= H=H= H #$#H",
                "H       E#H####= H=H= H ##XH",
                "H#########H $  = H=H= H    H",
                "H#############H=##=H=######H",
                "H#########  $ H====H====###H",
                "H##$$#####H####= $ S $ =$##H",
                "H########$H=#===========###H",
                "H==========       $  E$    H",
                "H P        H################",
            ]
        },
        {
            name: "89",
            map: [
                "=S#===#==##=##==#= ==#==##=#",
                "=HSSSSS=S=#==#S=SSSSSS==####",
                "=H P $S=S $$$ S S  E S $  S#",
                "=H=#=#S=S#=##=H#H=###H####S#",
                "=H $  S=S $$$ H H $##H###=S#",
                "=H=#=SS=S ### H H ==$H$##$S#",
                "=HSSS $=S     H$H  #=H=#==S#",
                "=H  S##=S  $  H=H  $ H----S#",
                "=H$ ES =S ### H=H  #=H  $=##",
                "=H####H=S  #  H$H  # H ##$S#",
                "=H  = H=SSSSSSH=H  # H   =H=",
                "=H  = H---------H$E# H=$$$H#",
                "=H  =$H=####H $=H###########",
                "=H  =#H=   #####=#=-------H#",
                "=H $  H  $   $       E $$$H#",
                "=######=#============#====H#",
            ]
        },
        {
            name: "90",
            map: [
                "                  H   S     ",
                "        --        H   S     ",
                "$   $  -- H     --H  $SE    ",
                "####H--   H E  ---#X##H#H   ",
                "    H  =#X#H  ---$#$  S#H   ",
                "XX###H  $  H-H== =######H   ",
                "X$   H  =    H   ==== --H   ",
                " X$  H      $H $     H=     ",
                "  #$ H#X##H======H#X=H=     ",
                "  H#$H    H  $   H   H=     ",
                "  H XH=   H#X####H##=H=     ",
                "  H -H  $ H  $   H  =H=     ",
                "  H= $  = H####X#H =$H$=    ",
                "  H  =    H  $   H ==H==    ",
                "  H       H##X###H  EH      ",
                "##########H  E  PH##########",
            ]
        },
        {
            name: "91",
            map: [
                "              S             ",
                "              S             ",
                "              S             ",
                " ------   E  H#H  E   ------",
                "      H---H#$H#H$#H---H     ",
                " H#$ #H   H#######H   H# $#H",
                " H####    H-H# #H-H    ####H",
                " HH##       H###H       ##HH",
                "  H##       H# #H       ##H ",
                "  H##       H###H       ##H ",
                "  H##       H# #H       ##H ",
                "  H##       H###H       ##H ",
                "  H##       H# #H P   E ##H ",
                "  H#########H###H#########H ",
                "$ H##   $  #H $ H#  $   ##H$",
                "============================",
            ]
        },
        {
            name: "92",
            map: [
                "                        S   ",
                "               $     #E#S#  ",
                "      H---H########### #S#  ",
                "$ ----H    #      $  # #S#  ",
                "#H         #    ###### #S#  ",
                "##H      E #    $      #S#  ",
                "###H     $ #     ----- #S#  ",
                "####H -----#$  $#    H  S   ",
                "======H    ######    H--S   ",
                "      H    ######    H #####",
                "      H    ######    H #$ E ",
                "      H    ######    H ####H",
                "      H              H     H",
                "    --H              H     H",
                "E $#  H       P      H     H",
                "####  H##$###########H  ###H",
            ]
        },
        {
            name: "93",
            map: [
                "             SS             ",
                "  E HHHHH  $$SS$$  HHHHH E  ",
                "    HHHHH H######H HHH H    ",
                "  H#H H H H  $   H H H H#H  ",
                "  H#H H H H######H H H H#H  ",
                "   #H H H-H  P $ H-H H H#   ",
                "   $= H =-########-= H =$   ",
                "   XH H H-H######H-H H HX   ",
                "  HXH H H-H######H-H H HXH  ",
                "  HHH H H  H#XX#H  H H HHH  ",
                "  HHH H H  H#XX#H  H H HHH  ",
                "   HH H H   #$$#   H H HH   ",
                "    HHH H          H HHH    ",
                "     HHHH          HHHH     ",
                "      HHH          HHH      ",
                "       EH##########HE       ",
            ]
        },
        {
            name: "94",
            map: [
                "$  ############S############",
                "H#---    -   $#S#          #",
                "H#$# #### #####S#H###H####H#",
                "H#$# #  #   $ #S#H###H####H#",
                "H#$# #$$#######S#H  #H E$#H#",
                "H#$# ##########S###H#H####H#",
                "H#$#  $    E   S  #H#H####H#",
                "H#$#####H####$ S $#H#H    H#",
                "H#$#    H   #######H######H#",
                "H#$#H###$##H  $   #H   $ #H#",
                "H#$#H# $  #######H########H#",
                "H#$#H H##HE$    #H    $  #H#",
                "H#$############H########H#H#",
                "H#$#$  # $ # $ H$ #   $ H#H#",
                "H#X#H#H#H#H#H######H######H#",
                "H $ H#H$H#H$H#P  $ H  $   H#",
            ]
        },
        {
            name: "95",
            map: [
                "  S                         ",
                "  S                         ",
                "  S      -----        -----H",
                " EH    -      H  -- EH     H",
                "X#H---H #X##  H##  ##H ##X##",
                "X#    H##X### H##  ##H ##X# ",
                "X#    H##E-   H##  ##H ##   ",
                "X#    H##H ## H##  ##H- #   ",
                "X# $  H##H$## H##$ ##$HXX$P ",
                "X --H-H##H ## H##  ## H#### ",
                "## HH  ##H  # H##  ## H#### ",
                "##HH   ##H X -H##  ## H##   ",
                "##H    ##H ##  ##  ## H##   ",
                "##H $--##H  $   # $#  H   $ ",
                "#####H ######H  ##X#  H####H",
                "#####H $#### H  $#X$  H#####",
            ]
        },
        {
            name: "96",
            map: [
                " -  E   #### E  $   ####    ",
                "H H####H####H###### #######H",
                "H H####H  $ H###$## ####$##H",
                "H H#$$#H###########    ####H",
                "H #####H     --------------H",
                "H     #HE        $  $       ",
                "H#X#H #H#####X#######H $ $  ",
                "H$ #H #H----- -----H========",
                "## #H #H    $ $    H  P$  $ ",
                "   $H #H#####X#####H#######H",
                "##H== #H-----------H       H",
                "##H   $H    $     =######H H",
                "##H##############S=    $ H H",
                "$#H#             S=#####X# H",
                "##H#     $    $  S=    E   H",
                "############################",
            ]
        },
        {
            name: "97",
            map: [
                "             HH----HHHHH####",
                "            H##H---H$$ H####",
                "           H####H   HH$H H H",
                "          H######H    HH$H$H",
                "          H######H     HHHHH",
                "          H#=#=X=H     H H H",
                "          H$=#=X$H     H H H",
                "          H#=#=X=H     H$H$H",
                "$---------H#=#=X=H     HHHHH",
                "H$        H$=#=X$H     H H H",
                "#H$       H#=#=X=H     H H H",
                "##H$      H#=#=X=H     H$H$H",
                "###H$     H$###X$H     HHHHH",
                "####H$    H######H     H H H",
                "#####H$  H=# #= #=H   PH$H$H",
                "######H EH=# #= #=HE H######",
            ]
        },
        {
            name: "98",
            map: [
                "=S                         =",
                "=S==== =========#=========$=",
                "=S    $   $----   --------H=",
                "=S       H##  #####     ##H=",
                "=S     $ H       $#  # $#$H=",
                "=S    ###H  $ P  ##  #X##=H=",
                "=S $     H#####H  # E     H=",
                "=S ###   H#   #H  #---H####=",
                "=S     E H#$  #H  #   H--- =",
                "=S   H#########H###   H  $ =",
                "=### H#$ # $  #   #   H ###=",
                "=$ ##H#########   #   H #  =",
                "=####H---$$=$$#$  ##===H=##=",
                "=   #H  ###=#####H#    H  $=",
                "= $ #H    $      HH  E H#H =",
                "#####H############H#########",
            ]
        },
        {
            name: "99",
            map: [
                "  ---      $  $    ---  = #H",
                "##  #H    H####H  HE  ##=  H",
                " ## #H   H##########H ##= #H",
                "##  #H#####$##$#####H #$=##H",
                "$##$#H     E        H     #H",
                "#################X#########H",
                "   $ E   $          P   E  H",
                "================H###########",
                " ------------- =H           ",
                "H      -      H=H---------- ",
                "H     - -     H=## ## ## ##H",
                "H    - # -    H============H",
                "H   - ### -   H------------H",
                "H  - ##### -  HX#X#X#X#X#X#X",
                "H - ##$$$## - H=            ",
                "H- ######### -H=        E   ",
            ]
        },
        {
            name: "100",
            map: [
                "                 E E E-     ",
                "               H###### H###H",
                "               H#    # H###H",
                "           H######   # H###H",
                "           H#    #   # H###H",
                "       H######   #$$$# H###H",
                "       H#    #   ##### H###H",
                "   H######   #$$$#     H###H",
                "  EH#    #   ##### H#######H",
                "######   #$$$#    EH#    ##H",
                "#    #   ##### H######   ##H",
                "#    #$$$#     H#    #   ##H",
                "#    ##### H##### $$$#$$$##H",
                "#$$$$#     H#======#===#===H",
                "###### H#####        P     H",
                "       H####################",
            ]
        },
        {
            name: "101",
            map: [
                "H                          H",
                "H     H#$##H     H##$#H    H",
                "HE$   H####H     H####H   $H",
                "####H H####H-----H####H H###",
                "    H H##$#H     H#$##H H   ",
                "  $EH H####H     H####H H$  ",
                "H#### H####H     H####H ###H",
                "H     H#$##H-----H$###H    H",
                "H $   H####H     H#$##H  $ H",
                "####H H##$#H     H####H H###",
                "    H H$###H     H##$#H H   ",
                "  $ H H####H-----H####H H $ ",
                "H#### H#$##H     H###$H ###H",
                "H     H####H     H#$##H    H",
                "H  P  H##$$H  E  H####H  E H",
                "############################",
            ]
        },
        {
            name: "102",
            map: [
                "---------    H      -----   ",
                "         H    H    H        ",
                "   ------H $   H   H        ",
                "  H $ E  ###   H    H       ",
                "  H ####      H ---  H $$-- ",
                "  H          H   $   H ==   ",
                "  H----   $ H    =  H      $",
                "       H ## H      H       #",
                "       H     H     ===###=##",
                "       H      H --          ",
                "   $E$ H       H         = =",
                "  #### H----   H   ======= =",
                "$        $$   H $      $ $E=",
                "=        ==  H  #  #########",
                "           P H              ",
                "#####===#########===########",
            ]
        },
        {
            name: "103",
            map: [
                "-----------------------H    ",
                "  $    $     $     $   H    ",
                "####  ####  ###X  ##X# H    ",
                "     $    $      $     H    ",
                "#  #X##  ##X#  X###  # H    ",
                " $      $   $      $   H    ",
                "####  ####  ###X  ##X# H    ",
                "    $     $     $      H    ",
                "#  ##X#  #X##  X###  # H    ",
                "  $     $     $    $   H    ",
                "####  ####  ###X  ##X# H    ",
                "E    P           E     H   E",
                "########################S###",
                "########################S###",
                "######################  S  #",
                "###################### ESE #",
            ]
        },
        {
            name: "104",
            map: [
                "            E              S",
                "    $                 $    S",
                "  H###H    ##H##    H###H  S",
                " H# $ #HH##HHHHH##HH# $ #H S",
                "#H#####H##HHHHHHH#H######H#S",
                "     E   HHHH$HHHH         S",
                "#########HHHHHHHHH#########S",
                " ##$##   #HHHHHHH#  ##$##  S",
                "  ###     #HHHHH#    ###   S",
                "   #       #HHH#      #    S",
                "            #H#            S",
                "            #H#            S",
                "            #H#            S",
                "            #H#            S",
                "    E        H     P       S",
                "###########################S",
            ]
        },
        {
            name: "105",
            map: [
                "####==#####################S",
                "# $  =     $  E    P      #S",
                "#H#H =#X#H######X######## #S",
                "#H##H #X#HH##$--------$   #S",
                "#H ##H X##HH##$   $  $##H #S",
                "#H  ##H ###HH##$    $## H#HS",
                "#HH  ##H ##HHH##$  $##  HHHS",
                "#HHH$ #HH #H#HH##  ##  #HH#S",
                "#HHHH  H#H H##HH#X##  #HHH#S",
                "#$HHHHEH##HH###HHX#  HHH$H#S",
                "#HH$  HH ##H ###HX $#HHHH##S",
                "###H####$ ##H ##H  #HHHEHH#S",
                "#HHHHHHHH  #HH HHEHHH$  HH#S",
                "#H HH $  H  H#HHH#HH#####H#S",
                "#$ H#H####H     HHH$     H S",
                "#####HHHH$H#####HH##########",
            ]
        },
        {
            name: "106",
            map: [
                "============S  ===       =#=",
                "#######=##==S  ##=       #=#",
                "   $  #=#=#=S  =#=       #  ",
                "H=###X#    =S E #=      $# $",
                "H####   ----H##=#=X#####H= H",
                "H# $# ---=#=H#    X=####H# H",
                "H###---  =#=H#----X=####H=#H",
                "H##---      H=     $ ##=H##H",
                "H#--$   ##=#H#    X##==#H##H",
                "H-- =-------H   ----- ##H #H",
                "   =#E  $  =HX##= P $   H##H",
                "##X#=## =##=HX##==#==#=    H",
                "##X#=      =HX    E $ =#####",
                "##X#=-------HX##  ####=  $ #",
                "##     $   =H          #####",
                "#=####=##H  H  H###=########",
            ]
        },
        {
            name: "107",
            map: [
                " ----------  P   ---------- ",
                "H    ----  ######  ----    H",
                "H    --- ########## ---    H",
                "H    -- ############ --    H",
                "H    - #####$$$$##### -    H",
                "H    - ############## -    H",
                "H     ################     H",
                "H     ##$$$$####$$$$##     H",
                "H     ################     H",
                "H     ######$$$$######     H",
                "H      ##############      H",
                "H    - ############## -    H",
                "H    -  #$$$$##$$$$#  -    H",
                "H    --  ##########  --    H",
                "HE$$$---$  ######  $---$$$EH",
                "#########H$$$$$$$$H#########",
            ]
        },
        {
            name: "108",
            map: [
                "############    ######==###S",
                "#--------------------- ## #S",
                "# H#########H  S#-----H----S",
                "P H$=$$$$   H  S#$  $$H   $S",
                "##H#####=###H  S###H###X#H#S",
                "# HHHHH =  $H  S#$ H-----H S",
                "#$  =$H  $$#H  S#= H === H$S",
                "#######X####H  S#$ HE  $$H=H",
                "#  $=$$ =  #H  S######H####H",
                "#  ==== =  #H--H#$    H  $$S",
                "# $$$ $$=$ #H$EH#=$   H ###H",
                "#H###X####H#########H######H",
                "#H--------H### -----H-= ---H",
                "#H $  $$$ H  $H $ $ H =H$ $#",
                "##H##H=#H###X#H##=#X#####H##",
                " $H$$HE H     H        $$H$$",
            ]
        },
        {
            name: "109",
            map: [
                "HH #####EH=== ===HE##### HH=",
                "H=HH $ HH=HHHHHHH=HH $ HH=HH",
                "$H=H#H#H=H$##H##$H=H#H#H=H$#",
                "# H=HHH=H # HHH # H=HHH=H #H",
                " #HH=H=HH# H   H #HH=H=HH#  ",
                "H# HHHHH #H ### H# HHHHH #H#",
                "H#H     H#H# $ #H#H     H#HP",
                "H# HHHHH #H ### H# HHHHH #H#",
                " #HH=H=HH# H   H #HH=H=HH#  ",
                "X H=HHH=H # HHH # H=HHH=H #H",
                "$H=H#H#H=H$##H##$H=H#H#H=H$#",
                "H=HH $ HH=HHHHHHH=HH $ HH=HH",
                "=H ##### H===H===H ##### H==",
                "=H H $ H H==HHH==H H $ H H==",
                "=H H#H#HEHH=HHH=HHEH#H#H H==",
                "H=H=HHH=H=HHHHHHH=H=HHH=H=HH",
            ]
        },
        {
            name: "110",
            map: [
                "      =-------  --- HH##H  S",
                "$   E$=------$##   HH##HH  S",
                "###H##=     $##   HH##HH$  S",
                "   H  =    $##   HH##HH$ ==S",
                "$  H $=   $##   HH##HH$ == S",
                "###H##=  $##   HH##HH$ ==  S",
                "  PH  = $##   HH##HH$ == $$S",
                "###H $=$##   HH##HH$ == H## ",
                "###H##=##   HH##HH$ ==  H$$ ",
                "#$#H  = $  HHE HH$ == H#### ",
                "###H $=###########H=  H$ E$ ",
                "$##H##=-----------H= H##### ",
                "###H $=$ $  H      = H$   $ ",
                "#======###  H #### = H##### ",
                "           EH##$$##= H$   $ ",
                "############=######= #######",
            ]
        },
        {
            name: "111",
            map: [
                "            HHH             ",
                "           HHHH             ",
                "             HH             ",
                "  E         HHHH         E  ",
                "-----------HHHHHH-----------",
                "-----------HHHHHH-----------",
                " ----------HHHHHH---------- ",
                "   --------HHHHHH--------   ",
                "     ------HHHHHH------     ",
                "        ---HHHHHH---        ",
                "$ $ $ $ $  HHHHHH  $ $ $ $ $",
                "           HHEPHH           ",
                "###########HH##HH###########",
                "###########HH##HH###########",
                " $ $ $ $    H  H    $ $ $ $ ",
                "############################",
            ]
        },
        {
            name: "112",
            map: [
                "                     ======H",
                "--------------  E          H",
                "H            H======= H# HS#",
                "H EH=H       H-----H #H #H  ",
                "=====H=H= P        H  ## S#X",
                "H----H H#X###=== ##H ##HSS#X",
                "H    H H# $#   $   H # H#--X",
                "H      H#  $#### ==H $H#$ $$",
                "H      H# E#####   H #H#   #",
                "HX$     # #####$ ==HSSH#H###",
                "H #     # $##### $ H  # H## ",
                "H  #    # ###### H=H ###H ##",
                "H   #   #H $#$ # H H  # H# $",
                "H    #   H###### H=H # ## ##",
                "H       #          H        ",
                "##===#########====#=#===#===",
            ]
        },
        {
            name: "113",
            map: [
                "S                           ",
                "S                           ",
                "###############H## $      P ",
                "    E     E    H##X#=======H",
                "$  HHHHHHHHHHH H           H",
                "#$ H  HHHHHHHH H $ $ H#####H",
                " #$H  H        H #S# ######H",
                "  #H  H$ $ $ $  H #        H",
                "   #$ H#X#X#X# H     E$ $ $H",
                "    # H         H    #H####H",
                "      H H H H  H      H     ",
                "      H         H     H E   ",
                "       H H H   H      #####H",
                "        H H H   H          H",
                "    E    $S#   H   E       H",
                "############################",
            ]
        },
        {
            name: "114",
            map: [
                "       --          --    -- ",
                " ######$-H########H-$####$- ",
                " #######$H########H$######$ ",
                " ########H########H######## ",
                " ### ####H###     H###   ## ",
                " ###  ###H###$$$  H###$$$-- ",
                " ###  ###H######  H######$- ",
                " ###  ###H######  H ######$ ",
                " ###  ###H######  H  ###### ",
                " ### $###H###     H     ### ",
                " ###$####H###$$$$$H##$$$### ",
                " ########H########H##X##### ",
                " ####### H########H #X####  ",
                " ######  H########H  X###   ",
                "  E  E   H   P    H   E  E  ",
                "#########S###HH###S#########",
            ]
        },
        {
            name: "115",
            map: [
                "                           S",
                "-------- #H            $  $S",
                "   $#$  H#H#=#=#=#=#=X=#=#=#",
                "  $# #$ H#H    $   $  ------",
                " $#   #$H##=#=#=#=#=#H     H",
                " #     XH#===========H  $  H",
                "        H----------H###X###H",
                "                   H#      H",
                "  $ P$             H#      H",
                "H#######H E $  $   H# $  $EH",
                "H E$  $ H#=#=#=#=#=#==#=X=#H",
                "H#######H######$ ###       H",
                "H  $ $  H######## ##       H",
                "H#######H######### #       H",
                "H   $ $ H##########  $  $  H",
                "############################",
            ]
        },
        {
            name: "116",
            map: [
                "##S#=#=#=#=#==# #S#= ##S####",
                "##S######=#==H= =S=# # S  H#",
                "#=S      #=  H   S $  ES  H#",
                "###X##H------H##X#########H#",
                " P $  H$H#=$ H =  =#=  #  H#",
                "#####H##H=#=  $ =    = ---H#",
                "  =# H= H===#==# =  -----#H#",
                "$ E  H  H  #---------= $##H#",
                "#X=##H  H$==#$ #=$  =  ## H#",
                "=X = H  $=#==#$ =#---H#   H#",
                "  #  H $= $$$ =$  =  H    H ",
                "H----H$= H#=#  =$   #H######",
                "H H  ==--H      =  $ H =====",
                "H H#=#$$ H--H  H ####H  =  #",
                "H H$ $##$E$$H--H  ##=H   E$#",
                "############H $H$###########",
            ]
        },
        {
            name: "117",
            map: [
                "            ###            S",
                "    $  E $  ===     $E  $  S",
                "H##############H############",
                "H---------- ===H            ",
                "           H###H  --------- ",
                " ----------H===H$          H",
                "H $  ----P  ######       $H#",
                "#####    #H ======    E$H###",
                "  - #    #H ######   $H#####",
                "##$H#    #H ====== $H#######",
                "$##H#    #H----- $H#########",
                "##$H#    #H === H===========",
                "$##H# $$ #H ### H           ",
                "##$H####X#H === H##########H",
                "$##H  E   H$###$H#$        H",
                "############===###==========",
            ]
        },
        {
            name: "118",
            map: [
                "----------------            ",
                "     $          HE          ",
                "    $$$        HHH          ",
                "    $$$        HHH          ",
                "   $$         HH            ",
                " $$ $$$     HH HHH  --------",
                "$$ $$  $$  HH HH  HH   E    ",
                "   HH         HH      HHHHH ",
                " E HHH        HHH     $$$$$ ",
                "HHHH HH    HHHH HH    HHHHH ",
                "     HH         HH    $$$$$ ",
                "     HH       P HH    HHHHH ",
                "############H###############",
                "            H               ",
                "            H               ",
                "############################",
            ]
        },
        {
            name: "119",
            map: [
                "                        S   ",
                "   $                    S   ",
                "H=##                    S==H",
                "H=$## $                $S==H",
                "H  #$###          E #######H",
                "H  # #  ###$     ### $     H",
                "H--  #$ #  #  $ ##$ ====   H",
                "H  ######   ###X#      ###=H",
                "H$ P             #===H# $  H",
                "H====--------        H###$ H",
                "H   =    E$$$$       H  ####",
                "H $ =$  ==========   H $=  $",
                "H#####               H##==##",
                "H----H------         H      ",
                "     H               HE     ",
                "   $ H   ###################",
            ]
        },
        {
            name: "120",
            map: [
                "             S              ",
                "             S              ",
                "         H   S            H ",
                "   ######H   H------------H ",
                "   #  $ #H   H          E H ",
                "   #    #H   H======##==##==",
                "=#==#==#==#==H#-----#X###  #",
                " $E $     $  H# H   #-- #  #",
                "#######X#####H# H#$$#$#H#$ #",
                " ------------H# H####X#H#  #",
                "HE           H# H$   --HHH##",
                "H############H######H $  H  ",
                "H           PH      H##  HHH",
                "H$##### $ ###H## $ #H#$--  H",
                "H## $ #####$ H$#####H##$ ##H",
                "####################H  #####",
            ]
        },
        {
            name: "121",
            map: [
                "                            ",
                "######HS            SH######",
                "###HHH$S            S$HHH###",
                "HH###HHH$          $HHH#X#HH",
                "$HHH#X#HHH$E    E$HHH###HHH$",
                "  $HHH###HHH$  $HHH#X#HHH$  ",
                "    $HHH#X#HHHHHH###HHH$    ",
                "      $HHH###HH###HHH$      ",
                "        $HHH#HH#HHH$        ",
                "      $HHH###HH###HHH$      ",
                "    $HHH###HHHHHH#X#HHH$    ",
                "  $HHH#X#HHH$  $HHH###HHH$  ",
                "$HHH###HHH$      $HHH#X#HHH$",
                "HH#X#HHH$          $HHH###HH",
                "###HHH$S            S$HHH###",
                "######HS       P    SH######",
            ]
        },
        {
            name: "122",
            map: [
                "S                           ",
                "S      E          $         ",
                "S ==H====         ====H=====",
                "S   H    #$      #    H# ---",
                "S---H-----#     #-----H=H  $",
                "#$  H  $   #   #      H#H-- ",
                " #E H--- #H # #   $   H=   H",
                "  #     # H  X        H#$  H",
                "P  #   #  H         $ H= --H",
                "==# # #   H# ------ # H#H   ",
                "    #X    H # $    #  H=H E ",
                "$H###     H  #    # $ H####H",
                "#H=-------H   #  #  ##H####H",
                " H             XX     H    H",
                " H                    H    H",
                "======#######====####=======",
            ]
        },
        {
            name: "123",
            map: [
                "              S             ",
                "   --------  -S---          ",
                "  H        H-     H H####H  ",
                "  H-------EH------ H# H- #H ",
                "  H       H#  --- H#  H $ XH",
                "  H      HX #H   H#   H   $#",
                "  H  -- H#   #H - P---H----#",
                "H #HHS H#$H## #H  #        #",
                "H# #HS H#######H  #### #####",
                "##X##S H#  #$ #H-H    -   EH",
                "##X##S H#######  H#### ####H",
                "# $ #S H# $#  #H H#$## ####H",
                "#####S H#######H H#### ##$#H",
                "#####S H#  #$  H H#    #   H",
                "#   #S H#######H H##X###X##H",
                "# $  S#H      #H#H   #  $  H",
            ]
        },
        {
            name: "124",
            map: [
                "S                          S",
                "S                          S",
                "S-----H     H------H#     #H",
                "      H-----H      H# $   #H",
                " $    H     H E $  H#####X#H",
                "### $ #HH   #############X#H",
                "####### H $          $     H",
                "#####$  H##   $#$   ##     H",
                "######$ H##  $###$  ##     H",
                "#######$H## $#####$ ## E $ H",
                "########H##X###########H==#H",
                "#      EH              H ##H",
                "#  $  ##H       P      H ##H",
                "########H----H####H$---H ##H",
                "#  $    H  $ H##$#H#  #H$##H",
                "##################H####H###H",
            ]
        },
        {
            name: "125",
            map: [
                "    ------              -   ",
                " ###      H--   E  H####    ",
                " #$      H-- ######H####    ",
                " ###     --  X####XH#$$#    ",
                "     ###X    X####XH####    ",
                "     ###X ##-X#$$#XH    X###",
                "     #$$X ## X####XH    X###",
                "     ###X          H    X$$#",
                "                   H    X###",
                "         X##X      H        ",
                "X###X    X$$X      HX###    ",
                "X###X    X##X      HX### ## ",
                "X $ X              HX$$# ## ",
                "X###X              HX###    ",
                "              E    H P      ",
                "############################",
            ]
        },
        {
            name: "126",
            map: [
                "   $      - -  E   -      -E",
                "H### H####$#$#####H -    - H",
                "H  $ H############H -$ - $ H",
                "H### H##$#####$###H-  - - -H",
                "H  $ H############H $   $  H",
                "H### H#$#######$##H --  -  H",
                "H  $ H############H - $ -$-H",
                "H### H##$#####$###H   -  - H",
                "H  $ H############H  - -   H",
                "H### H###$###$####H-  - - -H",
                "H  $ H############H  $   - H",
                "H### H####$#$#####H   -- $ H",
                "H  $ H############H -  - - H",
                "H### H###$###$####H $ - - -H",
                "H E  H############H     P   ",
                "H####H##$#####$###H#########",
            ]
        },
        {
            name: "127",
            map: [
                "      S                    S",
                "      S      E             S",
                "--- E S------#####H    E   S",
                "H##=### #######H$##########H",
                "H##$### =$   H#H##   $   $ H",
                "H###### =====H=H   ------- H",
                "H        ----H H   H       H",
                "##X###H        H   H  #    H",
                "---   H###### #######H######",
                "$   H##     ----# HHHHHHHH--",
                "    H#  ===H    #$HHHHHHHH $",
                "H####  #   ===H #-HHHHHHHH -",
                "H     #  H####H #$HHHHHHHH  ",
                "H   H#   H####H #-HHHHHHHH  ",
                "HP  H#H  H# $#H ###########H",
                "###############            H",
            ]
        },
        {
            name: "128",
            map: [
                " -                        - ",
                "H ######################## H",
                "H #    #  $  $#       #  # H",
                "H # $  ####X###       #  # H",
                "H #X####     # $E $   # $# H",
                "H #   #      ############# H",
                "H # $ #      #      #    # H",
                "H #####  $ E #      #    # H",
                "H #   #########     #  $ # H",
                "H #      #    #$  E ##X### H",
                "H # $  $ #    #######    # H",
                "H ###X####    #   #      # H",
                "H # $ #$   E$ #$  # $    # H",
                "H ###X##########X######X## H",
                "H           P      E       H",
                "############################",
            ]
        },
        {
            name: "129",
            map: [
                "             HH             ",
                "  EH         HH         H E ",
                " ##H##     ##HH##     ##H## ",
                "##$H$##   ###HH###   ##$H$##",
                "#  H     ##$ HH $##  #  H   ",
                "##$H$ ---##  HH      ##$H$  ",
                " ##H##   ##$ HHE$     ##H## ",
                "  $H$##   ###HH##      $H$##",
                "   H  #    ##HH### --   H  #",
                "##$H$##    $ HH $##  ##$H$##",
                " #XHX#       HH  ##   ##HX# ",
                "   H     ##$ HHE$##     H   ",
                "          ###HH###          ",
                "           ##HH##           ",
                "        P    HH             ",
                "#############HH#############",
            ]
        },
        {
            name: "130",
            map: [
                "H                           ",
                "H  --      -----------------",
                "H   S     $H    $    H   E H",
                "### #######H-------H H H====",
                " $         H $     H H H    ",
                "===H### E  H-------H H ====H",
                "   H $ #####    $  H H     H",
                " P H #####$#-------H H H====",
                "H# H---------------H H H $  ",
                "H#######X#####   E   H ====H",
                "H$  ####     #$  ####H     H",
                "H#############== ######H####",
                "H=############   ######H###$",
                "H=############H= ##$###H####",
                "H= $##########H=       H    ",
                "H #######$    H=############",
            ]
        },
        {
            name: "131",
            map: [
                "            S               ",
                "#         #$S$#         #   ",
                " #---H-----#H#-----H---#    ",
                "  #$ H E   $H$   E H $#     ",
                "   #-H-H---#H#---H-H-#      ",
                "    #  H  X H X  H  #       ",
                " H---# H #--H--# H #------H ",
                " H-H  #H#       #H#     H-H ",
                "   H  #H#       #H#     H   ",
                " H-H  #H# P $   #H####  H-H ",
                " H    #H#########H####    H ",
                " H-H  #H# ##### #H##$#  H-H ",
                "  $H  #H# ##$## #H####  H$  ",
                " H-HE #H# ##### #H#    EH-H ",
                " H---- H -     - H -------H ",
                " H    #H# ##### #H#       H ",
            ]
        },
        {
            name: "132",
            map: [
                "#S                         #",
                "#S-------------------------#",
                "#S       X###H###X         #",
                "#S    $X#X   H   X## $     #",
                "#S  $X#X$$$$$H$$E$$#X# $   #",
                "#S ##X#X#####H######X#X# $ #",
                "####         H         #X#X#",
                "##     $$$$  HE $$$$     #X#",
                "#    H######XH#######H     #",
                "#    H       H       H     #",
                "#   $H  $$$$$H $ $$$$H E   #",
                "# HX#########HX#########H  #",
                "# H          H          H  #",
                "# H          H          H  #",
                "# H          H  P       H  #",
                "############################",
            ]
        },
        {
            name: "133",
            map: [
                "-------------H--------------",
                " $      $    H   $   $ E$  $",
                "E$  $    E $ H $   $ $      ",
                " #X##X#H H#X####H H#X#      ",
                " #X##X##HH#X####XHH#X#      ",
                " #X##X##XH#X####X#H#X#      ",
                " #X#  ##XH#X#  #X#H#X#      ",
                " #X#  ##XH#X#  #X#H#X#      ",
                " #X#  ##XH#X#  #X#H#X#      ",
                " #X#  ##XH#X#  #X#H#X#      ",
                " #X# $##XH#X# $#X#H#X#      ",
                " #X#X###XH#X#X##X#H#X###X## ",
                " #X#X### H#X#X##X H#X###X## ",
                " #X#X##  H#X#X##  H#X###X## ",
                "         H   P    H         ",
                "############################",
            ]
        },
        {
            name: "134",
            map: [
                "$E     #####################",
                "##H    #####################",
                "H####H    ##################",
                "H#######H E  ###############",
                "H##### ####H    ############",
                "H##### #######H    #########",
                "H##### ##########H E  ######",
                "H#### $ ############H    ###",
                "H####### $ ############H    ",
                "H##### #### $ #############H",
                "H##### ####### $ ##########H",
                "H##### #########H $ #######H",
                "H##### #########H### ######H",
                "H$   $   $   $ #H### ######H",
                "##############  H###      PH",
                "############################",
            ]
        },
        {
            name: "135",
            map: [
                "       S                    ",
                "       S                    ",
                "       S   H================",
                "##HH###H###H     E   -------",
                "#$#H# #H# #H############  $ ",
                "# #H#$#H#$#HHHH$HHHH$HHH###H",
                "#XHH###H# #HH====HH===HH   H",
                "HHHHHHHHHHHHH=  $HH=  HH##H$",
                "HH    H ## HH= -=HH= $HH# H#",
                "HH ###H #$#HH====HH===HH#H #",
                "HH #$ H  ##HH---- HHHHHH#H  ",
                "HH ## H # #H  $   HHHHH####H",
                "HH    HP## H#######  $H###$H",
                "HHHHHHH====H#HHHHH= ##H### H",
                "H     $  ==H#H H H= ##H ##H#",
                "#####H   E  #H H$H=  $H# EH#",
            ]
        },
        {
            name: "136",
            map: [
                "                     EEE    ",
                "                  $$$$$$S   ",
                "           $$$$$$S#######   ",
                "    $$$$$$S=======          ",
                "   S#######                 ",
                "   SS                       ",
                "    S                       ",
                "$$$$S                       ",
                "####H                       ",
                "##########H                 ",
                "###############H            ",
                "###################H        ",
                "######################H     ",
                "########################H   ",
                "#########################H  ",
                "#########################HP ",
            ]
        },
        {
            name: "137",
            map: [
                "S                           ",
                "S   $   $   $E E$   $   $   ",
                "##############S#############",
                "              H             ",
                "             #H#            ",
                "             $H$            ",
                "   E        ##H##       E   ",
                "   H        $ H $       H   ",
                "  #H#      ###H###     #H#  ",
                "  $H$      $  H  $     $H$  ",
                " ##H##    ####H####   ##H## ",
                " $ H $    $   H   $   $ H $ ",
                "###H###  #####H##### ###H###",
                "$  H  $  $    H    $ $  H  $",
                "   H          H P       H   ",
                "############################",
            ]
        },
        {
            name: "138",
            map: [
                "             S              ",
                "             S              ",
                "          E  S  $---        ",
                " --------H====#X##  H       ",
                "H        H       $  H       ",
                "H      ######===#######     ",
                "H      #$ #   #   #   #     ",
                "H E $$ #  #  $# $$# $$# $   ",
                "H#######  ################# ",
                "H#  # #####     #           ",
                "H# $# $  #   H$ # P      $  ",
                "H###########=H=#######X#####",
                "H            H          --- ",
                "H            H         H  $ ",
                "H        $   H         H ###",
                "#############H    $ E  H  $ ",
            ]
        },
        {
            name: "139",
            map: [
                "S               S  =####    ",
                "S###############S  = $H# $  ",
                "S-----------H  #H--=##H# ===",
                "$H#=#     $ H--#H   $ H#   H",
                "=H   ##     H  #H  =##H#  $H",
                "=H##  $#   PH  #H $=E H#H--H",
                "HH $########H  #H  =#H##H  H",
                "H  ###     =H  #H    H  H $ ",
                "H   ##    $=H  ##H   H  H###",
                "HH   ######=HE  ###H H  H   ",
                "=H###------=##H   ###HH H##H",
                "#H    E       #=H   ##H#   H",
                "#H#######H      #=H   H#   H",
                "#H##$####H#####H###==HH### H",
                "#H#####$#H#####H$  $ HH#$  H",
                "#H###################H#####H",
            ]
        },
        {
            name: "140",
            map: [
                "                            ",
                "          SSSSSSSS          ",
                "          H######H          ",
                "        E H# E  #H E        ",
                "          H#  $ #H          ",
                "     H################H     ",
                "     H#    #    #    #H     ",
                "     H#    #    #    #H     ",
                "     H#    #    #    #H     ",
                "     H#  $ #E $ #  $ #H     ",
                "H#############X############H",
                "H#    #    #    #    #    #H",
                "H#    #    #    #    #    #H",
                "H#  $ #  $ #  $ #  $ #  $ #H",
                "H#H##H#H##H#H##H#H##H#H##H#H",
                "H H##H H##HPH##HEH##H H##H H",
            ]
        },
        {
            name: "141",
            map: [
                "----------        ----------",
                "H         ########         H",
                "H       ############       H",
                "H   E  ##############  E   H",
                "H ====################==== H",
                "H        ##########        H",
                "H =H        ####        H= H",
                "===H                    H===",
                "   H  $  $  $  $  $  $  H   ",
                "   H                    H   ",
                "   H        ####        H   ",
                "   H     ###XXXX###  P  H   ",
                "   H  ###XXXXXXXXXX###  H   ",
                "   H   XXXXXXXXXXXXXX   H   ",
                "   H    XXXXXXXXXXXX    H   ",
                "   H      XXXXXXXX      H   ",
            ]
        },
        {
            name: "142",
            map: [
                "-----------                 ",
                "           H     #   - -    ",
                "  $  $  $ EH---- #### H ####",
                "###########     H#### H X###",
                "$$       $$ ----H#### H X###",
                "##$     $##H     # ## H X$$#",
                "###$   $###H---- # ## H X###",
                "####$ $####     H# ## H X$$#",
                "#####$#####  E  H# ## H X###",
                "###########H######$$# H X$$#",
                "           H     #### H X###",
                "#S#    P   H         EH X$$#",
                "#S###########H##########X###",
                "#S    ###$###H#####$        ",
                "#S    ####$##H##$ $##H     $",
                "#S$  $#####  H  ############",
            ]
        },
        {
            name: "143",
            map: [
                "########S###################",
                "P =  ===S   =H #   H------- ",
                "#H   H =H== =H$#H==H        ",
                "$H==#H =H==  H  H         $ ",
                "##H  H =H  ###H=H-----      ",
                "$=H##=$=H##---H=H       ####",
                "  H    =H= $= H=##   $      ",
                " EH  $ =H=####H= H       E  ",
                "==##H# =H=    H--H==========",
                "H  =H#  H=###### H   =-----=",
                "H#  H###H= $#$  ###H = H   =",
                "H= H== =H=  #      H   H   =",
                "H= H= $=H   ###########H=  =",
                "H ### ==H=###          H   =",
                "H    E  H=$ =H $    $  H   =",
                "#########=##$H==####===H  $=",
            ]
        },
        {
            name: "144",
            map: [
                "                            ",
                "     ---S      ---    -   --",
                "H   H  -#======   #### ==H  ",
                "H$  H$  #   =$           H $",
                "##H-==H =H  ==#= XXXX## H#X#",
                " $H E$H =H  =$          H   ",
                "H##-H== =HH ==#H X    X H   ",
                "H$  H$  = HH  =H  #$$#  H   ",
                "##H-==H =  HH =H   ##H--H $ ",
                "E$H  $H =   HH=H     H  ##X#",
                "H##-H== =    H=H  E  H      ",
                "H$  H$E =     =H========H $ ",
                "##H-==H =     =H#  $ $ #H#X#",
                " $H  $H =     =H#H#=#=##H   ",
                "H##-=== =E$$H# H#H $ $  H   ",
                "H P     ######==##=#=#=#=#=#",
            ]
        },
        {
            name: "145",
            map: [
                "      E   S       S   E     ",
                "           S     S          ",
                "            S   S           ",
                "          $###H###$         ",
                "          #$#$H$#$#         ",
                "  $      #$H H#H H$#    $ $ ",
                "  ##H#H######H H######H#H## ",
                " $# H#H      HHH      H#H$# ",
                " # HH#HHHHHHHHHHHHHHHHH#HH #",
                " #HE$ #HHHHHHH#HHHHHHH# $EH#",
                "  ###H #H $  H H  $ H# H### ",
                "   $##H#######H#######H##$  ",
                "   ## H     $ H $     H ##  ",
                "   # H##HHHHHH#HHHHHH##H #  ",
                " $  H###HHH#HHHHH#HHH###HP$ ",
                "############################",
            ]
        },
        {
            name: "146",
            map: [
                "#    -     P    -    # $    ",
                "####H ########## H#### ####H",
                "####H #  ##### # H####   $ H",
                "#$##H # #####  # H##$# H####",
                "####H #  ##### # H#### H$   ",
                "##$#H # #####  # H#$## ####H",
                "####H #  ##### # H####    $H",
                "#$##H # #####  # H#### H####",
                "####H #  ##### # H ### H $  ",
                "##$#H # #####  # H#### ####H",
                "####H #   #### # H#$##  $  H",
                "#$##H #$#####$$# H#### H####",
                "####H ########## H##$  H  $ ",
                "##$#H ########## H#### ####H",
                "####H  E     E   H####  E  H",
                "############################",
            ]
        },
        {
            name: "147",
            map: [
                "                S           ",
                " E-         -P  S     -     ",
                " H H       H H  S    H H   H",
                "H  HH     H   H S   H   H  H",
                " #$H H   H #$# HS  H #$# H-H",
                " ##H  ---HE### H---HE#H#   H",
                "=##H##X##=##=##=##X##=H#X##H",
                "#  H  X  #  $###  $# #H X  H",
                "#--H--X--# H#----H----H-#--H",
                "#  H  X  # H#  # HXH #E $  H",
                "#X=H#=#X=##H##=##=XH=##=#X#H",
                " X####   ##H##   #XH##   X#H",
                "   H--- --#H#-- --XH#-- --#H",
                "  #H#  $  #H#  $  #H   $  #H",
                " $#H#  =  #H#  =  #H#  =  #H",
                "#X H X#=## H ##=## H ##=#X H",
            ]
        },
        {
            name: "148",
            map: [
                "                            ",
                "          EE SS EE          ",
                "         $$$S##S$$$         ",
                "   $$$$$S==========S$$$$$   ",
                "  S######          ######S  ",
                "  SSS                  SSS  ",
                "    S                  S    ",
                "    S                  S    ",
                "    S                  S    ",
                "    S                  S    ",
                "    S                  S    ",
                "    S                  S    ",
                "    S                  S    ",
                "    S                  S    ",
                "    S          P       S    ",
                "=######=#####==#####=######=",
            ]
        },
        {
            name: "149",
            map: [
                "                            ",
                "         H##    ##H         ",
                "        H##      ##H        ",
                "       H##        ##H       ",
                "      H##$  E     $##H      ",
                "  $--H################H--$E ",
                " H#H   ##$        $##   H#H ",
                " HH#H   ## $    $ ##   H#HH ",
                " $HH#HE  ####  ####   H#HH$ ",
                "  $HH#H   ###  ###   H#HH$  ",
                "   $HH#H   ##$P##   H#HH$   ",
                "    $HH#H   ####   H#HH$    ",
                "     $HH#H   HH   H#HH$     ",
                "      $HH#H  HH  H#HH$      ",
                "$  E   $H##H HH H##H$   E  $",
                "############################",
            ]
        },
        {
            name: "150",
            map: [
                " ----        EP        ---- ",
                "H    ##H$          $H##    H",
                "H    ##H$          $H##    H",
                "H     ##H$        $H##     H",
                "H$ $  ##H$        $H##  $ $H",
                "H####H ##H$      $H## H####H",
                "H$  $H ##H$      $H## H$  $H",
                "H#####H ##H$    $H## H#####H",
                "H$E E$H ##H$    $H## H$E E$H",
                "H######H ##H$  $H## H######H",
                "H$    $H ##H$  $H## H$    $H",
                "H#######H ##H$$H## H#######H",
                "H$     $H ######## H$     $H",
                "H########H ###X## H########H",
                "H$      $H $$#X$$ H$      $H",
                "#############==##S##########",
            ]
        }
    ];

    // --------------------------------------------------------------- state

    var grid = [];          // current level tile map [ROWS][COLS]
    var baseGrid = [];      // original level template [ROWS][COLS] to remember S and X positions
    var levelIndex = 0;
    var maxUnlockedLevel = 0;
    var goldLeft = 0;
    var score = 0;
    var bestScore = 0;
    var lives = 5;
    var levelTime = 0;
    var gameState = "play"; // play | dead | clear | over
    var stateTimer = 0;
    var paused = false;
    var exitOpen = false;

    // ------------------------------------------------------------- persist

    function getSaveFile() {
        if (typeof getGameSaveFile !== "function") return null;
        return getGameSaveFile("LodeRunner");
    }

    function saveSettings() {
        if (typeof writeKeyValueFile !== "function") return;
        var f = getSaveFile();
        if (!f) return;
        try {
            writeKeyValueFile(f, [
                "lang=" + currentLang,
                "best=" + bestScore,
                "level=" + maxUnlockedLevel
            ]);
        } catch (e) {}
    }

    function loadSettings() {
        if (typeof readKeyValueFile !== "function") return;
        var f = getSaveFile();
        if (!f) return;
        try {
            var map = readKeyValueFile(f);
            if (!map) return;
            if (map.lang && I18N[map.lang]) currentLang = map.lang;
            if (map.best) bestScore = parseInt(map.best, 10) || 0;
            if (map.level) maxUnlockedLevel = parseInt(map.level, 10) || 0;
        } catch (e) {}
    }

    function addScore(pts) {
        score += pts;
        if (score > bestScore) {
            bestScore = score;
            saveSettings();
        }
    }

    var player = {
        cx: 1, cy: 1,
        px: 0, py: 0,            // pixel position, interpolated
        fromX: 0, fromY: 0,      // move start, in pixels
        dir: 1,
        moving: false,
        moveT: 0,                // 0..1 progress of the current step
        falling: false,
        fallT: 0,
        animPhase: 0,    // run cycle: 0..3
        digging: 0,      // ms of the dig beam left
        digDir: 0,
        inHole: 0,       // ms stuck inside a hole
        pendingDig: 0,   // buffered dig input direction (-1 or 1)
        landT: 0,        // ms of landing squash/recovery
        fellCells: 0
    };

    var enemies = [];
    var holes = [];             // { cx, cy, life }

    var keys = {};
    var lastKeyAt = {};

    // --------------------------------------------------------------- input

    function isDown(name) { return keys[name] === true; }

    function setKey(name, down) {
        if (!name || name === "F15") return;
        if (down) {
            lastKeyAt[name] = new Date().getTime();
            keys[name] = true;
        } else {
            keys[name] = false;
        }
    }

    function dropStaleKeys() {
        var now = new Date().getTime();
        for (var k in keys) {
            if (keys[k] && lastKeyAt[k] && now - lastKeyAt[k] > 4000) keys[k] = false;
        }
    }

    // ------------------------------------------------------------- tile rules

    function tileAt(cx, cy) {
        if (cy < 0) return " "; // air above row 0 for exit escape
        if (cx < 0 || cx >= COLS || cy >= ROWS) return "=";
        return grid[cy][cx];
    }

    function setTile(cx, cy, ch) {
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return;
        grid[cy][cx] = ch;
    }

    function baseTileAt(cx, cy) {
        if (cy < 0 || cx < 0 || cx >= COLS || cy >= ROWS) return " ";
        return baseGrid[cy][cx];
    }

    function isSolid(ch) { return ch === "#" || ch === "="; }
    function isLadder(ch) { return ch === "H" || (exitOpen && ch === "S"); }
    function isRope(ch) { return ch === "-"; }
    function isHole(ch) { return ch === "o"; }
    function isTrap(ch) { return ch === "X"; }

    function enemyAt(cx, cy) {
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (e.dead <= 0 && e.cx === cx && e.cy === cy) return e;
        }
        return null;
    }

    // Blocks movement sideways and downwards.
    function blocked(cx, cy) { return isSolid(tileAt(cx, cy)); }

    // A cell the runner or enemy can stand in: supported from below (solid brick/concrete/ladder),
    // hanging on a ladder/rope, or standing on a guard's head.
    function supported(cx, cy) {
        var here = tileAt(cx, cy);
        if (isLadder(here) || isRope(here)) return true;
        if (cy >= ROWS - 1) return true;
        // In classic Lode Runner, standing on a guard's head counts as solid ground!
        if (enemyAt(cx, cy + 1) !== null) return true;
        var below = tileAt(cx, cy + 1);
        if (isSolid(below) || isLadder(below)) return true;
        return false;
    }

    // --------------------------------------------------------------- level

    function loadLevel(index) {
        var def = LEVELS[index];
        grid = [];
        baseGrid = [];
        enemies = [];
        holes = [];
        goldLeft = 0;
        exitOpen = false;

        for (var r = 0; r < ROWS; r++) {
            var src = def.map[r] || "";
            var row = [];
            var baseRow = [];
            for (var c = 0; c < COLS; c++) {
                var ch = (c < src.length) ? src.charAt(c) : " ";
                baseRow.push(ch);
                if (ch === "P") {
                    player.cx = c;
                    player.cy = r;
                    ch = " ";
                } else if (ch === "E") {
                    enemies.push({
                        cx: c, cy: r,
                        px: c * TILE, py: r * TILE,
                        fromX: c * TILE, fromY: r * TILE,
                        dir: -1,
                        moving: false,
                        falling: false,
                        moveT: 0,
                        dead: 0,
                        inHole: 0,
                        climbingOut: false,
                        hasGold: false,
                        goldSteps: 0,
                        animPhase: 0,
                        landT: 0,
                        fellCells: 0
                    });
                    ch = " ";
                } else if (ch === "$") {
                    goldLeft++;
                }
                row.push(ch);
            }
            grid.push(row);
            baseGrid.push(baseRow);
        }

        player.px = player.cx * TILE;
        player.py = player.cy * TILE;
        player.fromX = player.px;
        player.fromY = player.py;
        player.dir = 1;
        player.moving = false;
        player.falling = false;
        player.moveT = 0;
        player.digging = 0;
        player.inHole = 0;
        player.pendingDig = 0;
        player.landT = 0;
        player.fellCells = 0;
        levelTime = 0;

        if (index > maxUnlockedLevel) {
            maxUnlockedLevel = index;
            saveSettings();
        }
    }

    // ------------------------------------------------------------ movement

    function canEnter(cx, cy, dy) {
        if (blocked(cx, cy)) return false;
        // False brick X blocks horizontal entry (can only fall through from above)
        if (isTrap(tileAt(cx, cy)) && dy === 0) return false;
        // Falling into a hole is allowed; walking into an empty hole is not.
        // If a guard is trapped in the hole, walking across his head is allowed.
        if (isHole(tileAt(cx, cy)) && dy === 0 && enemyAt(cx, cy) === null) return false;
        return true;
    }

    function beginMove(dx, dy) {
        if (dx !== 0) player.animPhase = (player.animPhase + 1) % 4;
        player.fromX = player.cx * TILE;
        player.fromY = player.cy * TILE;
        player.cx += dx;
        player.cy += dy;
        player.moving = true;
        player.moveT = 0;
        if (dx !== 0) player.dir = dx;
    }

    function climbOut() {
        var up = player.cy - 1;
        if (up >= 0 && !blocked(player.cx, up)) {
            player.fromX = player.cx * TILE;
            player.fromY = player.cy * TILE;
            player.cy = up;
            player.moving = true;
            player.moveT = 0;
            return true;
        }
        return false;
    }

    function tryStep(dt) {
        var here = tileAt(player.cx, player.cy);
        var wantUp = isDown("UP") || isDown("W");
        var wantDown = isDown("DOWN") || isDown("S");
        var wantLeft = isDown("LEFT") || isDown("A");
        var wantRight = isDown("RIGHT") || isDown("D");

        if (player.moving) return false;

        // Inside a hole the only way out is upwards.
        if (tileAt(player.cx, player.cy) === "o" || player.inHole > 0) {
            if (wantUp && !blocked(player.cx, player.cy - 1)) {
                player.inHole = 0;
                return climbOut();
            }
            return false;
        }
        if (player.digging > 0) return false;

        // On a horizontal rope, pressing DOWN drops off the rope into free fall!
        if (isRope(here) && wantDown) {
            var belowY = player.cy + 1;
            if (belowY < ROWS && !blocked(player.cx, belowY)) {
                player.cy = belowY;
                player.fromY = (belowY - 1) * TILE;
                player.falling = true;
                player.fellCells = 1;
                player.moving = true;
                player.moveT = 0;
                player.fallT = 0;
                return true;
            }
        }

        var below = tileAt(player.cx, player.cy + 1);
        if (wantUp && isLadder(here) && !blocked(player.cx, player.cy - 1)) {
            beginMove(0, -1);
            return true;
        }
        // Standing on the top rung counts: the ladder is in the cell below
        if (wantDown && (isLadder(here) || isLadder(below)) && !blocked(player.cx, player.cy + 1)) {
            beginMove(0, 1);
            return true;
        }
        if (wantLeft && canEnter(player.cx - 1, player.cy, 0)) {
            beginMove(-1, 0);
            return true;
        }
        if (wantRight && canEnter(player.cx + 1, player.cy, 0)) {
            beginMove(1, 0);
            return true;
        }

        return false;
    }

    function isExitReached() {
        if (!exitOpen) return false;
        var here = tileAt(player.cx, player.cy);
        var isExit = (baseTileAt(player.cx, player.cy) === "S");
        // Exit is reached when climbing to the top of an exit ladder S
        // (the cell above is row -1, or above cell is not an exit ladder S),
        // or reaching the top row cy === 0 on any ladder:
        if (isExit && (player.cy === 0 || baseTileAt(player.cx, player.cy - 1) !== "S")) {
            return true;
        }
        if (player.cy === 0 && isLadder(here)) {
            return true;
        }
        return false;
    }

    function finishMove() {
        player.moving = false;
        player.moveT = 1;
        var here = tileAt(player.cx, player.cy);

        // Gold collected
        if (here === "$") {
            setTile(player.cx, player.cy, " ");
            goldLeft--;
            addScore(250);
            if (goldLeft <= 0) exitOpen = true;
        }

        // Win condition: with all gold collected, climbing to the top of an exit ladder S
        // or reaching the top row finishes the level!
        if (isExitReached()) {
            gameState = "clear";
            stateTimer = 1500;
            addScore(1500);
            lives++;
            return;
        }

        // Stepping on a trap brick X or falling off unsupported ground:
        // Note: catching a rope or ladder stops the fall!
        if (here === "X" || !supported(player.cx, player.cy)) {
            player.falling = true;
        } else {
            if (player.falling && player.fellCells > 0) {
                player.landT = Math.min(130, 75 + player.fellCells * 16);
            }
            player.falling = false;
            player.fellCells = 0;
        }

        // Process buffered dig input
        if (player.pendingDig !== 0) {
            var bDir = player.pendingDig;
            player.pendingDig = 0;
            dig(bDir);
        }
    }

    function updateFall(dt) {
        if (!player.falling) return;
        player.fallT = 0;

        var below = player.cy + 1;
        if (below >= ROWS) {
            if (player.fellCells > 0) player.landT = Math.min(130, 75 + player.fellCells * 16);
            player.falling = false;
            player.fellCells = 0;
            return;
        }

        var here = tileAt(player.cx, player.cy);
        if (here !== "X" && supported(player.cx, player.cy)) {
            if (player.fellCells > 0) player.landT = Math.min(130, 75 + player.fellCells * 16);
            player.falling = false;
            player.fellCells = 0;
            return;
        }

        var ch = tileAt(player.cx, below);
        if (isSolid(ch)) {
            if (player.fellCells > 0) player.landT = Math.min(130, 75 + player.fellCells * 16);
            player.falling = false;
            player.fellCells = 0;
            return;
        }

        if (ch === "o") {
            // Drop inside the pit and be stuck there for a moment
            player.cy = below;
            player.px = player.cx * TILE;
            player.py = player.cy * TILE;
            player.falling = false;
            player.fellCells = 0;
            player.landT = 95;
            player.inHole = 450;
            return;
        }

        player.cy = below;
        player.fromX = player.px;
        player.fromY = player.py;
        player.moving = true;
        player.moveT = 0;
        player.fellCells++;
    }

    function updatePlayer(dt) {
        if (isExitReached()) {
            gameState = "clear";
            stateTimer = 1500;
            addScore(1500);
            return;
        }

        if (player.landT > 0) {
            player.landT = Math.max(0, player.landT - dt);
        }

        if (player.digging > 0) {
            player.digging -= dt;
            if (player.digging <= 0) finishDig();
            return;
        }

        // Stuck in a hole: no control until the trapped time runs out, then can climb out
        if (player.inHole > 0) {
            player.inHole -= dt;
            if (player.inHole <= 0) player.inHole = 0;
            else return;
        }

        if (player.moving) {
            advancePlayerMove(dt);
        } else if (player.falling) {
            updateFall(dt);
        } else {
            var here = tileAt(player.cx, player.cy);
            if (here === "X" || !supported(player.cx, player.cy)) {
                player.falling = true;
            } else {
                tryStep(dt);
            }
        }
    }

    function advancePlayerMove(dt) {
        var stepMs = player.falling ? FALL_MS : MOVE_MS;
        var remaining = (1 - player.moveT) * stepMs;
        var toX = player.cx * TILE;
        var toY = player.cy * TILE;
        if (dt < remaining) {
            player.moveT += dt / stepMs;
            player.px = player.fromX + (toX - player.fromX) * player.moveT;
            player.py = player.fromY + (toY - player.fromY) * player.moveT;
            return;
        }

        var wasRunning = !player.falling && player.fromY === toY && player.fromX !== toX;
        player.px = toX;
        player.py = toY;
        finishMove();
        if (player.falling && !player.moving) {
            updateFall(0);
        } else if (wasRunning && gameState === "play" && !player.digging && tryStep()) {
            advancePlayerMove(dt - remaining);
        }
    }

    // ------------------------------------------------------------- digging

    // Exact Apple II digging check:
    // 1. Runner must be supported on a floor, ladder, rope, or guard's head.
    // 2. Target tile (cx + dir, cy + 1) must be a normal brick '#'.
    // 3. Tile directly above target (cx + dir, cy) must be empty space (' ', 'o', or 'X').
    function canDig(dir) {
        if (player.moving || player.falling || player.inHole > 0 || player.digging > 0) return false;
        if (gameState !== "play") return false;
        if (!supported(player.cx, player.cy)) return false;

        var tx = player.cx + dir;
        var ty = player.cy + 1;
        if (tx < 0 || tx >= COLS || ty >= ROWS) return false;
        if (tileAt(tx, ty) !== "#") return false;

        var above = tileAt(tx, player.cy);
        if (above !== " " && above !== "o" && above !== "X") return false;
        if (isRope(above) || isLadder(above)) return false;
        if (enemyAt(tx, player.cy) !== null) return false;

        return true;
    }

    function dig(dir) {
        if (!canDig(dir)) return;
        var tx = player.cx + dir;
        var ty = player.cy + 1;
        player.digging = DIG_SWING_MS;
        player.digDir = dir;
        player.dir = dir;
        setTile(tx, ty, "o");
        holes.push({ cx: tx, cy: ty, life: HOLE_MS, digTime: DIG_SWING_MS });
        addScore(10);
    }

    function finishDig() {
        player.digging = 0;
    }

    function updateHoles(dt) {
        for (var i = holes.length - 1; i >= 0; i--) {
            var h = holes[i];
            h.life -= dt;
            if (h.digTime > 0) {
                h.digTime -= dt;
                if (h.digTime < 0) h.digTime = 0;
            }
            if (h.life > 0) continue;

            // Refill: anything standing inside is killed
            setTile(h.cx, h.cy, "#");
            holes.splice(i, 1);

            for (var e = 0; e < enemies.length; e++) {
                var en = enemies[e];
                if (en.cx === h.cx && en.cy === h.cy) {
                    en.dead = GUARD_RESPAWN_MS;
                    en.inHole = 0;
                    addScore(75);
                }
            }
            if (player.cx === h.cx && player.cy === h.cy) killPlayer();
        }
    }

    // -------------------------------------------------------------- enemies

    function enemyCanEnter(nx, cy) {
        if (blocked(nx, cy)) return false;
        if (isTrap(tileAt(nx, cy))) return false;
        if (supported(nx, cy)) return true;
        var here = tileAt(nx, cy);
        if (isLadder(here) || isRope(here)) return true;
        // To guard AI, a dug hole below is still treated as normal floor, so guard walks right into it!
        var below = tileAt(nx, cy + 1);
        if (below === "o") return true;
        return false;
    }

    function enemyStep(e, dt) {
        if (e.dead > 0) {
            e.dead -= dt;
            if (e.dead <= 0) rebirthEnemy(e);
            return;
        }

        if (e.landT > 0) {
            e.landT = Math.max(0, e.landT - dt);
        }

        advanceEnemy(e, dt);
    }

    function advanceEnemy(e, dt) {
        // 1. Process active movement/falling animation first (so falling into hole completes!)
        if (e.moving) {
            var stepMs = e.falling ? FALL_MS : GUARD_MOVE_MS;
            var remaining = (1 - e.moveT) * stepMs;
            if (dt >= remaining) {
                dt -= remaining;
                var wasFalling = e.falling;
                e.moveT = 1;
                e.moving = false;
                e.px = e.cx * TILE;
                e.py = e.cy * TILE;

                // Chain continuous fall step immediately without 1-frame idle flicker
                if (wasFalling && !e.climbingOut && tileAt(e.cx, e.cy) !== "o") {
                    var hFall = tileAt(e.cx, e.cy);
                    if (!isLadder(hFall) && !isRope(hFall) && (!supported(e.cx, e.cy) || hFall === "X") && !blocked(e.cx, e.cy + 1)) {
                        e.fellCells = (e.fellCells || 0) + 1;
                        moveEnemy(e, 0, 1);
                        e.falling = true;
                        if (dt > 0) advanceEnemy(e, dt);
                        return;
                    }
                }
                if (wasFalling && (e.fellCells || 0) > 0) {
                    e.landT = Math.min(120, 70 + e.fellCells * 15);
                }
                e.falling = false;
                e.fellCells = 0;

                // If guard just finished climbing out of a hole:
                if (e.climbingOut) {
                    e.climbingOut = false;
                    // Immediately take a horizontal step away from the hole
                    var stepX = (player.cx >= e.cx) ? 1 : -1;
                    if (blocked(e.cx + stepX, e.cy)) stepX = -stepX;
                    if (!blocked(e.cx + stepX, e.cy)) {
                        moveEnemy(e, stepX, 0);
                        if (dt > 0) advanceEnemy(e, dt);
                    }
                    return;
                }

                // Guard picks up gold if he doesn't have one and cooldown is clear
                if (tileAt(e.cx, e.cy) === "$" && !e.hasGold && (e.goldSteps || 0) >= 0) {
                    e.hasGold = true;
                    e.goldSteps = Math.floor(Math.random() * 26) + 12; // 12..37 steps
                    setTile(e.cx, e.cy, " ");
                } else if (e.hasGold) {
                    // Count down steps before dropping gold
                    if (e.goldSteps > 1) {
                        e.goldSteps--;
                    } else if (e.goldSteps === 1) {
                        // Drop gold on solid floor or ladder
                        var underG = tileAt(e.cx, e.cy + 1);
                        if (tileAt(e.cx, e.cy) === " " && (isSolid(underG) || isLadder(underG))) {
                            setTile(e.cx, e.cy, "$");
                            e.hasGold = false;
                            e.goldSteps = -4; // cooldown
                        }
                    }
                } else if ((e.goldSteps || 0) < 0) {
                    e.goldSteps++;
                }
                // Let the collision check see the arrival before starting the next step.
                if (e.cx === player.cx && e.cy === player.cy) return;
            } else {
                e.moveT += dt / stepMs;
                var toX = e.cx * TILE, toY = e.cy * TILE;
                e.px = e.fromX + (toX - e.fromX) * e.moveT;
                e.py = e.fromY + (toY - e.fromY) * e.moveT;
                return;
            }
        }

        // 2. A guard in a dug hole is trapped (only after falling all the way inside!):
        if (tileAt(e.cx, e.cy) === "o") {
            if (e.inHole <= 0) {
                e.inHole = GUARD_TRAP_MS;
                addScore(75);
                // Drops held gold directly above the hole!
                if (e.hasGold) {
                    e.hasGold = false;
                    e.goldSteps = 0;
                    if (e.cy > 0 && tileAt(e.cx, e.cy - 1) === " ") {
                        setTile(e.cx, e.cy - 1, "$");
                    } else {
                        setTile(e.cx, e.cy, "$");
                    }
                }
            }
            e.inHole -= dt;
            e.animPhase = ((e.animPhase || 0) + 1) % 4;
            if (e.inHole <= 0) {
                // Climbs out of the hole upwards!
                e.inHole = 0;
                if (e.cy > 0 && !blocked(e.cx, e.cy - 1)) {
                    e.climbingOut = true;
                    moveEnemy(e, 0, -1);
                }
            }
            return;
        }
        e.inHole = 0;

        // 3. MUST FALL: If not on ladder/rope and unsupported from below
        var here = tileAt(e.cx, e.cy);
        if (!isLadder(here) && !isRope(here) && (!supported(e.cx, e.cy) || here === "X") && !blocked(e.cx, e.cy + 1)) {
            moveEnemy(e, 0, 1);
            e.falling = true;
            e.fellCells = 1;
            if (dt > 0) advanceEnemy(e, dt);
            return;
        }

        var mv = chooseEnemyMove(e);
        if (mv[0] !== 0 || mv[1] !== 0) {
            moveEnemy(e, mv[0], mv[1]);
            if (dt > 0) advanceEnemy(e, dt);
        }
    }

    // Authentic Doug Smith Apple II guard pathfinding:
    // 1. If runner is on the same floor and not falling, pursue directly if no pits/walls.
    // 2. Otherwise scan reachable floor segment; evaluate ladders up/down and drops to find closest path.
    function chooseEnemyMove(e) {
        var gx = e.cx, gy = e.cy;
        var px = player.cx, py = player.cy;

        if (gx === px && gy === py) return [0, 0];

        // 1. Same floor check: if runner is on the same floor and not falling:
        if (gy === py && !player.falling) {
            if (px === gx) return [0, 0];
            var direct = true;
            var step = (px > gx) ? 1 : (px < gx ? -1 : 0);
            if (step === 0) return [0, 0];
            var curX = gx;
            while (curX !== px) {
                if (blocked(curX + step, gy)) { direct = false; break; }
                curX += step;
                var curUnder = tileAt(curX, gy + 1);
                var curT = tileAt(curX, gy);
                if (!isSolid(curUnder) && !isLadder(curUnder) && !isLadder(curT) && !isRope(curT) && curUnder !== "o") {
                    direct = false;
                    break;
                }
            }
            if (direct && curX === px) {
                return [step, 0];
            }
        }

        // 2. Scan floor: get left and right ends of continuous floor
        var leftEnd = gx;
        while (leftEnd > 0) {
            if (blocked(leftEnd - 1, gy)) break;
            var under = (gy < ROWS - 1) ? tileAt(leftEnd - 1, gy + 1) : "=";
            var curT = tileAt(leftEnd - 1, gy);
            if (isLadder(curT) || isRope(curT) || gy >= ROWS - 1 || isSolid(under) || isLadder(under) || under === "o") {
                leftEnd--;
            } else {
                leftEnd--;
                break; // can step off ledge
            }
        }

        var rightEnd = gx;
        while (rightEnd < COLS - 1) {
            if (blocked(rightEnd + 1, gy)) break;
            var under = (gy < ROWS - 1) ? tileAt(rightEnd + 1, gy + 1) : "=";
            var curT = tileAt(rightEnd + 1, gy);
            if (isLadder(curT) || isRope(curT) || gy >= ROWS - 1 || isSolid(under) || isLadder(under) || under === "o") {
                rightEnd++;
            } else {
                rightEnd++;
                break; // can step off ledge
            }
        }

        var bestRating = 255;
        var bestMove = [0, 0];

        function scanDown(x, move) {
            var y = gy;
            while (y < ROWS - 1 && !isSolid(tileAt(x, y + 1))) {
                var curTile = tileAt(x, y);
                if (curTile !== " ") {
                    if (x > 0) {
                        var underL = tileAt(x - 1, y + 1);
                        if (isSolid(underL) || isLadder(underL) || isRope(tileAt(x - 1, y))) {
                            if (y >= py) break;
                        }
                    }
                    if (x < COLS - 1) {
                        var underR = tileAt(x + 1, y + 1);
                        if (isSolid(underR) || isLadder(underR) || isRope(tileAt(x + 1, y))) {
                            if (y >= py) break;
                        }
                    }
                }
                y++;
            }

            var rating;
            if (y === py) rating = Math.abs(gx - x);
            else if (y > py) rating = (y - py) + 200;
            else rating = (py - y) + 100;

            if (rating < bestRating) {
                bestRating = rating;
                bestMove = move;
            }
        }

        function scanUp(x, move) {
            var y = gy;
            while (y > 0 && isLadder(tileAt(x, y))) {
                y--;
                if (x > 0) {
                    var underL = tileAt(x - 1, y + 1);
                    if (isSolid(underL) || isLadder(underL) || isRope(tileAt(x - 1, y))) {
                        if (y <= py) break;
                    }
                }
                if (x < COLS - 1) {
                    var underR = tileAt(x + 1, y + 1);
                    if (isSolid(underR) || isLadder(underR) || isRope(tileAt(x + 1, y))) {
                        if (y <= py) break;
                    }
                }
            }

            var rating;
            if (y === py) rating = Math.abs(gx - x);
            else if (y > py) rating = (y - py) + 200;
            else rating = (py - y) + 100;

            if (rating < bestRating) {
                bestRating = rating;
                bestMove = move;
            }
        }

        // Middle scan first:
        if (gy < ROWS - 1 && !blocked(gx, gy + 1)) {
            scanDown(gx, [0, 1]);
        }
        if (isLadder(tileAt(gx, gy)) && gy > 0 && !blocked(gx, gy - 1)) {
            scanUp(gx, [0, -1]);
        }

        // Left side scan from leftEnd to gx - 1:
        for (var lx = leftEnd; lx < gx; lx++) {
            if (gy < ROWS - 1 && !blocked(lx, gy + 1)) {
                scanDown(lx, [-1, 0]);
            }
            if (isLadder(tileAt(lx, gy)) && gy > 0 && !blocked(lx, gy - 1)) {
                scanUp(lx, [-1, 0]);
            }
        }

        // Right side scan from rightEnd down to gx + 1:
        for (var rx = rightEnd; rx > gx; rx--) {
            if (gy < ROWS - 1 && !blocked(rx, gy + 1)) {
                scanDown(rx, [1, 0]);
            }
            if (isLadder(tileAt(rx, gy)) && gy > 0 && !blocked(rx, gy - 1)) {
                scanUp(rx, [1, 0]);
            }
        }

        if (bestMove[0] !== 0 || bestMove[1] !== 0) {
            return bestMove;
        }

        // Fallback: horizontal step towards runner
        var dx = px - gx;
        if (dx !== 0) {
            var stepX = dx > 0 ? 1 : -1;
            if (enemyCanEnter(gx + stepX, gy)) return [stepX, 0];
            if (enemyCanEnter(gx - stepX, gy)) return [-stepX, 0];
        }

        return [0, 0];
    }

    // Rebirth on upper floors away from runner
    function rebirthEnemy(e) {
        for (var tryX = 2; tryX < COLS - 2; tryX++) {
            var rx = (player.cx + 7 + tryX * 3) % (COLS - 4) + 2;
            if (tileAt(rx, 0) === " " && tileAt(rx, 1) === " ") {
                e.cx = rx;
                e.cy = 0;
                e.px = rx * TILE;
                e.py = 0;
                e.fromX = e.px;
                e.fromY = e.py;
                e.moving = false;
                e.falling = true;
                e.inHole = 0;
                e.climbingOut = false;
                e.dead = 0;
                e.hasGold = false;
                return;
            }
        }
        for (var y = 1; y < ROWS - 1; y++) {
            for (var x = 1; x < COLS - 1; x++) {
                var ch = tileAt(x, y);
                if (ch !== " " && ch !== "H") continue;
                if (Math.abs(x - player.cx) < 5 && Math.abs(y - player.cy) < 3) continue;
                if (!supported(x, y)) continue;
                e.cx = x;
                e.cy = y;
                e.px = x * TILE;
                e.py = y * TILE;
                e.fromX = e.px;
                e.fromY = e.py;
                e.moving = false;
                e.falling = false;
                e.inHole = 0;
                e.climbingOut = false;
                e.dead = 0;
                e.hasGold = false;
                return;
            }
        }
        e.dead = 0;
    }

    function moveEnemy(e, dx, dy) {
        e.fromX = e.cx * TILE;
        e.fromY = e.cy * TILE;
        e.cx += dx;
        e.cy += dy;
        e.moving = true;
        e.moveT = 0;
        if (dy > 0 && dx === 0 && !isLadder(tileAt(e.cx, e.cy))) e.falling = true;
        else e.falling = false;
        if (dx !== 0) { e.dir = dx; e.animPhase = ((e.animPhase || 0) + 1) % 4; }
        else if (dy !== 0) { e.animPhase = ((e.animPhase || 0) + 1) % 4; }
    }

    function updateEnemies(dt) {
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            enemyStep(e, dt);
            // Collision with runner: trapped guard in a hole does not kill the runner!
            if (e.dead <= 0 && !e.moving && e.inHole <= 0) {
                if (e.cx === player.cx && e.cy === player.cy) {
                    killPlayer();
                }
            }
        }
    }

    // --------------------------------------------------------------- player

    function killPlayer() {
        if (gameState !== "play") return;
        gameState = "dead";
        stateTimer = 900;
        lives--;
    }

    // --------------------------------------------------------------- update

    function update(dt) {
        if (paused || gameState !== "play") {
            if (gameState === "dead") {
                stateTimer -= dt;
                if (stateTimer <= 0) {
                    if (lives <= 0) { gameState = "over"; stateTimer = 1800; }
                    else { loadLevel(levelIndex); gameState = "play"; }
                }
            } else if (gameState === "over") {
                stateTimer -= dt;
                if (stateTimer <= 0) startGame();
            } else if (gameState === "clear") {
                stateTimer -= dt;
                if (stateTimer <= 0) {
                    levelIndex++;
                    if (levelIndex > maxUnlockedLevel) {
                        maxUnlockedLevel = levelIndex;
                        saveSettings();
                    }
                    if (levelIndex >= LEVELS.length) { gameState = "over"; stateTimer = 2500; levelIndex = 0; }
                    loadLevel(levelIndex);
                    gameState = "play";
                }
            }
            return;
        }

        levelTime += dt / 1000;

        updatePlayer(dt);
        updateEnemies(dt);
        updateHoles(dt);
    }

    function startGame() {
        score = 0;
        lives = 5;
        levelTime = 0;
        levelIndex = 0;
        paused = false;
        gameState = "play";
        loadLevel(levelIndex);
    }

    // ---------------------------------------------------------------- draw

    function drawScene(g) {
        try {
            drawSceneUnsafe(g);
        } catch (err) {
            perfNote("draw error: " + ((err && err.message) ? err.message : err));
        }
    }

    // 3x5 retro bitmap font for Apple II HUD rendering
    var FONT_3X5 = {
        "0": [7, 5, 5, 5, 7],
        "1": [2, 6, 2, 2, 7],
        "2": [7, 1, 7, 4, 7],
        "3": [7, 1, 7, 1, 7],
        "4": [5, 5, 7, 1, 1],
        "5": [7, 4, 7, 1, 7],
        "6": [7, 4, 7, 5, 7],
        "7": [7, 1, 1, 1, 1],
        "8": [7, 5, 7, 5, 7],
        "9": [7, 5, 7, 1, 7],
        "T": [7, 2, 2, 2, 2],
        "I": [7, 2, 2, 2, 7],
        "M": [5, 7, 5, 5, 5],
        "E": [7, 4, 6, 4, 7],
        "L": [4, 4, 4, 4, 7],
        "V": [5, 5, 5, 5, 2],
        " ": [0, 0, 0, 0, 0]
    };

    function appendRetroText(list, str, startX, startY, pxSize) {
        var s = String(str);
        var curX = startX;
        for (var i = 0; i < s.length; i++) {
            var ch = s.charAt(i);
            var rows = FONT_3X5[ch] || FONT_3X5[" "];
            for (var r = 0; r < 5; r++) {
                var rowMask = rows[r];
                for (var c = 0; c < 3; c++) {
                    if ((rowMask & (4 >> c)) !== 0) {
                        list.push([curX + c * pxSize, startY + r * pxSize, pxSize, pxSize]);
                    }
                }
            }
            curX += 4 * pxSize; // 3 px char + 1 px spacing
        }
        return curX;
    }

    // --------------------------------------------------- character animation

    function getCharacterPose(ent, isPlayer) {
        var dir = ent.dir >= 0 ? 1 : -1;
        var shakeX = 0;
        if (isPlayer && ent.digging > 0) {
            return {
                mode: "dig",
                phase: 1 - ent.digging / DIG_SWING_MS,
                dir: ent.digDir || dir,
                shakeX: 0
            };
        }
        if (ent.falling) {
            return { mode: "fall", phase: ent.py * 0.055, dir: dir, shakeX: 0 };
        }
        if (ent.inHole > 0) {
            if (ent.inHole < 1000) shakeX = Math.sin(ent.inHole * 0.08) * 1.8;
            return { mode: "trapped", phase: ent.inHole * 0.025, dir: dir, shakeX: shakeX };
        }
        var col = Math.max(0, Math.min(COLS - 1, Math.round(ent.px / TILE)));
        var row = Math.max(0, Math.min(ROWS - 1, Math.round(ent.py / TILE)));
        var ch = tileAt(col, row);
        if (isLadder(ch) || (ent.moving && ent.fromY !== ent.cy * TILE)) {
            return { mode: "ladder", phase: ent.py * Math.PI * 1.25 / TILE, dir: dir, shakeX: 0 };
        }
        if (isRope(ch)) {
            return { mode: "rope", phase: ent.px * dir * Math.PI * 1.2 / TILE, dir: dir, shakeX: 0 };
        }
        if (ent.moving || Math.abs(ent.px - ent.cx * TILE) > 0.5 || Math.abs(ent.py - ent.cy * TILE) > 0.5) {
            var cycleLength = isPlayer ? RUNNER_STRIDE_PX : GUARD_STRIDE_PX;
            return { mode: "run", phase: ent.px * dir * 2 * Math.PI / cycleLength, dir: dir, shakeX: 0 };
        }
        if ((ent.landT || 0) > 0) {
            return { mode: "land", phase: Math.min(1, ent.landT / 120), dir: dir, shakeX: 0 };
        }
        return {
            mode: "idle",
            phase: levelTime * 3.6 + (isPlayer ? 0 : (ent.cx || 0) * 1.1),
            dir: dir,
            shakeX: 0
        };
    }

    function solveJoint(ax, ay, bx, by, l1, l2, bendX, bendY) {
        var dx = bx - ax;
        var dy = by - ay;
        var d2 = dx * dx + dy * dy;
        var dist = Math.sqrt(d2);
        if (dist < 0.001) dist = 0.001;
        var maxD = l1 + l2 - 0.05;
        var minD = Math.abs(l1 - l2) + 0.05;
        var clamped = Math.max(minD, Math.min(maxD, dist));
        var a = (l1 * l1 - l2 * l2 + clamped * clamped) / (2 * clamped);
        var h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
        var ux = dx / dist;
        var uy = dy / dist;
        var mx = ax + ux * a;
        var my = ay + uy * a;
        var px = -uy;
        var py = ux;
        if (px * bendX + py * bendY < 0) {
            px = -px;
            py = -py;
        }
        return [mx + px * h, my + py * h];
    }

    function fillCharacterShape(g, x, y, scale, dir, points, brush) {
        g.newPath();
        g.moveTo(x + dir * scale * points[0], y + scale * points[1]);
        for (var i = 2; i < points.length; i += 2) {
            g.lineTo(x + dir * scale * points[i], y + scale * points[i + 1]);
        }
        g.closePath();
        g.fillPath(brush);
    }

    function fillCharacterSegment(g, ax, ay, bx, by, startWidth, endWidth, brush) {
        var dx = bx - ax;
        var dy = by - ay;
        var length = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / length;
        var ny = dx / length;
        fillCharacterShape(g, ax, ay, 1, 1, [
            nx * startWidth, ny * startWidth,
            dx + nx * endWidth, dy + ny * endWidth,
            dx - nx * endWidth, dy - ny * endWidth,
            -nx * startWidth, -ny * startWidth
        ], brush);
    }

    function drawCharacterBoot(g, x, y, sc, dir, toeDrop, brush) {
        var toe = toeDrop / sc;
        fillCharacterShape(g, x, y, sc, dir, [
            -0.9, -1.0, 0.45, -1.0, 0.8, toe - 0.5,
            1.85, toe - 0.2, 2.1, toe + 0.35, 1.7, toe + 0.85, -0.9, 0.85
        ], brush);
    }

    function sampleRunningFoot(cycle, stride, stance, liftHeight) {
        var contactX = stride * stance * 0.5;
        if (cycle < stance) {
            // Cancel the actor's advance during contact so the sole stays planted.
            return { x: contactX - stride * cycle, lift: 0, toe: 0 };
        }
        var swingDuration = 1 - stance;
        var t = (cycle - stance) / swingDuration;
        var arc = t * (1 - t);
        var forward = t * t * (3 - 2 * t);
        // Match the stance velocity at lift-off and touchdown.
        var x = (2 * forward - 1) * contactX - stride * swingDuration * arc * (1 - 2 * t);
        var lift = liftHeight * arc * (1 - 0.42 * t);
        return { x: x, lift: lift, toe: lift * (0.32 - 0.44 * t) };
    }

    function drawVectorCharacter(g, isGuard, cx, baseY, sc, dir, mode, phase, hasGold, pal) {
        var d = dir >= 0 ? 1 : -1;
        var s = Math.sin(phase);
        var c = Math.cos(phase);
        var bob = 0;
        var lean = 0;
        var recoil = 0;
        var breath = mode === "idle" ? s * 0.35 * sc : 0;
        var runCycle = phase / (2 * Math.PI);
        runCycle -= Math.floor(runCycle);
        var stance = isGuard ? GUARD_STANCE : RUNNER_STANCE;

        if (mode === "run") {
            // The hips compress over the supporting foot and rise before the next contact.
            bob = -Math.cos((runCycle - stance * 0.5) * 4 * Math.PI) * (isGuard ? 0.95 : 1.15) * sc;
            lean = d * (isGuard ? 2.65 : 3.05) * sc;
        } else if (mode === "dig") {
            recoil = Math.max(0, 1 - phase * 2.5) * sc;
            bob = -1.2 * sc;
            lean = d * (1.8 * sc - recoil);
        } else if (mode === "rope") {
            bob = -4.9 * sc + Math.abs(s) * 0.7 * sc;
            lean = d * (0.6 + c * 0.65) * sc;
        } else if (mode === "fall") {
            bob = 0.7 * sc;
            lean = -d * 1.3 * sc + s * 0.35 * sc;
        } else if (mode === "land") {
            var landS = Math.sin(Math.min(1, Math.max(0, phase)) * Math.PI);
            bob = -landS * 2.2 * sc;
            lean = d * landS * 1.4 * sc;
        } else if (mode === "trapped") {
            bob = (-2.0 + Math.abs(s) * 0.8) * sc;
        } else {
            bob = breath;
        }

        var footY = baseY - 0.9 * sc;
        var hipY = baseY - 9.1 * sc - bob;
        var waistY = baseY - 11.2 * sc - bob;
        var shY = baseY - 14.9 * sc - bob;
        var headY = baseY - 18.15 * sc - bob;
        if (mode === "rope") {
            hipY -= 1.5 * sc;
            waistY -= 0.65 * sc;
        } else if (mode === "idle") {
            hipY -= 0.45 * sc;
        }

        var hipX = cx + lean * 0.25;
        var waistX = cx + lean * 0.62;
        var shX = cx + lean;
        var headX = cx + lean * 1.15;

        var thighL = 4.4 * sc;
        var shinL = 4.4 * sc;
        var uArmL = 3.1 * sc;
        var fArmL = 2.9 * sc;

        var thighR = (isGuard ? 1.38 : 1.12) * sc;
        var shinR = (isGuard ? 1.12 : 0.88) * sc;
        var uArmR = (isGuard ? 1.22 : 0.92) * sc;
        var fArmR = (isGuard ? 0.98 : 0.76) * sc;
        var handR = 0.88 * sc;
        var facingBack = mode === "ladder";

        // Default idle pose: poised stance, subtle breathing sway
        var bFootX = hipX - d * 1.65 * sc;
        var bFootY = footY;
        var fFootX = hipX + d * 1.75 * sc;
        var fFootY = footY;
        var bHandX = shX - d * (1.25 + breath * 0.4) * sc;
        var bHandY = hipY + 0.4 * sc - breath * 0.5;
        var fHandX = shX + d * (1.45 - breath * 0.4) * sc;
        var fHandY = hipY + 0.4 * sc - breath * 0.5;
        var bToeDrop = 0;
        var fToeDrop = 0;
        var kneeBendX = d;
        var kneeBendY = -0.2;
        var elbowBendX = -d;
        var elbowBendY = 0.25;

        if (mode === "run") {
            var stride = isGuard ? GUARD_STRIDE_PX : RUNNER_STRIDE_PX;
            var liftHeight = isGuard ? 21 : 25;
            var rear = sampleRunningFoot((runCycle + 0.5) % 1, stride, stance, liftHeight);
            var front = sampleRunningFoot(runCycle, stride, stance, liftHeight);
            bFootX = cx + d * rear.x * sc;
            bFootY = footY - rear.lift * sc;
            fFootX = cx + d * front.x * sc;
            fFootY = footY - front.lift * sc;
            bToeDrop = rear.toe * sc;
            fToeDrop = front.toe * sc;
            // Sprinter arm pump: front hand drives up to chest, back hand drives behind hip
            var bArmF = Math.cos(phase - stance * Math.PI) * (isGuard ? 0.82 : 1);
            var fArmF = -bArmF;
            bHandX = shX + d * (bArmF > 0 ? bArmF * 3.5 : bArmF * 3.1) * sc;
            bHandY = shY + (2.8 - bArmF * 2.4) * sc;
            fHandX = shX + d * (fArmF > 0 ? fArmF * 3.5 : fArmF * 3.1) * sc;
            fHandY = shY + (2.8 - fArmF * 2.4) * sc;
            kneeBendX = d;
            kneeBendY = -0.35;
            elbowBendX = -d;
            elbowBendY = 0.7;
        } else if (mode === "ladder") {
            var climb = s;
            bFootX = hipX - 2.6 * sc;
            fFootX = hipX + 2.6 * sc;
            bFootY = footY - (0.45 + 0.55 * climb) * 3.3 * sc;
            fFootY = footY - (0.45 - 0.55 * climb) * 3.3 * sc;
            bHandX = shX - 3.7 * sc;
            fHandX = shX + 3.7 * sc;
            bHandY = shY - 2.1 * sc - climb * 2.3 * sc;
            fHandY = shY - 2.1 * sc + climb * 2.3 * sc;
            kneeBendX = 0;
            kneeBendY = -1;
            elbowBendX = 0;
            elbowBendY = 1;
        } else if (mode === "rope") {
            var ropeY = baseY - 15.8 * sc;
            bHandX = cx + d * (-1.7 - c * 3.2) * sc;
            fHandX = cx + d * (1.7 + c * 3.2) * sc;
            bHandY = ropeY + Math.max(0, s) * 2.4 * sc;
            fHandY = ropeY + Math.max(0, -s) * 2.4 * sc;
            bFootX = hipX - d * (2.5 + c * 2.1) * sc;
            fFootX = hipX - d * (0.7 + c * 2.1) * sc;
            bFootY = footY - (1.2 + Math.max(0, s) * 1.9) * sc;
            fFootY = footY - (0.7 + Math.max(0, -s) * 1.9) * sc;
            bToeDrop = 0.75 * sc;
            fToeDrop = 0.75 * sc;
            kneeBendX = d;
            kneeBendY = -0.35;
            elbowBendX = -d;
            elbowBendY = 0.55;
        } else if (mode === "fall") {
            // Composed braced air silhouette: knees tucked asymmetrically, bent arms balancing
            bHandX = shX - d * 2.9 * sc + c * 0.9 * sc;
            fHandX = shX + d * 3.2 * sc - c * 0.9 * sc;
            bHandY = shY - 2.9 * sc + s * 1.1 * sc;
            fHandY = shY - 2.9 * sc - s * 1.1 * sc;
            bFootX = hipX - d * (1.4 + s * 0.7) * sc;
            fFootX = hipX + d * (2.5 - s * 0.7) * sc;
            bFootY = footY - (2.8 + Math.max(0, s) * 1.1) * sc;
            fFootY = footY - (1.7 + Math.max(0, -s) * 1.1) * sc;
            bToeDrop = 0.9 * sc;
            fToeDrop = 0.9 * sc;
            kneeBendX = d;
            kneeBendY = -0.45;
            elbowBendX = 0;
            elbowBendY = 0.75;
        } else if (mode === "land") {
            bFootX = hipX - d * 2.2 * sc;
            fFootX = hipX + d * 2.3 * sc;
            bHandX = shX - d * 2.4 * sc;
            fHandX = shX + d * 2.6 * sc;
            bHandY = waistY + 0.6 * sc;
            fHandY = waistY + 0.4 * sc;
            kneeBendX = d;
            kneeBendY = -0.45;
            elbowBendX = -d;
            elbowBendY = 0.5;
        } else if (mode === "dig") {
            bFootX = hipX - d * 3.4 * sc;
            fFootX = hipX + d * 2.9 * sc;
            bHandX = shX - d * 2.6 * sc;
            bHandY = waistY + 0.8 * sc;
            fHandX = shX + d * (4.7 * sc - recoil);
            fHandY = shY + 2.0 * sc - recoil;
            kneeBendX = d;
            kneeBendY = -0.35;
        } else if (mode === "trapped") {
            bFootX = hipX - 2.5 * sc;
            fFootX = hipX + 2.5 * sc;
            bFootY = footY - 2.2 * sc;
            fFootY = bFootY;
            bHandX = shX - 4.4 * sc;
            fHandX = shX + 4.4 * sc;
            bHandY = shY - (1.4 + s * 0.9) * sc;
            fHandY = shY - (1.4 - s * 0.9) * sc;
            elbowBendX = 0;
            elbowBendY = 0.9;
        }

        // Spread the joint anchors across the pelvis and shoulders.
        var hipOffset = (facingBack ? 1.1 : d * 0.62) * sc;
        var shoulderOffset = (facingBack ? 1.7 : d * 0.85) * sc;
        var bHipX = hipX - hipOffset;
        var fHipX = hipX + hipOffset;
        var bShoulderX = shX - shoulderOffset;
        var fShoulderX = shX + shoulderOffset;
        var bKnee = solveJoint(
            bHipX, hipY, bFootX, bFootY, thighL, shinL,
            mode === "ladder" ? -1 : kneeBendX, kneeBendY
        );
        var fKnee = solveJoint(
            fHipX, hipY, fFootX, fFootY, thighL, shinL,
            mode === "ladder" ? 1 : kneeBendX, kneeBendY
        );
        var bElbow = solveJoint(
            bShoulderX, shY, bHandX, bHandY, uArmL, fArmL,
            mode === "ladder" ? -1 : elbowBendX, elbowBendY
        );
        var fElbow = solveJoint(
            fShoulderX, shY, fHandX, fHandY, uArmL, fArmL,
            mode === "ladder" ? 1 : elbowBendX, elbowBendY
        );

        // Back leg + boot
        fillCapsule(g, bHipX, hipY, bKnee[0], bKnee[1], thighR, pal.legShade);
        fillCharacterSegment(g, bKnee[0], bKnee[1], bFootX, bFootY, shinR, shinR * 0.66, pal.legShade);
        drawCharacterBoot(g, bFootX, bFootY, sc, facingBack ? -1 : d, bToeDrop, pal.bootShade);

        // Back arm + hand
        fillCapsule(g, bShoulderX, shY, bElbow[0], bElbow[1], uArmR, pal.armShade);
        fillCharacterSegment(g, bElbow[0], bElbow[1], bHandX, bHandY, fArmR, fArmR * 0.64, pal.armShade);
        fillBatchCircles(g, [[bHandX, bHandY, handR]], pal.skinShade);

        // One silhouette for the chest, waist and pelvis.
        var chest = (isGuard ? 2.85 : 2.25) * sc;
        var waist = (isGuard ? 1.8 : 1.52) * sc;
        fillCharacterShape(g, hipX, hipY, 1, 1, [
            shX - hipX - chest * 0.65, shY - hipY - 0.85 * sc,
            shX - hipX + chest * 0.65, shY - hipY - 0.85 * sc,
            shX - hipX + chest, shY - hipY + 0.65 * sc,
            waistX - hipX + waist, waistY - hipY,
            waist + 0.2 * sc, 0.45 * sc, -waist - 0.2 * sc, 0.45 * sc,
            waistX - hipX - waist, waistY - hipY,
            shX - hipX - chest, shY - hipY + 0.65 * sc
        ], pal.torso);
        fillCapsule(g, hipX - waist * 0.88, hipY - 0.5 * sc, hipX + waist * 0.88, hipY - 0.5 * sc, 0.42 * sc, pal.belt);

        // Front leg + boot
        fillCapsule(g, fHipX, hipY, fKnee[0], fKnee[1], thighR, pal.leg);
        fillCharacterSegment(g, fKnee[0], fKnee[1], fFootX, fFootY, shinR, shinR * 0.66, pal.leg);
        drawCharacterBoot(g, fFootX, fFootY, sc, facingBack ? 1 : d, fToeDrop, pal.boot);

        // Neck + head (skin tone)
        fillCapsule(g, shX, shY - 0.5 * sc, headX, headY + 1.05 * sc, 0.78 * sc, pal.skinShade);

        // Helmet / cap & face eye
        var face = facingBack
            ? [-1.6, -1.25, 1.6, -1.25, 1.55, 0.85, 0.85, 1.55, -0.85, 1.55, -1.55, 0.85]
            : [-1.55, -1.35, 1.35, -1.35, 1.65, -0.35, 2.12, 0.24, 1.53, 0.55, 1.3, 1.45, 0.52, 1.8, -1.08, 1.36, -1.6, 0.35];
        fillCharacterShape(g, headX, headY, sc, d, face, pal.skin);
        fillCharacterShape(g, headX, headY, sc, d, [
            -2.05, -0.75, -2.0, -2.0, -1.22, -2.85, 0.85, -2.85,
            1.9, -2.17, 2.14, -1.04, 1.5, -0.77, -1.47, -0.67
        ], pal.cap);
        if (!facingBack) {
            fillCapsule(g, headX + d * 0.95 * sc, headY - 0.95 * sc,
                headX + d * 2.7 * sc, headY - 0.95 * sc, 0.35 * sc, pal.visor);
            fillBatchCircles(g, [[headX + d * 1.1 * sc, headY - 0.12 * sc, 0.33 * sc]], pal.eye);
        }

        // Chest lamp + tactical hip canister mark the runner; gold pack marks guarding thief
        if (!isGuard) {
            fillBatchCircles(g, [[shX + (mode === "ladder" ? 0 : d * 1.05 * sc), shY + 1.3 * sc, 0.78 * sc]], pal.cap);
            if (mode !== "ladder") {
                fillBatchCircles(g, [[waistX - d * 1.1 * sc, hipY - 0.45 * sc, 0.7 * sc]], pal.cap);
            }
        }
        if (isGuard && hasGold) {
            fillCapsule(
                g,
                shX - d * 2.4 * sc, shY + 0.6 * sc,
                waistX - d * 2.4 * sc, waistY + 0.2 * sc,
                1.45 * sc, pal.gold
            );
        }

        // Front arm + hand (+ dig blaster)
        fillCapsule(g, fShoulderX, shY, fElbow[0], fElbow[1], uArmR, pal.arm);
        fillCharacterSegment(g, fElbow[0], fElbow[1], fHandX, fHandY, fArmR, fArmR * 0.64, pal.arm);
        fillBatchCircles(g, [[fHandX, fHandY, handR]], pal.skin);
        if (mode === "dig") {
            var muzzleX = fHandX + d * (3.1 * sc - recoil);
            var muzzleY = fHandY + 1.2 * sc - recoil;
            fillCapsule(
                g,
                fHandX, fHandY,
                muzzleX, muzzleY,
                0.8 * sc, pal.cap
            );
            return [muzzleX, muzzleY];
        }
    }



    function drawSceneUnsafe(g) {
        var backB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.back, 1));
        var brickB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.brick, 1));
        var concB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.solid, 1));
        var concDarkB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.solidDark, 1));
        var ladderB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.ladder, 1));
        var ladderDarkB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.ladderDark, 1));
        var ropeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.rope, 1));
        var goldOrgB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.goldOrange, 1));
        var goldWhtB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.goldWhite, 1));
        var holeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.hole, 1));
        var hudB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.hudCyan, 1));
        var whiteB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.player, 1));
        var whiteShadeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([186, 198, 216], 1));
        var orangeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.guardBody, 1));
        var orangeShadeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([186, 72, 0], 1));
        var cyanB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.digBeam, 1));
        var redB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(PAL.guardRedHat, 1));
        var skinB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([244, 198, 166], 1));
        var skinShadeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([204, 152, 120], 1));
        var bootB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([56, 68, 86], 1));
        var bootShadeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([36, 44, 58], 1));
        var beltB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([44, 54, 70], 1));
        var eyeB = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm([20, 26, 36], 1));
        var runnerPal = {
            skin: skinB,
            skinShade: skinShadeB,
            torso: whiteB,
            arm: whiteB,
            armShade: whiteShadeB,
            leg: whiteB,
            legShade: whiteShadeB,
            boot: bootB,
            bootShade: bootShadeB,
            belt: beltB,
            eye: eyeB,
            cap: cyanB,
            visor: cyanB,
            gold: goldOrgB
        };
        var guardPalNormal = {
            skin: skinB,
            skinShade: skinShadeB,
            torso: orangeB,
            arm: orangeB,
            armShade: orangeShadeB,
            leg: whiteB,
            legShade: whiteShadeB,
            boot: bootB,
            bootShade: bootShadeB,
            belt: beltB,
            eye: eyeB,
            cap: orangeB,
            visor: orangeShadeB,
            gold: goldOrgB
        };
        var guardPalGold = {
            skin: skinB,
            skinShade: skinShadeB,
            torso: orangeB,
            arm: orangeB,
            armShade: orangeShadeB,
            leg: whiteB,
            legShade: whiteShadeB,
            boot: bootB,
            bootShade: bootShadeB,
            belt: beltB,
            eye: eyeB,
            cap: redB,
            visor: redB,
            gold: goldOrgB
        };

        // Screen background
        fillRoundRect(g, 0, 0, CANVAS_W, CANVAS_H, 0, backB);

        var bricks = [];
        var concrete = [], concreteTops = [];
        var ladders = [], ladderRungs = [], ropes = [];
        var goldOrange = [], goldWhite = [];
        var holesRects = [];
        var whiteSprites = [];
        var orangeSprites = [];
        var cyanSprites = [];
        var redSprites = [];

        for (var cy = 0; cy < ROWS; cy++) {
            for (var cx = 0; cx < COLS; cx++) {
                var ch = grid[cy][cx];
                if (ch === " ") continue;
                var x = cx * TILE, y = cy * TILE;

                // Authentic Apple II running-bond blue bricks with black mortar:
                if (ch === "#" || ch === "X") {
                    // Course 1 (y: 0..10, height 10, seam at x+16..18)
                    bricks.push([x, y, 16, 10]);
                    bricks.push([x + 18, y, 6, 10]);
                    // Course 2 (y: 12..22, height 10, seam at x+4..6)
                    bricks.push([x, y + 12, 4, 10]);
                    bricks.push([x + 6, y + 12, 18, 10]);
                } else if (ch === "=") {
                    concrete.push([x, y, TILE, TILE]);
                    concreteTops.push([x, y, TILE, 3]);
                } else if (ch === "H" || (exitOpen && ch === "S")) {
                    // White ladder: vertical rails + 2 rungs per brick layer (authentic Apple II, exactly equal 10px spacing)
                    ladders.push([x + 4, y, 2, TILE]);
                    ladders.push([x + TILE - 6, y, 2, TILE]);
                    ladderRungs.push([x + 4, y + 5, TILE - 8, 2]);
                    ladderRungs.push([x + 4, y + 17, TILE - 8, 2]);
                } else if (ch === "-") {
                    // Thin white horizontal bar/rope
                    ropes.push([x, y + 7, TILE, 2]);
                } else if (ch === "$") {
                    // Apple II striped gold chest: white/orange/white/orange/white
                    goldWhite.push([x + 6, y + 12, 12, 2]);
                    goldOrange.push([x + 6, y + 14, 12, 2]);
                    goldWhite.push([x + 6, y + 16, 12, 2]);
                    goldOrange.push([x + 6, y + 18, 12, 2]);
                    goldWhite.push([x + 6, y + 20, 12, 2]);
                } else if (ch === "o") {
                    var holeLife = HOLE_MS;
                    var holeDig = 0;
                    for (var hi = 0; hi < holes.length; hi++) {
                        if (holes[hi].cx === cx && holes[hi].cy === cy) {
                            holeLife = holes[hi].life;
                            holeDig = holes[hi].digTime || 0;
                            break;
                        }
                    }
                    if (holeDig > 0) {
                        // Actively being disintegrated by laser beam:
                        var digProg = 1 - (holeDig / DIG_SWING_MS);
                        holesRects.push([x, y, TILE, TILE]); // black pit background
                        if (digProg < 0.45) {
                            // Stage 1: Top course crumbling, bottom course intact
                            bricks.push([x, y, 6, 8]);
                            bricks.push([x + 18, y, 6, 8]);
                            bricks.push([x, y + 12, 4, 10]);
                            bricks.push([x + 6, y + 12, 18, 10]);
                            cyanSprites.push([x + 8, y + 2, 4, 3]);
                            orangeSprites.push([x + 13, y + 4, 3, 3]);
                        } else if (digProg < 0.85) {
                            // Stage 2: Top course gone, bottom course crumbling
                            bricks.push([x, y + 16, 4, 6]);
                            bricks.push([x + 6, y + 16, 18, 6]);
                            cyanSprites.push([x + 9, y + 13, 5, 3]);
                            orangeSprites.push([x + 14, y + 15, 3, 2]);
                        } else {
                            // Stage 3: Fully open pit, a few lingering sparks
                            cyanSprites.push([x + 11, y + 18, 2, 2]);
                        }
                    } else if (holeLife <= 700) {
                        // Almost completely refilled: both brick courses appear
                        bricks.push([x, y, 16, 10]);
                        bricks.push([x + 18, y, 6, 10]);
                        bricks.push([x, y + 12, 4, 10]);
                        bricks.push([x + 6, y + 12, 18, 10]);
                    } else if (holeLife <= 1500) {
                        // Halfway refilled: bottom brick course appears
                        bricks.push([x, y + 12, 4, 10]);
                        bricks.push([x + 6, y + 12, 18, 10]);
                    } else {
                        // Open hole: dark pit
                        holesRects.push([x, y, TILE, TILE]);
                    }
                }
            }
        }

        // Ground separator line right below playfield (authentic Apple II)
        bricks.push([0, PLAY_H, CANVAS_W, 2]);

        // Batch fills for level geometry
        fillBatchRects(g, bricks, 0, brickB);
        fillBatchRects(g, concrete, 0, concB);
        fillBatchRects(g, concreteTops, 0, concDarkB);
        fillBatchRects(g, ladders, 0, ladderB);
        fillBatchRects(g, ladderRungs, 0, ladderB);
        fillBatchRects(g, ropes, 0, ropeB);
        fillBatchRects(g, holesRects, 0, holeB);
        fillBatchRects(g, goldOrange, 0, goldOrgB);
        fillBatchRects(g, goldWhite, 0, goldWhtB);

        // 1. Runner vector character
        var pPose = getCharacterPose(player, true);
        var pCx = player.px + TILE * 0.5 + pPose.shakeX;
        var pBaseY = player.py + TILE - 1 + (player.inHole > 0 ? 4 : 0);
        var muzzle = drawVectorCharacter(g, false, pCx, pBaseY, 1, pPose.dir, pPose.mode, pPose.phase, false, runnerPal);

        // Digging beam & sparks (authentic Apple II diagonal laser ray)
        if (muzzle) {
            var targetCx = player.cx + player.digDir;
            var targetCy = player.cy + 1;
            var gunX = muzzle[0];
            var gunY = muzzle[1];
            var hitX = targetCx * TILE + (player.digDir > 0 ? 8 : 16);
            var hitY = targetCy * TILE + 4;

            // Diagonal laser beam sparks (2x2 points along trajectory)
            var beamDots = 7;
            for (var bi = 1; bi <= beamDots; bi++) {
                var bt = bi / beamDots;
                var bx = Math.round(gunX + bt * (hitX - gunX));
                var by = Math.round(gunY + bt * (hitY - gunY));
                if (bi % 2 === 0) {
                    cyanSprites.push([bx - 1, by - 1, 2, 2]);
                } else {
                    orangeSprites.push([bx - 1, by - 1, 2, 2]);
                }
            }
            // Muzzle flash at gun tip
            cyanSprites.push([gunX - 1, gunY - 1, 3, 2]);
            // Impact blast sparks at target surface
            cyanSprites.push([hitX - 2, hitY - 1, 5, 2]);
            orangeSprites.push([hitX - 1, hitY + 1, 3, 2]);
        }

        // 2. Enemies / Guards
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (e.dead > 0) continue;
            var ePose = getCharacterPose(e, false);
            var eCx = e.px + TILE * 0.5 + ePose.shakeX;
            var eBaseY = e.py + TILE - 1 + (e.inHole > 0 ? 4 : 0);
            drawVectorCharacter(
                g, true, eCx, eBaseY, 1, ePose.dir, ePose.mode, ePose.phase,
                e.hasGold, e.hasGold ? guardPalGold : guardPalNormal
            );
        }

        // Bottom retro HUD bar (authentic Apple II colors and fonts)
        var hudY = PLAY_H + 4;
        var hudOrangeRects = [];
        var hudCyanRects = [];

        // 1. Gold chest icon + 6-digit score in orange
        var gIcon = [
            [16, hudY + 4, 12, 3],
            [16, hudY + 7, 12, 2],
            [16, hudY + 9, 12, 3]
        ];
        fillBatchRects(g, [gIcon[0], gIcon[2]], 0, goldOrgB);
        fillBatchRects(g, [gIcon[1]], 0, goldWhtB);
        appendRetroText(hudOrangeRects, padNum(score, 6), 34, hudY + 3, 2.2);

        // 2. Runner icon in HUD + lives in orange
        drawVectorCharacter(g, false, 198, hudY + 19, 0.78, 1, "idle", 0.25, false, runnerPal);
        appendRetroText(hudOrangeRects, padNum(lives, 3), 212, hudY + 3, 2.2);

        // 3. TIME label in cyan + elapsed time in orange
        appendRetroText(hudCyanRects, "TIME ", 340, hudY + 3, 2.2);
        appendRetroText(hudOrangeRects, padNum(Math.floor(levelTime), 3), 405, hudY + 3, 2.2);

        // 4. LEVEL label in cyan + level number in orange
        appendRetroText(hudCyanRects, "LEVEL ", 510, hudY + 3, 2.2);
        appendRetroText(hudOrangeRects, padNum(levelIndex + 1, 3), 590, hudY + 3, 2.2);

        // Batch fills for all character sprites + HUD
        fillBatchRects(g, whiteSprites, 0, whiteB);
        fillBatchRects(g, orangeSprites, 0, orangeB);
        fillBatchRects(g, cyanSprites, 0, cyanB);
        fillBatchRects(g, redSprites, 0, redB);
        fillBatchRects(g, hudCyanRects, 0, cyanB);
        fillBatchRects(g, hudOrangeRects, 0, orangeB);

        // Dark overlay on dead / pause
        if (gameState === "dead" || gameState === "over" || paused) {
            var ovB = g.newBrush(g.BrushType.SOLID_COLOR, [0.05, 0.04, 0.06, 0.60]);
            fillRoundRect(g, 0, 0, CANVAS_W, CANVAS_H, 0, ovB);
        }
    }

    // ------------------------------------------------------------------ ui

    var gameCanvas, hudStatus;
    var lastStatus = "";

    function padNum(n, len) {
        var s = String(Math.max(0, n));
        while (s.length < len) s = "0" + s;
        return s;
    }

    function updateHud() {
        var status;
        if (paused) status = tr("statusPause");
        else if (gameState === "clear") status = tr("statusClear");
        else if (gameState === "over") status = tr("statusOver");
        else if (gameState === "dead") status = tr("statusDead", [Math.max(0, lives)]);
        else status = tr("statusPlay");
        if (status !== lastStatus) { lastStatus = status; hudStatus.text = status; }
    }

    function refreshUI() {
        var pf0 = perfNow();
        updateHud();
        var pf1 = perfNow();
        try { gameCanvas.hide(); gameCanvas.show(); } catch (e) {}
        var pf2 = perfNow();
        try { gameCanvas.notify("onDraw"); } catch (e2) {}
        perfFrame(pf1 - pf0, pf2 - pf1, perfNow() - pf2);
    }

    // ---------------------------------------------------------------- loop

    var lastTick = new Date().getTime();
    var lastRender = 0;
    var tickCount = 0, tickMark = 0;

    function gameTick() {
        try {
            var now = new Date().getTime();
            var dt = now - lastTick;
            lastTick = now;
            if (dt < 0) dt = 0;
            if (dt > 120) dt = 120;

            tickCount++;
            if (tickMark === 0) tickMark = now;
            if (now - tickMark >= 1000) {
                perfNote("ticks/s=" + Math.round(tickCount * 1000 / (now - tickMark)));
                tickCount = 0;
                tickMark = now;
            }

            dropStaleKeys();
            update(dt);

            if (now - lastRender >= 12) {
                lastRender = now;
                refreshUI();
            }
        } catch (err) {
            perfNote("tick error: " + ((err && err.message) ? err.message : err));
        }
    }

    // -------------------------------------------------------------- window

    loadSettings();
    startGame();

    var win = new Window("dialog", WIN_TITLE);
    win.orientation = "column";
    win.alignChildren = ["center", "top"];
    win.spacing = 6;
    win.margins = 10;

    gameCanvas = win.add("group");
    gameCanvas.preferredSize = [CANVAS_W, CANVAS_H];
    gameCanvas.minimumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.maximumSize = [CANVAS_W, CANVAS_H];
    gameCanvas.onDraw = function () { drawScene(this.graphics); };

    hudStatus = win.add("statictext", undefined, "");
    hudStatus.preferredSize = [CANVAS_W, 16];

    var btnRow = win.add("group");
    btnRow.orientation = "row";
    btnRow.submit = true;
    var btnLang = btnRow.add("button", undefined, "Lang: EN");
    btnLang.preferredSize = [90, 24];
    var btnRestart = btnRow.add("button", undefined, "Restart (R)");
    btnRestart.preferredSize = [110, 24];
    var btnClose = btnRow.add("button", undefined, "Close (Esc)", { name: "cancel" });
    btnClose.preferredSize = [110, 24];

    function isGameKey(k) {
        return k === "LEFT" || k === "RIGHT" || k === "UP" || k === "DOWN" ||
               k === "A" || k === "D" || k === "W" || k === "S" ||
               k === "Z" || k === "X";
    }

    function handleKeyDown(ev) {
        perfKey();
        var k = ev.keyName ? String(ev.keyName).toUpperCase() : "";
        if (k === "F15") { ev.preventDefault(); gameTick(); return; }
        if (k === "R") { ev.preventDefault(); startGame(); refreshUI(); return; }
        if (k === "P") {
            ev.preventDefault();
            paused = !paused;
            keys = {};
            lastKeyAt = {};
            refreshUI();
            return;
        }
        if (k === "Z") {
            ev.preventDefault();
            if (player.moving) {
                player.pendingDig = -1;
            } else {
                dig(-1);
            }
            return;
        }
        if (k === "X") {
            ev.preventDefault();
            if (player.moving) {
                player.pendingDig = 1;
            } else {
                dig(1);
            }
            return;
        }
        if (!isGameKey(k)) return;
        ev.preventDefault();
        setKey(k, true);
    }

    function handleKeyUp(ev) {
        var k = ev.keyName ? String(ev.keyName).toUpperCase() : "";
        if (!isGameKey(k)) return;
        ev.preventDefault();
        setKey(k, false);
    }

    function applyLang() {
        btnLang.text = tr("btnLang", [I18N[currentLang].langName]);
        btnRestart.text = tr("btnRestart");
        btnClose.text = tr("btnClose");
        lastStatus = "";
        refreshUI();
    }

    btnLang.onClick = function () {
        var i = 0;
        for (var k = 0; k < LANGS.length; k++) if (LANGS[k] === currentLang) i = k;
        currentLang = LANGS[(i + 1) % LANGS.length];
        saveSettings();
        applyLang();
    };

    btnRestart.onClick = function () { startGame(); refreshUI(); };
    btnClose.onClick = function () { heartbeatStop(); win.close(); };

    var focusTargets = [win, btnLang, btnRestart, btnClose];
    for (var fi = 0; fi < focusTargets.length; fi++) {
        focusTargets[fi].addEventListener("keydown", handleKeyDown);
        focusTargets[fi].addEventListener("keyup", handleKeyUp);
    }

    win.addEventListener("mousemove", function () { gameTick(); });
    gameCanvas.addEventListener("mousemove", function () { gameTick(); });

    win.onShow = function () {
        lastTick = new Date().getTime();
        if (!heartbeatStart(HB)) {
            perfNote("heartbeat FAILED: " + heartbeatLastError());
            hudStatus.text = tr("statusNoHeartbeat");
            lastStatus = hudStatus.text;
        } else {
            perfNote("heartbeat started, tickMs=" + HB.tickMs);
        }
        applyLang();
        try { btnClose.active = true; } catch (e) {}
        refreshUI();
    };

    win.onClose = function () {
        perfClose();
        heartbeatStop();
    };

    perfInit({
        token: "LodeRunner",
        canvases: 1,
        canvasW: CANVAS_W,
        canvasH: CANVAS_H,
        tickMs: HB.tickMs,
        theme: "dark",
        lang: "en"
    });

    win.center();
    win.show();
    heartbeatStop();
})();
