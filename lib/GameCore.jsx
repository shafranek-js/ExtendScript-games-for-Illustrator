// relax/lib/GameCore.jsx
// Shared ExtendScript drawing primitives for the relax/ arcade games.
// ES3 only. Included at the top of every game via #include "lib/GameCore.jsx".
// These are global functions (same convention as dev/lib/Utils.jsx) so that the
// games can keep calling fillRoundRect(...) etc. unchanged.

// Normalize an [r, g, b] array to ScriptUI's 0..1 color scale.
function rgbToNorm(rgbArr, alpha) {
    return [
        rgbArr[0] / 255,
        rgbArr[1] / 255,
        rgbArr[2] / 255,
        (typeof alpha === "number") ? alpha : 1
    ];
}

// 16-point trigonometric approximation of a rounded rectangle.
// ScriptUIGraphics has no bezier curves and no roundedRectPath.
function buildRoundRectPath(g, x, y, w, h, r) {
    var rad = Math.min(r, w / 2, h / 2);
    var c30 = 0.8660254 * rad;
    var s30 = 0.5 * rad;

    g.newPath();
    g.moveTo(x + rad, y);
    g.lineTo(x + w - rad, y);
    g.lineTo(x + w - rad + s30, y + rad - c30);
    g.lineTo(x + w - rad + c30, y + rad - s30);
    g.lineTo(x + w, y + rad);

    g.lineTo(x + w, y + h - rad);
    g.lineTo(x + w - rad + c30, y + h - rad + s30);
    g.lineTo(x + w - rad + s30, y + h - rad + c30);
    g.lineTo(x + w - rad, y + h);

    g.lineTo(x + rad, y + h);
    g.lineTo(x + rad - s30, y + h - rad + c30);
    g.lineTo(x + rad - c30, y + h - rad + s30);
    g.lineTo(x, y + h - rad);

    g.lineTo(x, y + rad);
    g.lineTo(x + rad - c30, y + rad - s30);
    g.lineTo(x + rad - s30, y + rad - c30);
    g.closePath();
}

function fillRoundRect(g, x, y, w, h, r, brush) {
    buildRoundRectPath(g, x, y, w, h, r);
    g.fillPath(brush);
}

function strokeRoundRect(g, x, y, w, h, r, pen) {
    buildRoundRectPath(g, x, y, w, h, r);
    g.strokePath(pen);
}

// Thick line segment with round caps: the basic stroke of the vector font engine.
function fillCapsule(g, x1, y1, x2, y2, r, brush) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var baseAngle = Math.atan2(dy, dx);
    var steps = 5;
    var i, ang, px, py;

    g.newPath();
    for (i = 0; i <= steps; i++) {
        ang = baseAngle - Math.PI / 2 + (Math.PI * i) / steps;
        px = x2 + Math.cos(ang) * r;
        py = y2 + Math.sin(ang) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
    }
    for (i = 0; i <= steps; i++) {
        ang = baseAngle + Math.PI / 2 + (Math.PI * i) / steps;
        px = x1 + Math.cos(ang) * r;
        py = y1 + Math.sin(ang) * r;
        g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath(brush);
}

// Arc of a thick ring with rounded caps: the second stroke of the vector font engine.
function fillArcBand(g, cx, cy, rMid, rThick, startDeg, endDeg, brush) {
    var a0 = (startDeg * Math.PI) / 180;
    var a1 = (endDeg * Math.PI) / 180;
    var arcSteps = 10;
    var capSteps = 4;
    var rOut = rMid + rThick;
    var rIn = Math.max(0.5, rMid - rThick);
    var i, t, ang, px, py;

    g.newPath();
    for (i = 0; i <= arcSteps; i++) {
        t = i / arcSteps;
        ang = a0 + (a1 - a0) * t;
        px = cx + Math.cos(ang) * rOut;
        py = cy + Math.sin(ang) * rOut;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
    }
    var c1x = cx + Math.cos(a1) * rMid;
    var c1y = cy + Math.sin(a1) * rMid;
    for (i = 1; i < capSteps; i++) {
        ang = a1 + (Math.PI * i) / capSteps;
        g.lineTo(c1x + Math.cos(ang) * rThick, c1y + Math.sin(ang) * rThick);
    }
    for (i = 0; i <= arcSteps; i++) {
        t = i / arcSteps;
        ang = a1 - (a1 - a0) * t;
        px = cx + Math.cos(ang) * rIn;
        py = cy + Math.sin(ang) * rIn;
        g.lineTo(px, py);
    }
    var c0x = cx + Math.cos(a0) * rMid;
    var c0y = cy + Math.sin(a0) * rMid;
    for (i = 1; i < capSteps; i++) {
        ang = a0 + Math.PI + (Math.PI * i) / capSteps;
        g.lineTo(c0x + Math.cos(ang) * rThick, c0y + Math.sin(ang) * rThick);
    }
    g.closePath();
    g.fillPath(brush);
}

// Lays out a string of vector glyphs centred on (cx, cy).
// glyphFn is the game-local drawVectorGlyph / drawVectorDigit: a global function
// cannot see a function declared inside the game's IIFE, so it is passed in.
function drawGlyphRun(g, strVal, cx, cy, glyphH, rgbColor, alpha, glyphFn, gapRatio) {
    var str = String(strVal);
    var n = str.length;
    var brush = g.newBrush(g.BrushType.SOLID_COLOR, rgbToNorm(rgbColor, alpha));
    var charW = glyphH * 0.62;
    var gap = glyphH * ((typeof gapRatio === "number") ? gapRatio : 0.2);
    var totalW = n * charW + (n - 1) * gap;
    var startCenterX = cx - totalW / 2 + charW / 2;

    for (var i = 0; i < n; i++) {
        var dx = startCenterX + i * (charW + gap);
        glyphFn(g, str.charAt(i), dx, cy, glyphH, brush);
    }
}

// Illustrator document color from an [r, g, b] array (used by the artboard export).
function makeRGBColor(rgbArr) {
    var col = new RGBColor();
    col.red = rgbArr[0];
    col.green = rgbArr[1];
    col.blue = rgbArr[2];
    return col;
}
