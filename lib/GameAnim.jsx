// relax/lib/GameAnim.jsx
// Smooth rendering for cell-stepped games.
//
// The logic still advances once per step (Pac-Man ~145 ms, Snake ~138 ms,
// Boulder Dash ~155 ms, Tetris gravity 800 ms). Between steps the canvas is
// repainted at ~30 fps and every entity is drawn at its interpolated position,
// so motion is continuous instead of jumping one cell at a time.
//
// Usage:
//   animBegin(stepMs)      right after a logic step (or at spawn)
//   animProgress()         once per paint, before reading positions
//   animLerp(prev, cur)    fractional cell position
//   animDue(33)            paint throttle, call before refreshUI()
//
// ES3 only, ASCII only (included file: no BOM allowed).

var _animStepAt = 0;
var _animStepMs = 100;
var _animT = 1;
var _animLastDraw = 0;

// Marks the moment a logic step happened; interpolation runs from 0 to 1
// over stepMs.
function animBegin(stepMs) {
    _animStepAt = new Date().getTime();
    _animStepMs = (stepMs > 0) ? stepMs : 100;
    _animT = 0;
}

// Recomputes the 0..1 progress. Call once at the top of the paint routine.
function animProgress() {
    var t = (new Date().getTime() - _animStepAt) / _animStepMs;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    _animT = t;
    return t;
}

function animT() {
    return _animT;
}

// Fractional position between the previous and the current cell. A jump of
// more than one cell means a teleport (warp tunnel, eaten ghost, piece lock)
// and is drawn without interpolation.
function animLerp(prev, cur) {
    var d = cur - prev;
    if (d > 1 || d < -1) return cur;
    return prev + d * _animT;
}

// Paint throttle: true when at least minMs have passed since the last paint.
function animDue(minMs) {
    var now = new Date().getTime();
    if (now - _animLastDraw < minMs) return false;
    _animLastDraw = now;
    return true;
}

// Forces the next animDue() to return true (used after a resize, a theme
// switch or a state jump).
function animResetDrawClock() {
    _animLastDraw = 0;
}
