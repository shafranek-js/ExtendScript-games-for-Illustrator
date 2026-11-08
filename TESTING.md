# relax Test Plan (Illustrator ExtendScript)

This document explains how to verify the games after the refactoring (extraction into `lib/`, unified heartbeat, lazy saving, launcher) and what constitutes acceptance.

- **In scope:** 7 games (`2048`, `Tetris`, `Arkanoid`, `Snake`, `SpaceInvaders`, `BoulderDash`, `PacMan`), `Play Arcade.jsx`, `lib/*.jsx`, documentation.
- **Out of scope:** gameplay balance, art quality, macOS support beyond "does not crash and reports an error", other OSes, networks/licenses.
- **Key release risk:** the heartbeat contract change (real coordinates instead of constants) and game-field detection via the child window. Therefore Arkanoid and Space Invaders are tested first and more thoroughly than the rest.

---

## 1. Testing Levels

| Level | Coverage | Execution |
|---|---|---|
| **A. Static** | syntax, ES3, `#include`, BOM, i18n keys, duplicates | automated (`check.js`) |
| **A2. Core** | geometry, substitutions, save parsing, `.ps1` generation | automated (`test-core.js`) |
| **B. Launch** | launcher, direct launches, missing `lib/` | manual |
| **C. Smoke** | game opens, renders, responds to input, closes | manual |
| **D. Controls** | keyboard, mouse, autonomous motion, focus | manual |
| **E. Localization** | 4 languages × 7 games | manual |
| **F. Saves** | settings, game state, compatibility | manual |
| **G. Export** | `❖ To Artboard` | manual |
| **H. Performance** | disk write frequency, CPU, responsiveness | manual + PowerShell |
| **I. Resilience** | missing `lib/`, killed timer, corrupt save, foreign window | manual |
| **J. Regression** | comparison with `_baseline_20261107/` | manual |
| **K. Cleanup** | processes, temp files | PowerShell |

## 2. Runs

| Run | Scope | Time |
|---|---|---|
| **Smoke** | A, A2, B-01…B-04, C for all 7, K | ~25 min |
| **Full** | everything below | ~2.5 h |
| **Pre-release regression** | Smoke + D (Arkanoid/SpaceInvaders), F-05, J |

## 3. Environments and Data

**Minimum environment matrix**

| Parameter | Values |
|---|---|
| Illustrator | 2026 (primary), 2021 (minimum installed) |
| Windows scaling | 100 %, 125 % (check click area and window size) |
| Monitors | one; two (second with a different DPI) |
| `%TEMP%` state | clean; after a dozen launches |

**Test data states**

1. **Clean** — no saves: delete `AI_*_SaveData.txt` in `Folder.userData`.
2. **Legacy** — save created by an older version: launch the games from `_baseline_20261107/` (local snapshot, not in the repository), play, and close.
3. **Corrupt** — save with truncated contents (only `lang=`).
4. **No-lib** — temporarily rename `lib` to `lib_off`.
5. **Foreign window** — Notepad open with `SNAKE - Adobe Illustrator Edition.txt` (window lookup test).

The save path can be found with a one-off script:

```javascript
#target illustrator
alert(Folder.userData.fsName);
```

---

## 4. Coverage Matrix

| Check | 2048 | Tetris | Arkanoid | Snake | Invaders | Boulder | PacMan |
|---|---|---|---|---|---|---|---|
| C — smoke | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| D — keyboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| D — mouse | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| D — autonomous motion | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| E — 4 languages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| F — settings | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| F — game state | ✓ | ✓ | — | — | — | — | — |
| G — export | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| H — save writes | — | ✓ | — | — | — | — | — |

The `—` in the "autonomous motion" row for 2048 is expected behavior: the game is turn-based.

---

## 5. Test Cases

Priorities: **P0** — blocks acceptance, **P1** — required, **P2** — if possible.

### A. Automated

