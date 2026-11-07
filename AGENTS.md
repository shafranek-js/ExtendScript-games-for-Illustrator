# Repository Guidelines — relax

## Project Structure & Module Organization
- `Play Arcade.jsx` — launcher: menu for all games (hotkeys 1-7, Random, Docs, Folder). It inlines `#include` itself and runs a temp bundle, so it keeps working even when `lib/` is broken.
- `2048.jsx`, `Tetris.jsx`, `Arkanoid.jsx`, `Snake.jsx`, `SpaceInvaders.jsx`, `BoulderDash.jsx`, `PacMan.jsx` — entry scripts loaded by Illustrator (`File > Scripts`). Each is a thin game: constants, palette, i18n dictionary, glyph table, game logic, renderer.
- `lib/GameCore.jsx` — colour conversion, rounded rectangles, capsules, arc bands, glyph-run layout, `makeRGBColor`.
- `lib/GameHeartbeat.jsx` — autonomous real-time loop (hidden PowerShell + C# `Win32Heartbeat`).
- `lib/GamePersist.jsx` — `key=value` persistence in `Folder.userData`.
- `lib/GameI18n.jsx` — `{0}` placeholder substitution.
- `tools/check.js` — static gate; `tools/migrate.js` — mechanical helper.
- `_baseline_20261107/` — pre-refactor snapshot, local only (gitignored). Never run it; delete only when the new version is accepted.

Keep shared drawing/plumbing in `lib/`; only game-specific logic, palettes, glyphs and dictionaries belong in the game file. Do not add a game-to-game dependency.

## Build, Test, and Development Commands
- No build step. Run via `File > Scripts > Other Script…` and pick a game.
- `node tools/check.js` — the only automated gate: `#include` resolution/cycles, ES3 syntax, forbidden ES5+ constructs, encoding (entry scripts need a UTF-8 BOM, `lib/` must stay ASCII/BOM-less), i18n key parity, keys passed to `tr()`/`setStatus()`, duplicated shared helpers. `--fix` repairs BOM problems in place.
- `node tools/test-core.js` — executes `lib/` in a sandbox with a fake `ScriptUIGraphics`: drawing geometry, `{0}` substitution, `key=value` parsing and the generated PowerShell/C# are asserted without launching Illustrator.
- `node tools/migrate.js <game.jsx> --drop a,b --includes lib/GameCore.jsx` — mechanical edits during a refactor (see `--help` in the file header).
- Manual smoke test per game: launch, keyboard, mouse (Arkanoid/SpaceInvaders), autonomous motion without moving the mouse, theme toggle, all 4 languages, pause/restart, `❖ To Artboard`, close by X and by the Close button, relaunch (settings and — for 2048/Tetris — the saved game), no leftover `powershell.exe` and no `AI_*_Launcher.vbs` in `%TEMP%`.

## Coding Style & Naming Conventions
- ExtendScript (ES3) only: `var` and function declarations; no `let/const`, arrows, template literals, `Array#forEach/map/filter/indexOf`, `JSON`, `String#trim`.
- Indent 4 spaces, braces on the same line, short purposeful comments.
- Constants and palettes uppercase (`CANVAS_W`, `PALETTE`), functions/locals camelCase, i18n keys `statusXxx` / `btnXxx`.
- Every game is wrapped in `(function () { ... })();`.
- `#include` directives start at column 0, above the IIFE. Paths are relative to the including file.
- **Encoding is part of the contract.** Illustrator decodes a BOM-less `.jsx` as Windows-1252, which turns `Čeština` / `हिन्दी` / `◄` into `ÄŒeÅ¡tina` / `à¤¹à¤¿à¤¨à¥à¤¦à¥€`. Entry scripts (games, launcher) therefore must be UTF-8 **with BOM**; included `lib/` files must be **ASCII-only and BOM-less**. Many editors and scripts drop the BOM on save — after any edit run `node tools/check.js` (or `--fix`).
- Core functions are global (same convention as `dev/lib/Utils.jsx`). A global function cannot see a game-local function — pass it in (`drawGlyphRun(..., glyphFn)`).
- Heap strings rendered on canvas must be covered by the game's `drawVectorGlyph` table; missing glyphs are skipped silently.

## Testing Guidelines
- There is no automated runtime suite; `check.js` catches syntax and structure, everything else is manual.
- The test plan with case IDs (A-01 … K-03), coverage matrix and acceptance checklist lives in `TESTING.md`. Follow the **Smoke** run for a quick pass and the **Full** run before a release.
- Run the manual smoke test after any change to a game or to `lib/`. Use a scratch document: `❖ To Artboard` creates layers and objects on the active artboard.
- The heartbeat is Windows-only by design; macOS verification means "the status line reports `statusNoHeartbeat` and the game still responds to the mouse".
- Save files are backwards compatible with `_baseline_20261107/` (same names, same keys) — keep a legacy save around and re-check case F-05 after touching persistence.

## Commit & Pull Request Guidelines
- Commit messages: present-tense, imperative, scoped (e.g. `Extract shared drawing core`, `Unify heartbeat coordinates`).
- PRs: summary, list of affected games, which manual checks were run, and screenshots of a game canvas before/after when rendering changed.
- Do not reformat unrelated games in the same change.
