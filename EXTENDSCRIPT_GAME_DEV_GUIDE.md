# Developing Arcade and Puzzle Games with ExtendScript (`.jsx`) for Adobe Illustrator

This practical guide distills engineering and game-design experience from creating a series of games for **Adobe Illustrator** on top of **ExtendScript + ScriptUI**:
- **Pantone 2048 C** (`2048.jsx`) — a turn-based puzzle with swipes and vector typography
- **Tetris** (`Tetris.jsx`) — a classic 10×20 well, 7-bag randomizer, Hold/Next, Ghost Piece
- **Arkanoid** (`Arkanoid.jsx`) — bounce physics with continuous coordinates, 5 bonus capsule types, lasers
- **Snake** (`Snake.jsx`) — a snake with a gradient body, a turn queue, and 3 arena modes
- **Space Invaders** (`SpaceInvaders.jsx`) — a 5×9 alien formation with two-frame animation, destructible bunkers, and a UFO
- **Boulder Dash** (`BoulderDash.jsx`) — grid-based gravity for boulders and diamonds, underground-monster AI, and 5 caves
- **Pac-Man** (`PacMan.jsx`) — a 19×21 maze, 4 ghosts with distinct personalities, and a "frightened" mode
- **Lode Runner**, **Xonix**, **Bomberman** and **Battle City** add digging, territory capture, chain reactions and destructible terrain.
- **Sokoban** combines solver-verified puzzles, click-to-walk, Undo and independent move and push records.

The document is written for a developer who wants to build their own interactive games or complex graphics applications inside Illustrator without running into the platform's specific pitfalls.

---

## 0. Project Structure

```
lib/
  GameCore.jsx        # color, rounded corners, capsules, arcs, glyph run, makeRGBColor
  GameHeartbeat.jsx   # autonomous Win32Heartbeat loop (Windows)
  GamePersist.jsx     # key=value in Folder.userData
  GameI18n.jsx        # {0} substitution
  GameAnim.jsx        # grid movement interpolation
  GamePerf.jsx        # frame log in %TEMP%\relax_log_<Game>.txt
tools/
  check.js            # static check: #include, syntax, ES3 gate, encoding, i18n
  test-core.js        # run lib/ in a sandbox (geometry, i18n, heartbeat)
  make-standalone.js  # generate single-file bundles
  migrate.js          # mechanical edits (remove functions, insert #include)
Play Arcade.jsx       # launcher: menu of all games, hotkeys 1-9, 0, A, B, Random, Docs, Logs, Folder
2048.jsx … Sokoban.jsx # the games themselves
standalone/           # generated single-file scripts
EXTENDSCRIPT_GAME_DEV_GUIDE.md
README.md
TESTING.md
AGENTS.md
```

A game entry script follows this pattern. Include the modules it uses.

```javascript
#target illustrator
#include "lib/GameCore.jsx"
#include "lib/GameHeartbeat.jsx"   // real-time games only
#include "lib/GameI18n.jsx"
#include "lib/GamePersist.jsx"

(function () {
    // ... all game logic, local state, and glyphs
})();
```

Rules without which this does not work:
1. The `#include` directive must be **the first character of the line**, before any code. The path is relative to the including file.
2. **Encoding.** Illustrator reads a `.jsx` file without a BOM as Windows-1252. Therefore:
   - the **entry point** (`2048.jsx`, `Tetris.jsx`, `Play Arcade.jsx`, …) — UTF-8 **with BOM** (`EF BB BF`) if the file contains even one non-ASCII character (arrows `◄►`, `•`, `Čeština`, `हिन्दी`);
   - **included files** (`lib/*.jsx`) — **ASCII-only and without a BOM**: their text is inserted into the middle of the script, and a BOM would end up in the middle of the code.
   - Check and auto-fix: `node tools/check.js --fix`.
3. Core functions are global (like `dev/lib/Utils.jsx`), so call sites in games stay short. The flip side: **a global function cannot see a game's local functions** — see §3.2.
4. Games do not reference one another and do not share state: each inclusion of `lib/` produces its own instance of the functions.

Launch: `File > Scripts > Other Script…` → `Play Arcade.jsx` (menu of all games) or directly the file of the desired game.
Check: `node tools/check.js` and `node tools/test-core.js` (see §8).

### 0.1. The Launcher and Why It Builds a "Bundle"

