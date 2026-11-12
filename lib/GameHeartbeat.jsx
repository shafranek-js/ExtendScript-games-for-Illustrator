// relax/lib/GameHeartbeat.jsx
// Autonomous real-time loop for ExtendScript: Illustrator has no timer, so a
// hidden PowerShell process posts WM_MOUSEMOVE / WM_KEYDOWN(F15) pulses that
// wake the ScriptUI engine up.
// ES3 only. Included via #include "lib/GameHeartbeat.jsx".
//
// API:
//   heartbeatSupported()          -> true on Windows
//   heartbeatStart(cfg)           -> true when the launcher was executed
//   heartbeatStop()               -> writes the stop flag, removes temp files
//   heartbeatLastError()          -> diagnostic string for the status bar
//
// cfg:
//   title   window title for FindWindow (exact match, then prefix match)
//   token   temp file namespace, e.g. "Tetris" -> AI_Tetris_Heartbeat.ps1
//   tickMs  pulse interval (default 35)
//
// The synthetic mouse event always carries the LIVE cursor position, so
// mouse-driven games (Arkanoid, Space Invaders) follow the pointer without any
// magic constants in the game code. The cursor is only nudged by 1 px while it
// is inside the game canvas, so paddles are never disturbed over the buttons.

var _hbState = null;
var _hbError = "";

function heartbeatSupported() {
    return $.os.toLowerCase().indexOf("windows") !== -1;
}

function heartbeatLastError() {
    return _hbError;
}

