#!/usr/bin/env node
/**
 * relax/tools/check.js
 *
 * Static gate for the ExtendScript games in relax/.
 *
 *   node relax/tools/check.js
 *   node relax/tools/check.js --fix    # repair BOM problems in place
 *
 * What it verifies:
 *   1. Every #include resolves (relative to the including file), no cycles.
 *   2. The fully inlined script compiles (vm.Script, so errors carry line:col).
 *   3. ES5+ constructs are rejected (ExtendScript is ES3): let/const, arrows,
 *      template literals, Array#forEach/map/filter/indexOf, JSON, trim, etc.
 *      String literals and comments are masked first, so C# lambdas inside the
 *      generated PowerShell source do not produce false positives.
 *   4. Encoding rules (Illustrator decodes a BOM-less .jsx as Windows-1252):
 *      - entry scripts with non-ASCII text MUST start with a UTF-8 BOM,
 *      - lib/*.jsx must stay ASCII-only and BOM-less (they are inlined mid-script).
 *      --fix adds missing BOMs and strips stray ones from lib files.
 *   5. i18n: the 4 language dictionaries expose the same keys, and every
 *      literal key passed to tr()/setStatus() exists in I18N.en.
 *
 * Exit code 0 = green, 1 = problems. Warnings do not fail the run.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const LIB = path.join(ROOT, "lib");
const SKIP_DIRS = new Set(["_baseline_20261107", "tools", "node_modules"]);

const BANNED = [
    { name: "let/const", re: /(^|[^\w$.])(let|const)\s+[A-Za-z_$]/ },
    { name: "arrow function", re: /=>/ },
    { name: "template literal", re: /`/ },
    { name: "Array#forEach", re: /\.forEach\s*\(/ },
    { name: "Array#map", re: /\.map\s*\(/ },
    { name: "Array#filter", re: /\.filter\s*\(/ },
    { name: "JSON", re: /\bJSON\./ },
    { name: "String#trim", re: /\.trim\s*\(\s*\)/ },
    { name: "Array.isArray", re: /\bArray\.isArray\b/ },
    { name: "Function#bind", re: /\.bind\s*\(/ },
    { name: "Object.keys", re: /\bObject\.keys\b/ }
];

const errors = [];
const warnings = [];

function readText(file) {
    // Strip BOM defensively so parsing works even if a file gains one later.
    return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function rel(file) {
    return path.relative(ROOT, file).replace(/\\/g, "/");
}

/** Replace string literal bodies and comments with spaces, preserving newlines. */
function maskLiterals(src) {
    let out = "";
    let i = 0;
    const n = src.length;
    let state = "code"; // code | line | block | sq | dq

    while (i < n) {
        const c = src[i];
        const c2 = src[i + 1];

        if (state === "code") {
            if (c === "/" && c2 === "/") { state = "line"; out += "  "; i += 2; continue; }
            if (c === "/" && c2 === "*") { state = "block"; out += "  "; i += 2; continue; }
            if (c === "'") { state = "sq"; out += " "; i++; continue; }
            if (c === '"') { state = "dq"; out += " "; i++; continue; }
            out += c; i++; continue;
        }
        if (state === "line") {
            if (c === "\n") { state = "code"; out += "\n"; i++; continue; }
            out += " "; i++; continue;
        }
        if (state === "block") {
            if (c === "*" && c2 === "/") { state = "code"; out += "  "; i += 2; continue; }
            out += c === "\n" ? "\n" : " "; i++; continue;
        }
        if (state === "sq" || state === "dq") {
            const quote = state === "sq" ? "'" : '"';
            if (c === "\\") { out += "  "; i += 2; continue; }
            if (c === quote) { state = "code"; out += " "; i++; continue; }
            out += c === "\n" ? "\n" : " "; i++; continue;
        }
    }
    return out;
}