`Play Arcade.jsx` does not rely on `$.evalFile()` being able to handle `#include` (this behavior is undocumented anywhere). It reads the `.jsx`, recursively replaces `#include "…"` with the contents of the files, strips `#target`, writes a single temporary script to `Folder.temp`, and runs it via `$.evalFile()`. After a successful launch the temporary file is deleted; on error it is left behind for debugging. A side benefit: the same method can produce a standalone `.jsx` to hand to a colleague.

---

### 0.2. Checklist for Adding a Game

1. Choose the update model. A turn-based game can update on input. For autonomous motion, use elapsed time for the simulation and heartbeat for Windows wake-ups.
2. Create an ES3 entry script with its own IIFE. Reuse shared drawing, localization, persistence and timing helpers as needed. Keep the game's rules, palette and glyphs in the entry script.
3. Add the game to `Play Arcade.jsx` and `tools/make-standalone.js`. Document its controls. Regenerate both bundles with `node tools/make-standalone.js "<Game>.jsx"` and `node tools/make-standalone.js "Play Arcade.jsx"`.
4. Run `node tools/check.js`, `node tools/test-core.js` and any game-specific headless tests. Include coverage of `onShow` and `onClose` if the gameplay tests return before creating the dialog.
5. In Illustrator, smoke-test the direct script, launcher and standalone entry points. Check input, themes, languages, both close paths, relaunch and export in a scratch document. For heartbeat games, check motion without input and helper cleanup. See [TESTING.md](TESTING.md).

## 1. Environment Features and Limitations of Illustrator ExtendScript

The game loop and window lifecycle depend on four properties of this setup.

1. **The language standard is ECMAScript 3 (ES3, 1999)**:
   - **Not available**: `let`, `const`, arrow functions `() => {}`, template strings, `JSON.parse`/`JSON.stringify`, `Array.prototype.forEach`, `map`, `filter`, `indexOf`, `String.prototype.trim`.
   - **Use**: `var`, classic `for` loops, custom helpers, and an IIFE wrapper `(function () { ... })();` so you do not pollute Illustrator's global namespace.
   - `String.prototype.indexOf` and `Array.prototype.indexOf` are different things: the former is standard, the latter is absent.
2. **No `setInterval`, `setTimeout`, or `requestAnimationFrame`**:
   - The Illustrator ExtendScript setup used here has no native interval API for scheduling these game updates.
3. **Modal window lifecycle.** These games use `new Window("dialog", ...)` to keep the script active while the window is open. Test the lifecycle in the target Illustrator build.
4. **Event-driven updates.** ScriptUI dispatches input and draw events while the dialog is open. Real-time games need a way to wake their update handlers when the player provides no input.

---

## 2. The Main Secret of Real-Time Games: the Autonomous `Win32Heartbeat` Loop

### The Problem
In turn-based games (*2048*), a redraw is needed only when the player makes a move. But in dynamic games (*Tetris, Arkanoid, Snake, Space Invaders, Pac-Man, Boulder Dash*), objects must move on their own. If the game step is tied only to the window's `mousemove`, then as soon as the player releases the mouse, the ball in Arkanoid, the snake, or the falling tetromino **freezes in place**.

### The Solution (implemented in `lib/GameHeartbeat.jsx`)
When the window opens (`win.onShow`), the script generates a micro PowerShell script in the `Folder.temp` folder with an embedded C# class `Win32Heartbeat` (compiled in memory via `Add-Type`) and launches it hidden through `WScript.Shell` (`wscript.exe` with window flag `0` — without a single console flash).

The helper finds the dialog and posts synthetic input at the requested interval. `heartbeatStart(cfg)` reports whether the launcher was dispatched. Confirm actual event delivery after a fresh launch by watching an autonomous game advance without input. Closing the window signals the helper to exit on a subsequent loop check.

**Background behavior.** The helper loop has no visibility gate. Test focus loss and minimization separately and record actual game progress in the target Illustrator build.

At the same time, the tiny cursor shift (`mouse_event`) is performed **only when the game window is focused**: otherwise the pulse would jostle the pointer while you work in another application. The helper continues posting `WM_MOUSEMOVE` and `F15` after focus loss.

Do not add an `IsWindowVisible(hwnd)` guard to `Tick`. It looks like a sensible "pause while minimized" feature, but it silently kills the timer on some ScriptUI windows and the game freezes with no error anywhere — the failures then look like a zombie process with no events.