| ID | Steps | Expected | P |
|---|---|---|---|
| A-01 | `node tools/check.js` | `checked: 8 scripts, 4 lib files (7 scripts use #include)` and `OK`, no WARN | P0 |
| A-02 | `node tools/test-core.js` | `16/16 passed` | P0 |
| A-03 | Append `var x = 1; x.forEach(...)` to the end of any game; run `check.js`; revert the change | `ERROR … ES5+ construct: Array#forEach`, exit code 1 | P1 |

### B. Launch

| ID | Steps | Expected | P |
|---|---|---|---|
| B-01 | `File > Scripts > Other Script…` → `Play Arcade.jsx` | "RELAX" window, 7 rows, each with a number, genre, and description | P0 |
| B-02 | Press `1` in the menu, play, close the game | 2048 launches; after its window closes, the launcher menu returns; `Esc` in the menu exits completely | P0 |
| B-03 | `File > Scripts > Other Script…` → `Tetris.jsx` (directly) | The game launches without the launcher | P0 |
| B-04 | Rename `lib` → `lib_off`; launch the launcher and select a game | A clear `Missing #include file(s)` message; the launcher does not crash. Restore `lib` afterward | P0 |
| B-05 | Same without `lib`, but launch `Tetris.jsx` directly | ExtendScript error pointing at `#include` (expected); after `lib` is restored, everything works | P1 |
| B-06 | Copy the `relax` folder to a path with spaces and to a folder with Cyrillic characters, then launch the launcher from there | Games launch and `#include` resolves | P2 |
| B-07 | In the launcher: `★ Random` | Any of the 7 games launches | P1 |
| B-08 | In the launcher: `Folder`, `❖ Docs`, `Close (Esc)` | The folder opens; the README opens; the window closes | P2 |

### C. Smoke (for each game)

| ID | Steps | Expected | P |
|---|---|---|---|
| C-01 | Launch the game | The window opens, the field and HUD are rendered, status is "ready", and there are no exceptions | P0 |
| C-02 | Look closely at the canvas | No clipped or misaligned digits or labels; no empty `□` placeholders | P0 |
| C-03 | Compare the window size with the run from `_baseline_20261107/` | It matches (game geometry has not changed) | P1 |
| C-04 | Close with the X button, then launch again and close with the `Close` button | Both methods work and the window does not get stuck | P0 |

### D. Controls

| ID | Steps | Expected | P |
|---|---|---|---|
| D-01 | Keys listed in the hint (arrows/WASD/`Space`/special keys) | All actions work, with no double triggers | P0 |
| D-02 | Do not touch the mouse or keyboard for 10 s | The game keeps running (except 2048) | P0 |
| D-03 | Arkanoid: move the mouse over the field | The paddle follows smoothly, **with no jerks toward the center and no jitter** | P0 |
| D-04 | Arkanoid: do not touch the mouse; play with the `A`/`D` keys | The paddle does not drift when controlled with the keys | P0 |
| D-05 | Space Invaders: move the mouse over the field | The cannon follows; it does not jerk when controlled by keyboard | P0 |
| D-06 | Space Invaders: move the cursor onto a button/outside the field | The cannon does not jump; buttons click normally | P1 |
| D-07 | Alt-Tab to another application for 5 s, then return | The game **keeps running** in the background (objects move); the cursor in the other window does not jitter; no time "jump" on return | P1 |
| D-07b | Minimize Illustrator for 10 s, then restore it | The timer is paused (the window is invisible) and CPU is not consumed; the game continues after restore | P1 |
| D-08 | Click the buttons while the cursor is over the field | All buttons respond (the cursor is not captured by the timer) | P1 |
| D-09 | 2048/Snake/Boulder/Tetris: swipe or click on the field | The gesture works (according to the rules of the specific game) | P1 |

### E. Localization and Encoding (7 games × 4 languages)

