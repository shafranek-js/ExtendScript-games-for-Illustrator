#!/usr/bin/env node
/**
 * relax/tools/migrate.js
 *
 * Mechanical helper for the lib/ extraction. Two operations only:
 *
 *   node relax/tools/migrate.js <game.jsx> --drop rgbToNorm,fillCapsule
 *       Removes the named top-level function declarations (string/comment aware
 *       brace matching, so braces inside C# string literals are ignored).
 *
 *   node relax/tools/migrate.js <game.jsx> --includes lib/GameCore.jsx,lib/GamePersist.jsx
 *       Inserts #include lines directly after the #target directive.
 *
 * Prints a report; exits 1 if a requested function was not found.
 */

"use strict";

const fs = require("fs");
const path = require("path");

/** Replace string literal bodies and comments with spaces, preserving length. */
function maskLiterals(src) {
    let out = "";
    let i = 0;
    const n = src.length;
    let state = "code";

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

function findFunctionRange(src, name) {
    const re = new RegExp("function\\s+" + name + "\\s*\\(", "g");
    const m = re.exec(src);
    if (!m) return null;

    const masked = maskLiterals(src);
    const open = masked.indexOf("{", m.index);
    if (open < 0) return null;

    let depth = 0;
    let i = open;
    while (i < masked.length) {
        const c = masked[i];
        if (c === "{") depth++;
        else if (c === "}") {
            depth--;
            if (depth === 0) break;
        }
        i++;
    }
    if (depth !== 0) return null;

    // Extend to the start of the declaration line and to the end of the closing line.
    let start = src.lastIndexOf("\n", m.index) + 1;
    let end = src.indexOf("\n", i);
    end = (end < 0) ? src.length : end + 1;

    return { start, end, name };
}

function dropFunctions(src, names, report) {
    names.forEach((name) => {
        const range = findFunctionRange(src, name);
        if (!range) {
            report.missing.push(name);
            return;
        }
        const removedLines = src.substring(range.start, range.end).split(/\r?\n/).length - 1;
        src = src.substring(0, range.start) + src.substring(range.end);
        report.dropped.push(name + " (" + removedLines + " lines)");
    });
    // Collapse the blank-line gaps left behind.
    src = src.replace(/\r?\n[ \t]*\r?\n[ \t]*\r?\n+/g, "\n\n");
    return src;
}

function insertIncludes(src, includes, report) {
    const lines = src.split(/\r?\n/);
    const targetIdx = lines.findIndex((l) => /^[ \t]*#target\b/i.test(l));
    if (targetIdx < 0) {
        report.missing.push("#target directive");
        return src;
    }
    const block = includes.map((inc) => '#include "' + inc + '"');
    const rest = lines.slice(targetIdx + 1);
    // Drop a single blank line directly under #target to keep the header tight.
    if (rest[0] === "") rest.shift();
    const out = lines.slice(0, targetIdx + 1).concat(block, [""], rest);
    report.includes = includes;
    return out.join("\n");
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("usage: migrate.js <file> [--drop a,b] [--includes x,y]");
        process.exit(1);
    }
    const file = path.resolve(args[0]);
    let src = fs.readFileSync(file, "utf8");
    const hadBom = src.charCodeAt(0) === 0xfeff;

    const report = { dropped: [], missing: [], includes: [] };

    const dropIdx = args.indexOf("--drop");
    if (dropIdx >= 0 && args[dropIdx + 1]) {
        const names = args[dropIdx + 1].split(",").map((s) => s.trim()).filter(Boolean);
        src = dropFunctions(src, names, report);
    }

    const incIdx = args.indexOf("--includes");
    if (incIdx >= 0 && args[incIdx + 1]) {
        const includes = args[incIdx + 1].split(",").map((s) => s.trim()).filter(Boolean);
        src = insertIncludes(src, includes, report);
    }

    // Editing must not silently drop the UTF-8 BOM: Illustrator would then
    // decode the file as Windows-1252 and the UI turns into mojibake.
    if (hadBom && src.charCodeAt(0) !== 0xfeff) src = "\uFEFF" + src;
    fs.writeFileSync(file, src, "utf8");

    console.log(path.basename(file));
    report.dropped.forEach((d) => console.log("  - dropped " + d));
    report.includes.forEach((i) => console.log("  + #include \"" + i + "\""));
    if (report.missing.length) {
        console.log("  ! not found: " + report.missing.join(", "));
        process.exit(1);
    }
}

main();
