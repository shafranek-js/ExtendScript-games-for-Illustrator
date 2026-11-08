# ExtendScript Games for Adobe Illustrator

Eight complete games that run **inside Adobe Illustrator** — pure ExtendScript (ES3) + ScriptUI, drawn pixel by pixel with `ScriptUIGraphics`, no raster assets, no plugins.

The games are the visible part. The real subject of this repository is **what the Illustrator scripting engine can actually do**: no timers, no fonts you can trust, no JSON, no frameworks — and still a real-time loop, a vector font renderer, a four-language UI and one-click export of the game scene to an editable artboard.

> Treat this as a capability test of ExtendScript for Illustrator, not as a shipped product.

---

## What it demonstrates

| Capability | How it is done | Where |
|---|---|---|
| **Real-time animation without timers** | Illustrator has no `setInterval`. A hidden PowerShell process compiles a small C# class (`Add-Type`) and posts `WM_MOUSEMOVE` + `F15` to the dialog every 25–40 ms, waking the ExtendScript engine. | [`lib/GameHeartbeat.jsx`](lib/GameHeartbeat.jsx) |
| **Own vector font** | `Graphics.drawString()` miscalculates baseline and metrics on Windows. Every glyph is built from two primitives — a round-capped capsule and an arc band — and centred mathematically. Zero `drawString` calls in the codebase. | [`lib/GameCore.jsx`](lib/GameCore.jsx), per-game `drawVectorGlyph` |
| **Immediate-mode rendering** | Rounded rectangles via 16-point trigonometric approximation (there are no Bézier curves), geometric circles, diamonds and 2.5D blocks. Static geometry is batched into a single `fillPath` — the Boulder Dash cave went from ~1200 fills per frame to 13. | [`lib/GameCore.jsx`](lib/GameCore.jsx) |
| **Smooth motion on a cell grid** | Logic steps 6–7 times per second; the canvas repaints at ~30 fps with interpolated positions, so sprites glide between cells instead of jumping. Teleports (warp tunnels, eaten ghosts) are deliberately not animated. | [`lib/GameAnim.jsx`](lib/GameAnim.jsx) |
| **Four-language UI** | English, Czech, Romanian and Hindi dictionaries in every game, including Devanagari. Illustrator decodes a BOM-less `.jsx` as Windows-1252, so encoding is part of the build contract. | per-game `I18N`, [`lib/GameI18n.jsx`](lib/GameI18n.jsx) |
| **Persistence without JSON** | `JSON` does not exist in ES3. Saves and settings are `key=value` lines in `Folder.userData`, written through a small shared helper. | [`lib/GamePersist.jsx`](lib/GamePersist.jsx) |
| **Export to an editable artboard** | The current frame becomes real Illustrator paths and text on a new layer, with the Y axis inverted (ScriptUI grows downwards, the DOM grows upwards). | each game's `export…ToArtboard()` |
| **Static verification** | A Node gate resolves `#include`, compiles the fully inlined script, rejects ES5+ syntax, checks the BOM rules and i18n key parity; a second tool runs the drawing core in a sandbox with a fake `ScriptUIGraphics`. | [`tools/check.js`](tools/check.js), [`tools/test-core.js`](tools/test-core.js) |
| **Runtime diagnostics** | Every game writes a frame-timing log (status label / hide-show / drawing) to `%TEMP%\relax_log_<Game>.txt`, which is how the 6–7 fps cadence was measured and fixed. | [`lib/GamePerf.jsx`](lib/GamePerf.jsx) |
| **Launcher without `#include` support** | `$.evalFile()` is not documented to preprocess `#include`, so the launcher inlines the sources itself into a temporary single-file bundle and runs that. | [`Play Arcade.jsx`](Play%20Arcade.jsx) |

## The games

Every screenshot below is the real ScriptUI window, drawn by the game itself — no mock-ups.

|  | Game | Genre | What is interesting in it |
|---|---|---|---|
| <img src="screenshots/2048.png" width="150" alt="2048"> | **2048**<br>`2048.jsx` | Puzzle | Swipe gestures, tile merging, full game state restored between sessions |
| <img src="screenshots/tetris.png" width="150" alt="Tetris"> | **Tetris**<br>`Tetris.jsx` | Classic | 7-bag randomizer, wall kicks, ghost piece, hold/next preview, smooth falling piece |
| <img src="screenshots/arkanoid.png" width="150" alt="Arkanoid"> | **Arkanoid**<br>`Arkanoid.jsx` | Action | Continuous physics, 5 stages, 5 power-up capsules, lasers, mouse-driven paddle |
| <img src="screenshots/snake.png" width="150" alt="Snake"> | **Snake**<br>`Snake.jsx` | Arcade | Turn queue, 3 arena modes (walls / portals / labyrinth), gradient body |
| <img src="screenshots/space-invaders.png" width="150" alt="Space Invaders"> | **Space Invaders**<br>`SpaceInvaders.jsx` | Shooter | 5×9 swarm with two-frame animation, eroding bunkers, mystery UFO |
| <img src="screenshots/boulder-dash.png" width="150" alt="Boulder Dash"> | **Boulder Dash**<br>`BoulderDash.jsx` | Logic | Cell gravity for boulders and gems, monster AI, 5 hand-built caves |
| <img src="screenshots/pac-man.png" width="150" alt="Pac-Man"> | **Pac-Man**<br>`PacMan.jsx` | Arcade | 19×21 maze, four ghosts with different personalities, frightened mode |
| <img src="screenshots/lode-runner.png" width="150" alt="Lode Runner"> | **Lode Runner**<br>`LodeRunner.jsx` | Arcade | 150 authentic levels, laser digging with crumbling bricks, Doug Smith guard AI, Apple II running-bond masonry, retro HUD |