| ID | Steps | Expected | P |
|---|---|---|---|
| E-00 | Launch any game and read the window title and labels | `2048 • Adobe Illustrator Edition`, `◄ A`, `•`, `Čeština`, `Română`, `हिन्दी` — with no `â€¢`, `ÄŒ`, `RomÃ¢nÄƒ`, `à¤¹à¤¿`. If any appear, the BOM is missing: `node tools/check.js --fix` | P0 |
| E-01 | Switch between `English / Čeština / Română / हिन्दी` | Buttons, hint, and status are translated; the window title remains in English | P1 |
| E-02 | In each language, inspect the status footer | Text is not truncated with "…", there is no `undefined`, and there are no squares | P1 |
| E-03 | In `हिन्दी` and `Čeština`, check the control hint and buttons | Diacritics and Devanagari render correctly | P0 |
| E-04 | Select a language, close, and reopen | The language is preserved | P1 |

### F. Saves

| ID | Steps | Expected | P |
|---|---|---|---|
| F-01 | Delete all `AI_*_SaveData.txt`, launch a game | Defaults: EN, dark theme, high score 0 | P0 |
| F-02 | Change the language and theme, close, and reopen | They are restored | P0 |
| F-03 | Tetris: play for 30 s, place a piece, close, and reopen | The field, score, lines, level, and current piece are restored; status is "Game restored" | P0 |
| F-04 | Tetris: play until Game Over, close, and reopen | A new game starts (the session is not restored), and the high score is preserved | P1 |
| F-05 | **Compatibility:** launch `_baseline_20261107/Tetris.jsx`, play, and close; then launch the new version | The new version reads the old save without errors (file names and keys are unchanged) | P0 |
| F-06 | Same for 2048 | The old save is read and the field is restored | P0 |
| F-07 | Truncate the save to `lang=cs`, then launch | The game starts from a clean slate, without an exception | P1 |
| F-08 | Make the save read-only, then play | The game does not crash; changes are not saved | P2 |

### G. Artboard Export

| ID | Steps | Expected | P |
|---|---|---|---|
| G-01 | No document open → `❖ To Artboard` | A new document is created, and objects appear on the active artboard | P0 |
| G-02 | Open an RGB document → export | A layer with the expected name appears, containing a group; the image is not flipped | P0 |
| G-03 | Export in a CMYK document | No error; colors are converted | P1 |
| G-04 | Export twice | The second group is added to the same layer, with no errors | P2 |

### H. Performance

| ID | Steps | Expected | P |
|---|---|---|---|
| H-01 | Tetris: play for 30 s while monitoring the save's `LastWriteTime` | ≤ 4 writes per 10 s (previously ~16/s) | P1 |
| H-02 | Any dynamic game: 1 min idle | Illustrator CPU is not maxed out; the window stays responsive | P1 |
| H-03 | Input latency | A keypress is reflected without a noticeable pause | P1 |

Command for H-01:

```powershell
$f = "<Folder.userData>\AI_Tetris_SaveData.txt"
1..10 | ForEach-Object { (Get-Item $f).LastWriteTime; Start-Sleep 1 }
```

### I. Resilience

| ID | Steps | Expected | P |
|---|---|---|---|
| I-01 | Launch a game, then end the `powershell.exe` process running `AI_*_Heartbeat.ps1` in Task Manager | The game stops moving on its own, but the keyboard/mouse still work; relaunching the game re-enables the timer | P1 |
| I-02 | Open Notepad with `SNAKE - Adobe Illustrator Edition.txt`, then launch Snake | The game works (the exact title match wins), and nothing is "typed" into Notepad | P1 |
| I-03 | Save the document as `Tetris.ai`, launch Tetris, and do not move the mouse over the Illustrator canvas | The heartbeat is bound to the game window; the cursor does not jitter on the document canvas | P2 |
| I-04 | Run a game while a modal Illustrator dialog is open (for example, `Save As`) | The game does not receive focus; it keeps working after the dialog is closed | P2 |

### J. Regression Against Baseline

