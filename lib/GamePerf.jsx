// relax/lib/GamePerf.jsx
// Frame-time diagnostics for the relax games.
//
// Writes one summary line per second plus explicit events into
// %TEMP%/relax_log_<Token>.txt, so a slow frame can be attributed to a concrete
// stage: status-label relayout, canvas hide/show, or the actual drawing.
// Example line:
//   [+12.0s] frames=38 fps=38.0 gap_avg=26 gap_max=120 | set=0.2 hs=3.9 draw=9.1 total=13.2 max=52 | keys=1
//
// Every line is appended and closed immediately, so the file can be read while
// the game is still running (ExtendScript buffers an open file handle).
//
// ES3 only, ASCII only (this file is #include'd, so it must stay BOM-less).

var _pf = null;

function perfNow() {
    return new Date().getTime();
}

function perfSeconds() {
    if (!_pf) return "0.0";
    return ((perfNow() - _pf.start) / 1000).toFixed(1);
}

// Opens the log in append mode, writes one line, closes. Keeps the file
// readable at any moment and survives a crash.
function perfWrite(line) {
    if (!_pf || !_pf.path) return;
    try {
        var f = new File(_pf.path);
        if (f.open("a")) {
            f.writeln(line);
            f.close();
        }
    } catch (e) {}
}

function perfInit(cfg) {
    var c = cfg || {};
    _pf = {
        token: c.token ? String(c.token) : "Game",
        path: Folder.temp.fsName + "/relax_log_" + (c.token ? String(c.token) : "Game") + ".txt",
        start: perfNow(),
        winStart: perfNow(),
        lastStart: 0,
        frames: 0,
        gapSum: 0,
        gapMax: 0,
        setSum: 0,
        hsSum: 0,
        drawSum: 0,
        totSum: 0,
        totMax: 0,
        keys: 0,
        totalFrames: 0,
        totalMs: 0,
        slowSeconds: 0
    };

    try {
        var f = new File(_pf.path);
        if (f.open("w")) {
            f.writeln("RELAX diagnostics - one summary line per second");
            f.writeln("game=" + _pf.token);
            f.writeln("started=" + new Date().toString());
            f.writeln("os=" + $.os);
            try { f.writeln("app=" + app.name + " " + app.version); } catch (eApp) {}
            f.writeln("script=" + $.fileName);
            f.writeln("canvas=" + c.canvasW + "x" + c.canvasH + " canvasCount=" + c.canvases);
            f.writeln("tickMs=" + c.tickMs);
            f.writeln("theme=" + c.theme + " lang=" + c.lang);
            f.writeln("columns: frames fps gap_avg gap_max | set hs draw total max | keys");
            f.writeln("----");
            f.close();
        }
    } catch (e) {}
}

function perfKey() {
    if (_pf) _pf.keys++;
}

// Free-form event line, written immediately.
function perfNote(msg) {
    if (!_pf) return;
    perfWrite("[+" + perfSeconds() + "s] " + msg);
}

// Called once per repaint: setMs = status label, hsMs = canvas hide/show,
// drawMs = notify("onDraw") i.e. the drawing itself.
function perfFrame(setMs, hsMs, drawMs) {
    if (!_pf) return;
    var now = perfNow();
    var gap = _pf.lastStart ? (now - _pf.lastStart) : 0;
    _pf.lastStart = now;

    _pf.frames++;
    if (gap > 0) {
        _pf.gapSum += gap;
        if (gap > _pf.gapMax) _pf.gapMax = gap;
    }
    _pf.setSum += setMs;
    _pf.hsSum += hsMs;
    _pf.drawSum += drawMs;

    var tot = setMs + hsMs + drawMs;
    _pf.totSum += tot;
    if (tot > _pf.totMax) _pf.totMax = tot;

    if (now - _pf.winStart >= 1000) perfFlush(now);
}

function perfFlush(now) {
    if (!_pf) return;
    var n = _pf.frames;
    if (!n) {
        _pf.winStart = now;
        return;
    }

    var secs = (now - _pf.winStart) / 1000;
    var fps = n / secs;
    var avgTotal = _pf.totSum / n;

    _pf.totalFrames += n;
    _pf.totalMs += _pf.totSum;
    if (avgTotal > 25) _pf.slowSeconds++;

    perfWrite(
        "[+" + perfSeconds() + "s] frames=" + n +
        " fps=" + fps.toFixed(1) +
        " gap_avg=" + Math.round(_pf.gapSum / n) +
        " gap_max=" + Math.round(_pf.gapMax) +
        " | set=" + (_pf.setSum / n).toFixed(1) +
        " hs=" + (_pf.hsSum / n).toFixed(1) +
        " draw=" + (_pf.drawSum / n).toFixed(1) +
        " total=" + avgTotal.toFixed(1) +
        " max=" + Math.round(_pf.totMax) +
        " | keys=" + _pf.keys
    );

    _pf.frames = 0;
    _pf.gapSum = 0;
    _pf.gapMax = 0;
    _pf.setSum = 0;
    _pf.hsSum = 0;
    _pf.drawSum = 0;
    _pf.totSum = 0;
    _pf.totMax = 0;
    _pf.keys = 0;
    _pf.winStart = now;
}

function perfClose() {
    if (!_pf) return;
    var now = perfNow();
    perfFlush(now);

    var dur = (now - _pf.start) / 1000;
    var avg = _pf.totalFrames ? (_pf.totalMs / _pf.totalFrames) : 0;
    perfWrite("----");
    perfWrite(
        "[end] runtime=" + dur.toFixed(1) + "s" +
        " frames=" + _pf.totalFrames +
        " avg_frame=" + avg.toFixed(1) + "ms" +
        " avg_fps=" + (_pf.totalFrames / (dur || 1)).toFixed(1) +
        " slow_seconds=" + _pf.slowSeconds
    );
    _pf = null;
}