The game hooks this up with two handlers:

```javascript
var HB = { title: WIN_TITLE, token: "Tetris", tickMs: 40 };   // title = WIN_TITLE of the window

win.onShow = function () {
    applyThemeColors();
    refocusControl();
    if (!heartbeatStart(HB)) {
        setStatus("statusNoHeartbeat");
        refreshUI();
    }
};

win.onClose = function () {
    heartbeatStop();
    // ... save settings/state
};
```

Module API: `heartbeatSupported()`, `heartbeatStart(cfg)`, `heartbeatStop()`, `heartbeatLastError()`.

### Tick Parameters (a single table, not scattered across files)

| Game | `tickMs` | Logic step inside JS | Comment |
|---|---|---|---|
| Arkanoid | 25 | `stepPhysicsOnce()` no more than once per 20 ms | the most sensitive to smoothness |
| Tetris | 40 | clock-based gravity (800→120 ms) | the tick affects only smoothness |
| Snake / PacMan / SpaceInvaders / BoulderDash | 35 | its own interval (60 / 60 / 32 / 155 ms) | the tick is the "wake-up rate" |

For a fixed-step simulation, accumulate elapsed milliseconds and cap the number of updates per wake-up to keep the dialog responsive. For example, after accumulating elapsed time in `acc`, run `for (var steps = 0; acc >= 16.7 && steps < 3; steps++) { step(); acc -= 16.7; }`.

### Timer Resolution and Measured Cadence

In one Windows test, `tickMs: 16` and `tickMs: 25` both produced a period of about 31 ms, and `tickMs: 35` produced about 47 ms. Use the frame log to measure cadence on the target system.

Pass `highRes: true` to request 1 ms timer resolution.

```js
heartbeatStart({ token: "Platformer", title: WIN_TITLE, tickMs: 16, highRes: true });
```