| ID | Steps | Expected | P |
|---|---|---|---|
| J-01 | Launch the 7 games from `_baseline_20261107/` and the 7 new games one by one | All 14 launch; the new windows do not differ in size | P0 |
| J-02 | Compare HUD/field screenshots (content is random — compare geometry and colors) | Layout and palette match | P1 |
| J-03 | Compare status lines and hints | Texts are unchanged (except the new `statusNoHeartbeat`, which should not appear on Windows) | P1 |

### K. Cleanup

| ID | Steps | Expected | P |
|---|---|---|---|
| K-01 | Close the game → check processes | No `powershell.exe` running `AI_*_Heartbeat.ps1` | P0 |
| K-02 | Check `%TEMP%` after closing | No `AI_*_Launcher.vbs` or `AI_*_Heartbeat.ps1`; `AI_*_Stop.flag` may remain (by design, removed on the next launch) | P0 |
| K-03 | After using the launcher, check `%TEMP%` | `relax_run_*.jsx` files are deleted; if a script fails, its file remains for investigation | P1 |

```powershell
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object { $_.CommandLine -like '*AI_*_Heartbeat.ps1' } | Select ProcessId, CommandLine

Get-ChildItem $env:TEMP -Filter "AI_*"      | Select Name, LastWriteTime
Get-ChildItem $env:TEMP -Filter "relax_run_*" | Select Name, LastWriteTime
```

---

## 6. Entry and Exit Criteria

**Entry:** `check.js` → `OK`; `test-core.js` → `16/16`; `_baseline_20261107/` is present; Illustrator 2026 launches.

**Exit (acceptance):**
1. All P0 checks have passed.
2. All P1 checks have passed or are recorded as known limitations with justification.
3. K-01 and K-02 are clean.
4. No regressions in J-01 and J-03.
5. All discovered P0 defects are closed.

## 7. Known Limitations (Not Defects)

- On macOS, there is no autonomous animation: the status shows `Timer unavailable`, and the game advances only when the mouse moves.
- If group policy blocks `powershell.exe -ExecutionPolicy Bypass` or `wscript.exe`, the timer does not start; the game reports this and remains controllable.
- `AI_*_Stop.flag` remains in `%TEMP%` until the next launch — this is intentional.
- Launcher bundles in `%TEMP%` are intentionally preserved on error.
- Game content is random (pieces, ghosts, caves), so pixel-by-pixel comparison of "before/after" screenshots is invalid; geometry is compared instead.

## 8. Defect Template

```
Game:            Tetris / Play Arcade / lib
AI version:      2026 (29.x) / 2021
OS and DPI:      Windows 11, 125 %
Steps:           1) … 2) … 3) …
Actual:          …
Expected:        …
Reproducibility: always / 3 out of 5
Screenshot:      _test/2026-11-08_tetris_cs.png
Frame log:       %TEMP%\relax_log_<Game>.txt
Leftovers:       powershell.exe alive / AI_*_Launcher.vbs left behind / corrupt save
```

The frame log is written automatically; the `set / hs / draw` columns show at which stage of the frame time is lost (see `README.md`, section "Diagnostics and Logs").

## 9. Acceptance Checklist

```
[ ] A-01 check.js OK
[ ] A-02 test-core 16/16
[ ] B-01…B-04 launcher and launch without lib
[ ] C-01…C-04 all 7 games open/close
[ ] D-01…D-09 controls; Arkanoid and Space Invaders — mouse with no jitter
[ ] E-00 encoding: no `â€¢` / `ÄŒ` / `à¤¹à¤¿` in UI
[ ] E-01…E-04 4 languages with no truncation or square glyphs
[ ] F-01…F-06 saves, including an old save
[ ] G-01…G-03 artboard export
[ ] H-01 ≤ 4 save writes per 10 s
[ ] I-01…I-02 killed timer and foreign window
[ ] J-01/J-03 regression against baseline
[ ] K-01…K-03 no stuck processes or temp garbage
```
