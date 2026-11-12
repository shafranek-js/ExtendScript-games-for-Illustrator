import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const web = dirname(fileURLToPath(import.meta.url));
const root = resolve(web, "..");
const dist = join(web, "dist");
const read = (file) => readFile(join(root, file), "utf8");
const launcher = await read("Play Arcade.jsx");
const entries = [...launcher.matchAll(
    /\{ file: "([^"]+)", token: "([^"]+)", title: "([^"]+)", tag: "([^"]+)", desc: "([^"]+)" \}/g
)];
if (!entries.length) throw new Error("No games found in the Illustrator launcher");

const browserModules = new Set(["GameHeartbeat", "GamePersist", "GamePerf"]);
const assets = new Set(await readdir(join(root, "screenshots")));
await mkdir(join(dist, "games"), { recursive: true });
await mkdir(join(dist, "images"), { recursive: true });

const games = [];
for (const [, file, token, title, genre, description] of entries) {
    const id = token.toLowerCase();
    const image = title.toLowerCase().replaceAll(" ", "-") + ".png";
    const source = (await read(file)).replace(/\r\n/g, "\n");
    const includes = [...source.matchAll(/^#include "lib\/(\w+)\.jsx"/gm)];
    const libs = await Promise.all(includes
        .filter(([, name]) => !browserModules.has(name))
        .map(([, name]) => read("lib/" + name + ".jsx")));
    // ScriptUI show() blocks until close. The browser dispatches onClose separately.
    const body = source.replace(/^\uFEFF/, "").replace(/^#(?:target|include).*$/gm, "")
        .replace(/(win\.show\(\);)\n    heartbeatStop\(\);(?=\n\}\)\(\);)/, "$1")
        .replace(/(win\.show\(\);\n    \}) finally \{\n        finalizeClose\(\);(?=\n    \}\n\}\)\(\);)/,
            "$1 catch (error) {\n        finalizeClose();\n        throw error;")
        .replace(/^(    var (btnVector|btnExport) = .*;)$/gm, "$1\n    $2.visible = false;");
    const bindings = "Window, heartbeatStart, heartbeatStop, heartbeatLastError, getGameSaveFile, " +
        "readKeyValueFile, writeKeyValueFile, perfNow, perfInit, perfKey, perfFrame, perfNote, perfClose";
    await writeFile(join(dist, "games", id + ".js"),
        "export default function ({ " + bindings + " }) {\n" + libs.join("\n") + "\n" + body + "\n}\n");
    if (assets.has(image)) await cp(join(root, "screenshots", image), join(dist, "images", image));
    games.push({ id, title, genre, description, image: assets.has(image) ? image : null });
}

for (const file of ["index.html", "app.js", "host.js", "style.css"]) {
    await cp(join(web, file), join(dist, file));
}
await writeFile(join(dist, "games.json"), JSON.stringify(games));
await cp(join(root, "LICENSE"), join(dist, "LICENSE"));
console.log("Built " + games.length + " browser games in " + dist);