## Quick start

The launcher is the entry point: one window with all eight games, hotkeys `1`–`8`, a random pick, and shortcuts to the docs, the game folder and the runtime logs.

<img src="screenshots/launcher.png" width="420" alt="RELAX launcher with the eight games">

1. Download or clone this repository (**keep the folder intact — the games share `lib/`**).
2. In Illustrator open `File > Scripts > Other Script…` and pick **`Play Arcade.jsx`**.
3. Click a game title or press `1`–`8`. Closing a game brings the launcher back.

Running a single game directly works too: `File > Scripts > Other Script…` → e.g. `Tetris.jsx` or `LodeRunner.jsx`.

**Controls:** arrows / WASD to move, `Space` for the primary action (`Z` / `X` to dig left / right in Lode Runner), `Esc` to close. Mouse steers in Arkanoid and Space Invaders; swipes and clicks work in 2048, Snake, Boulder Dash and Tetris.

## How it works

The full engineering notes — including the platform traps that shaped this code — are in **[EXTENDSCRIPT_GAME_DEV_GUIDE.md](EXTENDSCRIPT_GAME_DEV_GUIDE.md)**. Short version:

- **No timer in Illustrator.** A PowerShell process posts synthetic events into the modal dialog; the game reacts to them. It keeps running while Illustrator is in the background, pauses when the window is minimised, and never moves the real cursor unless the game window has focus.
- **No trustworthy text rendering.** Everything on the canvas is geometry; ScriptUI `statictext` is used only for labels outside the canvas.
- **ES3 only** — `var`, loops, no `let`/`const`, no `JSON`, no `Array#forEach`. A static gate enforces this.
- **Encoding matters.** Entry scripts are UTF-8 **with BOM**; included `lib/` files are ASCII and BOM-less.

## Repository layout

```
Play Arcade.jsx      launcher: menu for all games (1-8, Random, Docs, Logs)
2048.jsx … Tetris.jsx  eight games (including LodeRunner.jsx)
lib/                 shared engine: drawing core, heartbeat, animation, persistence, i18n, diagnostics
tools/               static gate, core tests, headless logic/render tests, level importer
screenshots/         UI captures used in this README
README.md            this file
TESTING.md           test plan: coverage matrix, cases A-01 … K-03, acceptance checklist
AGENTS.md            conventions for contributors
EXTENDSCRIPT_GAME_DEV_GUIDE.md  the engineering write-up
LICENSE              MIT
```

## Verification

```powershell
node tools/check.js              # ES3 syntax, #include resolution, UTF-8 BOM rules, i18n key parity
node tools/check.js --fix        # repair BOM problems in place
node tools/test-core.js          # drawing core, {0} substitution, save parsing, heartbeat generation
node tools/loderunner-headless.js # 37 headless tests for Lode Runner mechanics & vector rendering
```

Both run on Node alone — Illustrator is not required. The runtime test is manual: see [TESTING.md](TESTING.md) (Smoke run ≈ 25 min, Full run ≈ 2.5 h).

## Requirements and known limitations

- **Adobe Illustrator 2021+** — developed and tested on Illustrator 2026 (Windows, ES3 engine).
- **Windows** for autonomous animation. On macOS the heartbeat is unavailable: the game still runs, but advances only while the mouse moves, and the status bar says so.
- Corporate machines may block `powershell.exe -ExecutionPolicy Bypass` or `wscript.exe`; the game then reports that the timer is unavailable instead of silently freezing.
- The games are modal dialogs by design — that is the only reliable way to keep an ExtendScript window alive.
- Released under the MIT licence: free to reuse, modify and redistribute with attribution.

## Documentation

- **[EXTENDSCRIPT_GAME_DEV_GUIDE.md](EXTENDSCRIPT_GAME_DEV_GUIDE.md)** — the platform traps and the recipes that solve them (timer, vector font, batching, interpolation, encoding, export).
- **[TESTING.md](TESTING.md)** — test plan with case IDs and an acceptance checklist.
- **[AGENTS.md](AGENTS.md)** — coding conventions, encoding contract, review expectations.

## Licence

MIT — see [LICENSE](LICENSE). Take the code, the techniques and the write-up, fork them, ship them in your own scripts.