function hbBuildCs() {
    return "using System; using System.Text; using System.Runtime.InteropServices; " +
        "public class Win32Heartbeat { " +
        "[StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; } " +
        "[StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; } " +
        "[StructLayout(LayoutKind.Sequential)] public struct GUITHREADINFO { public int cbSize; public uint flags; public IntPtr hwndActive; public IntPtr hwndFocus; public IntPtr hwndCapture; public IntPtr hwndMenuOwner; public IntPtr hwndMoveSize; public IntPtr hwndCaret; public RECT rcCaret; } " +
        "public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam); " +
        "[DllImport(\"user32.dll\", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(IntPtr lpClassName, string lpWindowName); " +
        "[DllImport(\"user32.dll\")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam); " +
        "[DllImport(\"user32.dll\", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount); " +
        "[DllImport(\"user32.dll\")] public static extern bool IsWindow(IntPtr hWnd); " +
        "[DllImport(\"user32.dll\")] public static extern bool IsWindowVisible(IntPtr hWnd); " +
        "[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow(); " +
        "[DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId); " +
        "[DllImport(\"user32.dll\")] public static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO lpgui); " +
        "[DllImport(\"user32.dll\")] public static extern bool GetCursorPos(out POINT lpPoint); " +
        "[DllImport(\"user32.dll\")] public static extern bool ScreenToClient(IntPtr hWnd, ref POINT lpPoint); " +
        "[DllImport(\"user32.dll\")] public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect); " +
        "[DllImport(\"user32.dll\")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect); " +
        "[DllImport(\"user32.dll\")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam); " +
        "[DllImport(\"user32.dll\")] public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam); " +
        "[DllImport(\"user32.dll\")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo); " +

        // Exact title first; otherwise the first visible window whose title
        // STARTS WITH the requested title. Substring matching was removed on
        // purpose: "TETRIS" / "SNAKE" could bind to a browser or to Illustrator.
        "public static IntPtr FindGameWindow(string title) { " +
        "IntPtr h = FindWindow(IntPtr.Zero, title); " +
        "if (h != IntPtr.Zero) return h; " +
        "IntPtr found = IntPtr.Zero; " +
        "EnumWindows((wnd, lp) => { " +
        "if (IsWindowVisible(wnd)) { " +
        "StringBuilder sb = new StringBuilder(256); " +
        "GetWindowText(wnd, sb, 256); " +
        "if (sb.ToString().StartsWith(title, StringComparison.OrdinalIgnoreCase)) { found = wnd; return false; } " +
        "} return true; }, IntPtr.Zero); " +
        "return found; " +
        "} " +

        "[DllImport(\"winmm.dll\")] public static extern uint timeBeginPeriod(uint uPeriod); " +
        "[DllImport(\"winmm.dll\")] public static extern uint timeEndPeriod(uint uPeriod); " +
        "public static void Tick(IntPtr hwnd, int toggle) { " +
        // Keep running while Illustrator is in the background: losing focus must
        // not stop the game, otherwise a player who switched to another app for
        // a minute comes back to a frozen window.
        "uint winPid = 0, fgPid = 0; " +
        "uint tid = GetWindowThreadProcessId(hwnd, out winPid); " +
        "GetWindowThreadProcessId(GetForegroundWindow(), out fgPid); " +
        "bool isForeground = (winPid == 0 || fgPid == 0 || winPid == fgPid); " +
        "GUITHREADINFO gti = new GUITHREADINFO(); gti.cbSize = Marshal.SizeOf(typeof(GUITHREADINFO)); " +
        "IntPtr focusHwnd = GetGUIThreadInfo(tid, ref gti) ? gti.hwndFocus : IntPtr.Zero; " +

        // The game canvas is the only child taller than 200 px: use its screen
        // rectangle as the play area instead of hard-coded layout offsets.
        "POINT pt; GetCursorPos(out pt); " +
        "RECT pr; pr.Left = 0; pr.Top = 0; pr.Right = 0; pr.Bottom = 0; " +
        "EnumChildWindows(hwnd, (ch, l) => { " +
        "RECT r; if (GetWindowRect(ch, out r)) { " +
        "if ((r.Bottom - r.Top) > 200 && (r.Right - r.Left) > (pr.Right - pr.Left)) { pr = r; } " +
        "} return true; }, IntPtr.Zero); " +
        "bool inPlayArea = (pr.Right > pr.Left) && " +
        "(pt.X >= pr.Left + 4 && pt.X <= pr.Right - 4 && pt.Y >= pr.Top + 4 && pt.Y <= pr.Bottom - 4); " +
        // Nudge the real cursor only when the game window is focused: the 1 px
        // pulse must never move the pointer while the user works elsewhere.
        "if (inPlayArea && isForeground) { mouse_event(0x0001, 0, (toggle == 0) ? 1 : -1, 0, UIntPtr.Zero); } " +

        // Alternate fallback coords (0,2) <-> (1,3) so Windows/ScriptUI never drops
        // identical WM_MOUSEMOVE messages while keeping clientY <= 3 and clientX <= 1.
        "POINT cpt = pt; ScreenToClient(hwnd, ref cpt); " +
        "int mx = inPlayArea ? cpt.X : toggle; " +
        "int my = inPlayArea ? cpt.Y : (2 + toggle); " +
        "int lp = (my << 16) | (mx & 0xFFFF); " +
        "PostMessage(hwnd, 0x0200, IntPtr.Zero, (IntPtr)lp); " +
        "PostMessage(hwnd, 0x0100, (IntPtr)0x7E, IntPtr.Zero); " +

        "bool hitFocus = false; " +
        "EnumChildWindows(hwnd, (ch, l) => { " +
        "RECT r; if (GetClientRect(ch, out r)) { " +
        "int h = r.Bottom - r.Top; " +
        "if (h > 200) { " +
        "POINT p2 = pt; ScreenToClient(ch, ref p2); " +
        "bool inCv = (p2.X >= 0 && p2.X <= r.Right && p2.Y >= 10 && p2.Y <= r.Bottom); " +
        "int cx = inCv ? p2.X : toggle; " +
        "int cy = inCv ? p2.Y : (2 + toggle); " +
        "PostMessage(ch, 0x0200, IntPtr.Zero, (IntPtr)((cy << 16) | (cx & 0xFFFF))); " +
        "} else if (h >= 20 && h <= 40) { " +
        "if (ch == focusHwnd) hitFocus = true; " +
        "PostMessage(ch, 0x0100, (IntPtr)0x7E, IntPtr.Zero); " +
        "} } return true; }, IntPtr.Zero); " +
        "if (!hitFocus && focusHwnd != IntPtr.Zero && focusHwnd != hwnd) { " +
        "PostMessage(focusHwnd, 0x0100, (IntPtr)0x7E, IntPtr.Zero); " +
        "} " +
        "} }";
}