`highRes` defaults to off. Sokoban, Xonix and Battle City opt in. Use elapsed-time updates or an elapsed-time gate before opting in so faster wake-ups do not speed up the rules. The helper pairs `timeBeginPeriod(1)` with `timeEndPeriod(1)` in `finally`. Timer resolution and event delivery both affect the measured frame interval. [Microsoft documentation for timeBeginPeriod](https://learn.microsoft.com/en-us/windows/win32/api/timeapi/nf-timeapi-timebeginperiod)

### Synthetic Mouse Event Contract
The pulse contains three signals:
1. `PostMessage(hwnd, 0x0200, 0, lp)` — `WM_MOUSEMOVE` to the window, where `lp` contains the **real client coordinates of the cursor**;
2. `PostMessage(hwnd, 0x0100, VK_F15, 0)` — a press of the nonexistent key **`F15` (`0x7E`)**; the `keydown` handler catches it with `if (k === "F15")` and invokes the game step;
3. `mouse_event(0x0001, 0, ±1)` — a micro-shift of the cursor by `1 px` strictly vertically so the OS generates a real event. It is done **only when the cursor is inside the game field** (otherwise it would interfere with button clicks).

Since the coordinates in `WM_MOUSEMOVE` are real, games with mouse control **do not need magic constants** like `if (ev.clientX === 208)`. The threshold for "the user actually moved the mouse" remains: `Math.abs(ev.clientX - lastX) >= 2`, because the pulse shifts the cursor by 1 px.

### The Game Field Is Determined from the Child Window
Previously, the "cursor inside the game" zone was defined by constants like `cpt.Y >= 68 && cpt.Y <= (wr.Bottom - 36)`, tied to a specific layout. Now `Tick` iterates over child windows, takes **the widest window with height > 200 px** (this is the game canvas), and checks whether the cursor falls within its `GetWindowRect` with a 4 px inset. The layout can be changed without touching the C#.

### ⚠️ Critical Pitfall of PowerShell + C# P/Invoke (`FindWindow`)
Never declare the first `FindWindow` parameter in C# as `string lpClassName` if you call it from PowerShell with `$null`:
```csharp
// ❌ BUG: PowerShell converts $null to an empty string "", not to a NULL pointer.
// Win32 FindWindowW("", title) returns 0, and the timer never starts.
public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
```
The correct approach is `IntPtr lpClassName` and `IntPtr.Zero` inside `FindGameWindow`, plus a fallback search by title.

### Fallback Window Search: Prefix Only
An exact title match is tried first. If none is found (the window has not been created yet), visible windows are enumerated and the one whose title **begins with** the required string is taken. Substring search (`"TETRIS"`, `"SNAKE"`) was removed intentionally: it could latch onto a browser tab or onto Illustrator itself if the document was saved as `Tetris.ai` (and the export layer is named `Tetris_Vector_Board`).

### Temporary Files and Cleanup
Three files are created per game in `Folder.temp`: `AI_<Token>_Heartbeat.ps1`, `AI_<Token>_Launcher.vbs`, `AI_<Token>_Stop.flag`. `heartbeatStop()` writes the flag and deletes `.ps1`/`.vbs` (if PowerShell is still reading the file, deletion fails silently; the next launch overwrites it). The PowerShell process exits by itself based on `IsWindow(hwnd)` and the flag, so verify that the process and helpers are gone after closing.

### Platform Limitations
- **Windows-only.** On macOS `heartbeatStart()` returns `false`. Show `statusNoHeartbeat` and keep direct input usable.
- **Corporate policies.** VBS, PowerShell or `Add-Type` can be blocked. Synchronous launch failures can be reported via `heartbeatLastError()`. Failures after VBS dispatch may leave the game without autonomous updates even when `heartbeatStart()` returns `true`.
- **Start delay.** `Add-Type` compiles C# on every launch (~1–2 s); that is why the process is launched asynchronously and does not block window opening.

---

## 3. The `ScriptUIGraphics` Rendering Engine: Working Around Bugs and Vector Rendering

All games are drawn on a custom control `var gameCanvas = win.add("group")` inside the callback `gameCanvas.onDraw = function () { drawScene(this.graphics); };`.

### 3.1. The `g.drawString()` Bug on Windows and a Custom Vector Font
In the Windows implementation of `ScriptUIGraphics` in Adobe Illustrator, there is a serious defect in font metrics (`g.measureString` and the vertical `baseline` in `g.drawString`):
- As the font size grows, digits shift far downward and press against the bottom edge of the tile or spill beyond it.
- The offset depends nonlinearly on the string length and the configured system DPI scaling.

Use geometric glyphs where the canvas needs precise text placement. Standard ScriptUI labels can use `statictext`. The glyph renderer uses two primitives from `lib/GameCore.jsx`.
1. **`fillCapsule(g, x1, y1, x2, y2, r, brush)`** — a segment of arbitrary slope with rounded ends of radius `r`.
2. **`fillArcBand(g, cx, cy, rMid, rThick, startDeg, endDeg, brush)`** — a smooth arc of the given thickness with rounded ends.

The combination of capsules and arcs produces the digits `0–9`, the signs `+ /`, and uppercase letters (`SCORE`, `BEST`, `WAVE`, `PAUSE`, `OVER`), centered relative to `(cx, cy)` to within fractions of a pixel.

### 3.2. `drawGlyphRun` and the Rule "A Global Function Cannot See a Local One"
A string is assembled by a shared core function:

```javascript
drawGlyphRun(g, str, cx, cy, glyphH, rgbColor, alpha, glyphFn, gapRatio);
```

`glyphFn` is the game's **local** `drawVectorGlyph` function (or `drawVectorDigit` in 2048), because each game has its own supported character set. Passing it is mandatory: the function from `lib/` is declared in the global scope and cannot directly call a function declared inside the IIFE.

That is why every game keeps a three-line wrapper:

```javascript
function drawVectorString(g, strVal, cx, cy, glyphH, rgbColor, alpha) {
    drawGlyphRun(g, strVal, cx, cy, glyphH, rgbColor, alpha, drawVectorGlyph, 0.20);
}
```

If a character is missing from the glyph table, it is **silently not drawn** — verify that all HUD text is covered by the set (`check.js` compares `tr()`/`setStatus()` literals, but not strings drawn on the canvas).

### 3.3. How to Draw Rounded Rectangles (`fillRoundRect`)
`ScriptUIGraphics` has no `roundedRectPath` and no Bezier curves; there are only `moveTo`, `lineTo`, `rectPath`, and `ellipsePath`. Therefore a 16-point trigonometric approximation of the corners is used via $\cos 30^\circ \approx 0.8660254$ and $\sin 30^\circ = 0.5$ — it is already implemented in `buildRoundRectPath` / `fillRoundRect` / `strokeRoundRect` in `lib/GameCore.jsx`; there is no need to write this code in the games.

The canonical smoothing parameters (do not change them for individual games): `fillCapsule` — `steps = 5`, `fillArcBand` — `arcSteps = 10`, `capSteps = 4`.

### 3.4. Smooth Rendering in Grid-Based Games (`lib/GameAnim.jsx`)

Logic in Pac-Man, Snake, and Boulder Dash steps 6–7 times per second, while tetrominoes in Tetris step once every 800 ms. If you draw only at the step moment, objects "jump" by a cell — this reads as lag, even though the CPU is idle (measurement: a frame takes 0.3–3.4 ms, fps = logic step rate).

The solution is to draw more often than the logic steps:

```javascript
animBegin(getStepIntervalMs());   // at the end of each logic step
animProgress();                   // at the start of the draw function
var drawX = animLerp(pac.px, pac.x);   // fractional coordinate between cells
if (animDue(33)) refreshUI();     // draw pulse ~30 fps between steps
```

`animLerp` intentionally does not animate a jump of more than one cell: a tunnel teleport, an eaten ghost, or a piece "landing" is drawn instantly.

The second half of the technique is **batching**: at 30 fps you cannot draw cell by cell. `fillBatchRects` / `fillBatchCircles` from `lib/GameCore.jsx` collect N shapes into a single path and issue a single `fillPath`: the Pac-Man maze went from ~340 fills to 4; Boulder Dash cells went from ~1200 to 13.

### 3.5. Reliable Screen Redraw (`refreshUI`)

In some Illustrator builds, calling `gameCanvas.notify("onDraw")` by itself does not invalidate the window area. The games use this combination when a canvas needs explicit invalidation.

```javascript
function refreshUI() {
    statusLbl.text = tr(statusKey, statusArgs);
    try {
        gameCanvas.hide();
        gameCanvas.show();
    } catch (e) {}
    try {
        gameCanvas.notify("onDraw");
    } catch (e2) {}
}
```

---

## 4. Layout, Character, and Focus Rules in ScriptUI

### 4.1. Ban on Color Emoji (Astral Plane Unicode `U+10000+`)
Standard ScriptUI buttons and text fields on Windows are rendered through classic GDI, which does not support UTF-16 surrogate pairs.
- ❌ **Do not use**: `🎨`, `🌙`, `🚀`, `🐍`, `👾`, `💎` — they turn into empty squares `□`.
- ✅ **Use only characters from the Basic Multilingual Plane (BMP)**:
  - Arrows and controls: `◄`, `►`, `▲`, `▼`, `❚❚`, `↻`, `↺`, `↶`
  - Icons and accents: `❖`, `◐`, `☀`, `★`, `◈`, `✓`

### 4.2. Preventing Text Clipping (`StaticText` Clipping)
A default `statictext` is single-line and can clip at its allocated width. For wrapping, create it with `{multiline: true}` and give it enough height. Check the longest localized text at the target DPI.
- The sum of element widths inside a horizontal `row` group plus `(N - 1) * spacing` **must not exceed `CANVAS_W`**.
- Keep hint texts (`controlsHint`) within `24–28` characters in all localizations.
- Status lines (`statusReady`, `statusGameOver`) — no longer than ~50 characters: a 365 px wide footer at Segoe UI 9 pt fits approximately that much.

### 4.3. Retaining Keyboard Focus
The custom `Group` area (`gameCanvas`) does not take keyboard focus on a mouse click. To make the `WASD` / `Arrow` / `Space` keys work reliably:
1. Register `addEventListener("keydown", handleKeyEvent)` on **all** focusable elements of the window (`win`, all buttons, `langDropdown`).
2. After any mouse click on the canvas or buttons, call `refocusControl()`, which returns focus to the primary action button.
3. Because a `keydown` event can bubble from a button to the parent `win`, add time-based debouncing:
   ```javascript
   var now = new Date().getTime();
   if (now - lastKeyTime < 65) return;
   lastKeyTime = now;
   ```

---

## 5. Game-Design Techniques ("Designer Edition Polish")

1. **Tactile 2.5D volume for tiles and blocks**: three layers — a bottom bevel/shadow (`Lip`, 35–45 units darker), a front face (`Face`), and a top highlight (`Specular`, white with alpha `0.25`).
2. **Player input buffering**:
   - **Snake**: a `dirQueue` of up to 2 commands prevents self-collision during fast U-turns.
   - **Pac-Man**: a pre-ordered turn `(nextDx, nextDy)` triggers in the first open corridor of an intersection.
   - **Boulder Dash**: separation of stationary and already falling rocks (`falling[r][c]`) so that a rock above Rockford's head does not kill instantly.
3. **Micro particle system (`sparks`)**: an array of 6–8 points `{ x, y, vx, vy, color, life }` — 20 lines of code, but it feels like a real engine.

---

## 6. Localization (Including Hindi / Devanagari) and Data Persistence

### 6.1. Encoding and Dictionaries
1. Save entry scripts with non-ASCII text as **UTF-8 with BOM**. ExtendScript displays both Czech/Romanian diacritics (`Čeština`, `Română`) and Devanagari (`हिन्दी`) in `statictext`, `button`, and `dropdownlist`; headings inside `ScriptUIGraphics` are best left in Latin (`SCORE`, `BEST`, `STAGE`).
2. **Check the BOM.** Without it, Illustrator decodes the file as Windows-1252, and the interface shows `2048 â€¢ Adobe Illustrator Edition`, `ÄŒeÅ¡tina`, `RomÃ¢nÄƒ`, `à¤¹à¤¿à¤¨à¥à¤¦à¥€`. This is the most common "broken interface" in ExtendScript projects: the code still works, so the error is noticed only visually.
   - Entry point → BOM is mandatory when non-ASCII characters are present.
   - Included file (`lib/`) → BOM is forbidden, keep it ASCII-only.
   - Any editor or script that rewrites the file can silently strip the BOM — after edits run `node tools/check.js` (it will report an error) or `node tools/check.js --fix` (it will fix it).
3. The `en / cs / ro / hi` dictionaries must have **the same set of keys** — otherwise `undefined` appears in the interface. This is checked automatically (`check.js`).
4. Parameter substitution is `relaxTranslate(dict, fallbackDict, key, args)`, format `{0}`, `{1}`. The game keeps a one-line `tr(key, args)` wrapper.

Games that use heartbeat define `statusNoHeartbeat` to report when autonomous animation is unavailable.

### 6.2. Persistence Without JSON
Data lives in `Folder.userData` in files `AI_<Token>_SaveData.txt` in line-by-line `key=value` format. The code that handles them is isolated in `lib/GamePersist.jsx`:

```javascript
var map = readKeyValueFile(getGameSaveFile("Tetris"));   // object or null
writeKeyValueFile(getGameSaveFile("Tetris"), ["lang=" + currentLang, "best=" + bestScore]);
```

An important distinction that must be preserved in the documentation and in file headers:
- **settings** (`lang`, `dark`, `best`) are saved by all games;
- **game state** (board, score, current piece) is restored only by **2048** and **Tetris**.

You cannot write state on every step: in Tetris, writing 200 cells on every gravity tick produced ~16 writes per second. A "dirty" flag is used:

```javascript
markDirty();        // in moveHorizontal / rotatePiece / softDrop
flushSave(false);   // from the game loop, no more than once every 3 s
flushSave(true);    // on window close and via the Close button
```

Discrete events (new game, completed line, hold, game over) are written immediately.

---

## 7. Exporting the Game Scene as Vectors to the Artboard (`❖ To Artboard`)

The standout capability of a game inside Adobe Illustrator is turning the current frame into an editable vector illustration on the active artboard:

1. **Check for an open document**: if `app.documents.length === 0`, create a document via `app.documents.add(DocumentColorSpace.RGB, width, height)`.
2. **Y-axis inversion in the Illustrator DOM**:
   - In `ScriptUIGraphics`, the `Y = 0` coordinate is **at the top** and grows **downward**.
   - In an Illustrator document, `Y` grows **from bottom to top** (`top > bottom`).
   ```javascript
   var abRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
   var abCenterX = (abRect[0] + abRect[2]) / 2;
   var abCenterY = (abRect[1] + abRect[3]) / 2;
   var startLeft = abCenterX - BOARD_W / 2;
   var startTop  = abCenterY + BOARD_H / 2;

   var aiLeft = startLeft + bx;
   var aiTop  = startTop - by; // Subtract Y!
   ```
3. **Finalization**: group the objects in `targetLayer.groupItems.add()`, call `app.redraw()`.
4. What is exported is a snapshot of the game field; the side HUD column **is not included** in the vector (for Tetris, a text line with the score, lines, and level is added instead).

---

## 8. Verification and Acceptance

### Automated
```powershell
node tools/check.js
node tools/test-core.js
node tools/sokoban-headless.js
```
`check.js` verifies: that every `#include` resolves and that there are no cycles; compilation of the fully expanded script (`vm.Script`, with line numbers); forbidden ES5+ constructs (strings/comments are masked first so C# strings do not trigger false positives); **encoding** (BOM on the entry point, ASCII-only and BOM-less in `lib/`); identical i18n key sets across all languages; existence of keys passed to `tr()`/`setStatus()`; warnings about duplicate shared functions. The `--fix` flag adds a missing BOM and removes an extra one from `lib/` files.

`test-core.js` executes `lib/` in a sandbox with a fake `ScriptUIGraphics` and checks geometry (coordinate finiteness, string centering, point counts), `{0}` substitution, `key=value` parsing, and that `heartbeatStart` generates valid C#/`.ps1` (including `IntPtr lpClassName` and prefix window search).

The Sokoban suite exercises `onShow` and `onClose` with a mock window and filesystem for both the modular and standalone scripts. Check actual event delivery and artboard export during the manual smoke run.

### Frame Log During Play

Measuring performance "by eye" is useless: a frame has three suspects at once — layout rebuild from `statusLbl.text`, canvas `hide()/show()`, and the drawing itself. Therefore `lib/GamePerf.jsx` writes `%TEMP%\relax_log_<Game>.txt` with one line per second:

```
[+12.0s] frames=38 fps=38.0 gap_avg=26 gap_max=120 | set=0.2 hs=3.9 draw=9.1 total=13.2 max=52 | keys=1
```

How to read it: `hs` is large → `hide/show` is to blame; `draw` is large → expensive geometry (many `fillPath` calls); `set` is large → window layout recalculation on every text change; `fps` noticeably below `1000/tickMs` or `frames` twice the expected value → events arrive in batches and the frame is drawn twice per tick. The log is always on and costs one write per second; the header contains the Illustrator version, `$.fileName`, canvas size, and `tickMs`.

### Manually (per game)
1. Launch from `File > Scripts`, the window opens, the field is drawn.
2. Keys and mouse; for Arkanoid and Space Invaders, the paddle/cannon follows the cursor without jerking.
3. Autonomous motion without moving the mouse.
4. Theme and all 4 languages: no `□`, clipping, or `undefined`.
5. Pause, restart.
6. `❖ To Artboard` — a layer with the expected name appears.
7. Closing with the X and with the button: Task Manager has no leftover `powershell.exe` with `AI_*_Heartbeat.ps1`, and `%TEMP%` has no `AI_*_Launcher.vbs`.
8. Relaunch: language/theme/high score are restored; for 2048 and Tetris, so is the game in progress.

---

## 9. A Short List of Pitfalls

| Pitfall | Symptom | Solution |
|---|---|---|
| `g.drawString` on Windows | digits drift downward | vector glyphs (§3.1) |
| no timer | everything freezes without the mouse | Win32Heartbeat (§2) |
| `FindWindow(string, …)` with `$null` | the pulse does not start | `IntPtr` + `IntPtr.Zero` (§2) |
| a global function calls a local one | `ReferenceError`/empty render | pass `glyphFn` as a parameter (§3.2) |
| no BOM in the entry point | `ÄŒeÅ¡tina`, `â€¢`, `RomÃ¢nÄƒ` in the UI | UTF-8 + BOM, `check.js --fix` (§6.1) |
| BOM in `#include` | `U+FEFF` in the middle of code | `lib/` without BOM, ASCII only (§0) |
| window search by substring | pulse goes to someone else's window | title prefix (§2) |
| `powerShell -ExecutionPolicy Bypass` | silently blocked by policy | `heartbeatStart() === false` + message (§2) |
| emoji in ScriptUI | `□` | BMP only (§4.1) |
| `statictext` | text clipping | width and line length (§4.2) |
| saving every frame | stutter | `markDirty` / `flushSave` (§6.2) |