/** Inline #include directives recursively; strip preprocessor lines for parsing. */
function inlineIncludes(file, stack) {
    const chain = stack || [];
    if (chain.indexOf(file) >= 0) {
        throw new Error("circular #include: " + chain.map(rel).concat(rel(file)).join(" -> "));
    }
    let src = readText(file);

    src = src.replace(/^[ \t]*#include\s+"([^"]+)"[^\n]*$/gm, (line, spec) => {
        const target = path.resolve(path.dirname(file), spec);
        if (!fs.existsSync(target)) {
            throw new Error("missing #include \"" + spec + "\" (resolved to " + target + ")");
        }
        return inlineIncludes(target, chain.concat(file));
    });

    return src.replace(/^[ \t]*#(target|targetengine|includepath|script)\b[^\n]*$/gm, "");
}

function compileCheck(file, label) {
    let inlined;
    try {
        inlined = inlineIncludes(file, []);
    } catch (e) {
        errors.push(label + ": " + e.message);
        return null;
    }
    try {
        new vm.Script(inlined, { filename: label });
    } catch (e) {
        const where = String(e.stack || e.message).split("\n")[0];
        errors.push(label + ": syntax error -> " + where);
        return null;
    }
    return inlined;
}

function checkEs3(file, label) {
    const masked = maskLiterals(readText(file));
    const lines = masked.split(/\r?\n/);
    lines.forEach((line, idx) => {
        BANNED.forEach((rule) => {
            if (rule.re.test(line)) {
                errors.push(label + ":" + (idx + 1) + ": ES5+ construct: " + rule.name);
            }
        });
    });
}

function hasBom(file) {
    const buf = fs.readFileSync(file);
    return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

// Bytes above 127 mean the file carries non-ASCII text (i18n strings, arrows).
// Illustrator decodes a BOM-less .jsx as Windows-1252, so such a file MUST
// start with EF BB BF or the UI shows mojibake ("ÄŒeÅ¡tina", "à¤¹à¤¿à¤¨à¥à¤¦à¥€").
function highByteCount(file) {
    const buf = fs.readFileSync(file);
    let n = 0;
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] > 127) n++;
    }
    return n;
}

function addBom(file) {
    const buf = fs.readFileSync(file);
    fs.writeFileSync(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), buf]));
}

function dropBom(file) {
    const buf = fs.readFileSync(file);
    if (buf.length >= 3) fs.writeFileSync(file, buf.subarray(3));
}

// --fix: entry scripts get a BOM when they need one, libraries lose it.
function repairBoms(scripts, libs) {
    const fixed = [];
    scripts.forEach((file) => {
        if (highByteCount(file) > 0 && !hasBom(file)) {
            addBom(file);
            fixed.push(rel(file) + ": UTF-8 BOM added");
        }
    });
    libs.forEach((file) => {
        if (hasBom(file)) {
            dropBom(file);
            fixed.push(rel(file) + ": BOM removed (included file)");
        }
    });
    return fixed;
}

/* ------------------------------ i18n checks ------------------------------ */

function extractObjectBlock(src, startIndex) {
    const open = src.indexOf("{", startIndex);
    if (open < 0) return null;
    let depth = 0;
    let i = open;
    while (i < src.length) {
        const c = src[i];
        if (c === "{") depth++;
        else if (c === "}") {
            depth--;
            if (depth === 0) return src.substring(open, i + 1);
        }
        i++;
    }
    return null;
}