function heartbeatStart(cfg) {
    _hbError = "";
    if (!heartbeatSupported()) {
        _hbError = "not-windows";
        return false;
    }
    if (!cfg || !cfg.token) {
        _hbError = "missing-token";
        return false;
    }

    try {
        var token = String(cfg.token);
        var tickMs = (typeof cfg.tickMs === "number") ? cfg.tickMs : 35;
        var title = String(cfg.title || "");

        var stopFile = new File(Folder.temp.fsName + "/AI_" + token + "_Stop.flag");
        var psFile = new File(Folder.temp.fsName + "/AI_" + token + "_Heartbeat.ps1");
        var vbsFile = new File(Folder.temp.fsName + "/AI_" + token + "_Launcher.vbs");
        _hbState = { stopFile: stopFile, psFile: psFile, vbsFile: vbsFile };

        if (stopFile.exists) stopFile.remove();

        var stopPath = stopFile.fsName.replace(/\\/g, "\\\\");
        var titlePs = title.replace(/'/g, "''");

        var whileHead = "while ([Win32Heartbeat]::IsWindow($hwnd) -and -not [System.IO.File]::Exists('" + stopPath + "')) {\r\n";
        var loopBody =
            "    [Win32Heartbeat]::Tick($hwnd, $t)\r\n" +
            "    $t = 1 - $t\r\n" +
            "    Start-Sleep -Milliseconds " + tickMs + "\r\n";

        // Start-Sleep rounds up to the 15.6 ms system timer, so a 16 ms request
        // really sleeps ~31 ms. Opting in to the 1 ms timer makes the interval real.
        // Games whose step is driven by elapsed time must opt in; games that step
        // once per event would change speed, so the default stays untouched.
        var loopScript;
        if (cfg.highRes === true) {
            loopScript =
                "try {\r\n" +
                "    [Win32Heartbeat]::timeBeginPeriod(1)\r\n" +
                "    " + whileHead + loopBody + "    }\r\n" +
                "} finally {\r\n" +
                "    [Win32Heartbeat]::timeEndPeriod(1)\r\n" +
                "}\r\n";
        } else {
            loopScript = whileHead + loopBody + "}\r\n";
        }

        var psScript =
            "$ErrorActionPreference = 'SilentlyContinue'\r\n" +
            "Add-Type -TypeDefinition '" + hbBuildCs() + "'\r\n" +
            "$hwnd = [IntPtr]::Zero\r\n" +
            "for ($i = 0; $i -lt 100; $i++) {\r\n" +
            "    $hwnd = [Win32Heartbeat]::FindGameWindow('" + titlePs + "')\r\n" +
            "    if ($hwnd -ne [IntPtr]::Zero) { break }\r\n" +
            "    Start-Sleep -Milliseconds 50\r\n" +
            "}\r\n" +
            "if ($hwnd -eq [IntPtr]::Zero) { exit }\r\n" +
            "$t = 0\r\n" +
            loopScript;

        if (!psFile.open("w")) {
            _hbError = "cannot-write-ps1";
            return false;
        }
        psFile.write(psScript);
        psFile.close();

        var vbsScript =
            'Set sh = CreateObject("WScript.Shell")\r\n' +
            'sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""' +
            psFile.fsName + '""", 0, False\r\n';

        if (!vbsFile.open("w")) {
            _hbError = "cannot-write-vbs";
            return false;
        }
        vbsFile.write(vbsScript);
        vbsFile.close();

        var launched = vbsFile.execute();
        if (launched === false) {
            _hbError = "launcher-failed";
            return false;
        }
        return true;
    } catch (err) {
        _hbError = String((err && err.message) ? err.message : err);
        return false;
    }
}

function heartbeatStop() {
    if (!_hbState) return;
    var f = _hbState.stopFile;
    try {
        if (f.open("w")) {
            f.write("stop");
            f.close();
        }
    } catch (e) {}

    // The helpers are re-written on every launch, so removing them here only
    // keeps %TEMP% clean. If PowerShell is still reading them the remove fails
    // silently and the next launch overwrites them anyway.
    try { if (_hbState.psFile.exists) _hbState.psFile.remove(); } catch (e1) {}
    try { if (_hbState.vbsFile.exists) _hbState.vbsFile.remove(); } catch (e2) {}
}