function checkI18n(gameFile, label) {
    const src = readText(gameFile);
    const decl = src.indexOf("var I18N");
    if (decl < 0) return; // 2048 etc. always have it, but stay tolerant

    const block = extractObjectBlock(src, decl);
    if (!block) {
        warnings.push(label + ": could not parse I18N block");
        return;
    }

    // Per-language key sets: en: { ... }, cs: { ... }, ...
    const langs = {};
    const langRe = /(?:^|\n)\s*([A-Za-z]{2})\s*:\s*\{/g;
    let m;
    while ((m = langRe.exec(block)) !== null) {
        const lang = m[1];
        const objStart = block.indexOf("{", m.index);
        const obj = extractObjectBlock(block, objStart);
        if (!obj) continue;
        const keys = [];
        const keyRe = /(?:^|\n)\s*([A-Za-z_$][\w$]*)\s*:\s*"/g;
        let km;
        while ((km = keyRe.exec(obj)) !== null) keys.push(km[1]);
        langs[lang] = keys;
    }

    const names = Object.keys(langs);
    if (names.length < 2) return;

    const union = [];
    names.forEach((lang) => langs[lang].forEach((k) => { if (union.indexOf(k) < 0) union.push(k); }));

    names.forEach((lang) => {
        const missing = union.filter((k) => langs[lang].indexOf(k) < 0);
        if (missing.length) {
            errors.push(label + ": i18n[" + lang + "] missing keys: " + missing.join(", "));
        }
    });

    const en = langs.en || langs[names[0]];
    const used = new Set();
    const useRe = /\b(?:tr|setStatus)\s*\(\s*"([A-Za-z_$][\w$]*)"\s*[,)]/g;
    let um;
    while ((um = useRe.exec(src)) !== null) used.add(um[1]);
    const unknown = Array.from(used).filter((k) => en.indexOf(k) < 0);
    if (unknown.length) {
        errors.push(label + ": keys passed to tr()/setStatus() but missing in I18N.en: " + unknown.join(", "));
    }
}

/* ------------------------------ duplication ------------------------------ */

const SHARED_SYMBOLS = [
    "rgbToNorm", "buildRoundRectPath", "fillRoundRect", "strokeRoundRect",
    "fillCapsule", "fillArcBand", "drawGlyphRun", "makeRGBColor",
    "startHeartbeatTimer", "stopHeartbeatTimer"
];

function checkDuplication(gameFile, label) {
    const src = readText(gameFile);
    const dups = SHARED_SYMBOLS.filter((sym) => new RegExp("function\\s+" + sym + "\\s*\\(").test(src));
    if (dups.length) {
        warnings.push(label + ": still defines shared helper(s): " + dups.join(", "));
    }
}

/* --------------------------------- main --------------------------------- */

function listJsx(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith(".jsx"))
        .sort()
        .map((f) => path.join(dir, f));
}

function main() {
    const libs = listJsx(LIB);
    const games = listJsx(ROOT).filter((f) => {
        const dir = path.basename(path.dirname(f));
        return !SKIP_DIRS.has(dir);
    });

    if (!games.length) {
        console.error("No .jsx games found in " + ROOT);
        process.exit(1);
    }

    if (process.argv.indexOf("--fix") >= 0) {
        const fixed = repairBoms(games, libs);
        if (fixed.length) {
            console.log("fixed:");
            fixed.forEach((f) => console.log("  + " + f));
        } else {
            console.log("fixed: nothing to repair");
        }
    }

    libs.forEach((file) => {
        const label = rel(file);
        if (hasBom(file)) {
            errors.push(label + ": UTF-8 BOM in a #include'd library (it is inlined mid-script, keep it BOM-less)");
        }
        if (highByteCount(file) > 0) {
            errors.push(label + ": non-ASCII text in a #include'd library; it cannot carry a BOM, so " +
                          "Illustrator would decode it as Windows-1252. Keep libraries ASCII-only.");
        }
        checkEs3(file, label);
        compileCheck(file, label);
    });

    games.forEach((file) => {
        const label = rel(file);
        const src = readText(file);
        if (!/^\s*#target\s+illustrator/im.test(src)) {
            errors.push(label + ": missing '#target illustrator'");
        }
        if (!/\(function\s*\(\)\s*\{/.test(src)) {
            warnings.push(label + ": no IIFE wrapper found");
        }
        if (highByteCount(file) > 0 && !hasBom(file)) {
            errors.push(label + ": non-ASCII text without a UTF-8 BOM. Illustrator reads BOM-less " +
                          ".jsx as Windows-1252, so the UI will show mojibake.");
        }
        checkEs3(file, label);
        compileCheck(file, label);
        checkI18n(file, label);
        checkDuplication(file, label);
    });

    const included = games.filter((f) => /^[ \t]*#include\s+"/m.test(readText(f))).length;
    console.log("checked: " + games.length + " scripts, " + libs.length + " lib files (" + included + " scripts use #include)");

    if (warnings.length) {
        console.log("\nWARN (" + warnings.length + "):");
        warnings.forEach((w) => console.log("  ! " + w));
    }
    if (errors.length) {
        console.log("\nERROR (" + errors.length + "):");
        errors.forEach((e) => console.log("  x " + e));
        console.log("\nFAILED");
        process.exit(1);
    }
    console.log("\nOK");
}

main();
