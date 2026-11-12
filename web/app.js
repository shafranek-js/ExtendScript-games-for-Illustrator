import { createHost } from "./host.js";

const catalog = document.querySelector("#catalog");
const filtersRoot = document.querySelector("#filters");
const gameList = document.querySelector("#games");
const play = document.querySelector("#play");
const stage = document.querySelector("#game-stage");
const gameRoot = document.querySelector("#game");
const gameSwitch = document.querySelector("#game-switch");
const controlsToggle = document.querySelector("#controls-toggle");
const controlsPanel = document.querySelector("#controls-panel");
const fullscreen = document.querySelector("#fullscreen");
const fullscreenError = document.querySelector("#fullscreen-error");
const title = document.querySelector("#game-title");
const genrePill = document.querySelector("#game-genre");
const touchPad = document.querySelector("#touch-pad");
const error = document.querySelector("#error");
const random = document.querySelector("#random");

const GAME_META = {
    "2048": { input: "Keys / Swipe", keys: [["Arrows / WASD", "Slide tiles"], ["Z", "Undo"], ["R", "Restart"]] },
    "tetris": { input: "Keys / Click", keys: [["Left / Right", "Move"], ["Up", "Rotate"], ["Down", "Soft drop"], ["Space", "Hard drop"], ["C", "Hold"], ["P", "Pause"]] },
    "arkanoid": { input: "Mouse / Keys", keys: [["Mouse / Left-Right", "Paddle"], ["Click / Space", "Launch / Laser"], ["P", "Pause"]] },
    "snake": { input: "Keys / Click", keys: [["Arrows / WASD", "Steer"], ["Space", "Pause / Start"], ["1 / 2 / 3", "Arena mode"]] },
    "spaceinvaders": { input: "Mouse / Keys", keys: [["Mouse / Left-Right", "Move cannon"], ["Click / Space", "Fire"], ["P", "Pause"]] },
    "boulderdash": { input: "Keys / Click", keys: [["Arrows / WASD", "Dig / Move"], ["Space", "Wait / Snap"], ["R", "Restart cave"]] },
    "pacman": { input: "Keys", keys: [["Arrows / WASD", "Turn"], ["Space / P", "Pause / Start"]] },
    "loderunner": { input: "Keys", keys: [["Arrows / WASD", "Run & Climb"], ["Z / X", "Dig left / right"], ["P", "Pause"], ["[ / ]", "Level"]] },
    "xonix": { input: "Keys", keys: [["Arrows / WASD", "Move"], ["Space / P", "Pause / Start"]] },
    "bomberman": { input: "Keys", keys: [["Arrows / WASD", "Move"], ["Space", "Drop bomb"], ["P", "Pause"]] },
    "battlecity": { input: "Keys", keys: [["Arrows / WASD", "Drive tank"], ["Space", "Fire"], ["P", "Pause"]] },
    "sokoban": { input: "Keys / Click", keys: [["Arrows / WASD", "Step / Push"], ["Click tile", "Auto-walk"], ["Z", "Undo"], ["R", "Restart"], ["[ / ]", "Stage"]] }
};

let revision = 0;
let host;
let games = [];
let activeGenre = "ALL";

function readBestBadge(game) {
    try {
        const raw = localStorage.getItem("relax-arcade:" + (game.token || game.title));
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data !== "object") return null;
        if (game.id === "sokoban") {
            let solved = 0;
            for (let i = 0; i < 20; i++) {
                if (data["best" + i]) solved++;
            }
            return solved > 0 ? solved + "/20 stages" : null;
        }
        const best = parseInt(data.best, 10);
        return best > 0 ? "Best " + best.toLocaleString("en-US") : null;
    } catch {
        return null;
    }
}

function fitFullscreenGame() {
    if (document.fullscreenElement !== stage) return;
    const dialog = gameRoot.querySelector(".game-dialog");
    if (!dialog) return;
    const boards = [...dialog.querySelectorAll("canvas")];
    if (!boards.length) return;
    const stageStyle = getComputedStyle(stage);
    const displayedHeight = boards.reduce((height, board) => height + board.getBoundingClientRect().height, 0);
    const boardHeight = boards.reduce((height, board) => height + board.height, 0);
    if (!boardHeight) return;
    const controlsHeight = dialog.getBoundingClientRect().height - displayedHeight;
    let extraHeight = 0;
    for (const child of stage.children) {
        if (child !== gameRoot && !child.hidden && getComputedStyle(child).display !== "none") {
            extraHeight += child.getBoundingClientRect().height + 12;
        }
    }
    const availableHeight = stage.clientHeight - parseFloat(stageStyle.paddingTop) - parseFloat(stageStyle.paddingBottom)
        - extraHeight - controlsHeight;
    for (const board of boards) {
        const width = Math.max(1, Math.floor(availableHeight * board.width / boardHeight));
        board.style.setProperty("--fullscreen-board-width", width + "px");
    }
}

const fullscreenLayout = new ResizeObserver(fitFullscreenGame);

function syncFullscreen() {
    const active = document.fullscreenElement === stage;
    if (active) fitFullscreenGame();
    fullscreen.textContent = active ? "Exit full screen" : "Full screen";
    gameRoot.querySelector(".game-dialog")?.focus({ preventScroll: true });
}

fullscreen.addEventListener("click", async () => {
    fullscreenError.hidden = true;
    try {
        if (document.fullscreenElement === stage) await document.exitFullscreen();
        else await stage.requestFullscreen();
    } catch {
        fullscreenError.textContent = "Full screen is unavailable.";
        fullscreenError.hidden = false;
        gameRoot.querySelector(".game-dialog")?.focus({ preventScroll: true });
    }
});
document.addEventListener("fullscreenchange", syncFullscreen);

controlsToggle.addEventListener("click", () => {
    const nextOpen = controlsPanel.hidden;
    controlsPanel.hidden = !nextOpen;
    controlsToggle.setAttribute("aria-expanded", String(nextOpen));
    gameRoot.querySelector(".game-dialog")?.focus({ preventScroll: true });
});

gameSwitch.addEventListener("change", () => {
    if (gameSwitch.value) location.hash = gameSwitch.value;
});

for (const btn of touchPad.querySelectorAll("[data-key]")) {
    const key = btn.dataset.key;
    let activePointer = null;
    const release = (event) => {
        if (activePointer === null || (event && event.pointerId !== activePointer)) return;
        activePointer = null;
        host?.sendKey(key, false);
    };
    btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        activePointer = event.pointerId;
        try { btn.setPointerCapture(event.pointerId); } catch {}
        host?.sendKey(key, true);
    });
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);
}

function renderControls(game) {
    const meta = GAME_META[game.id] || { input: "Keys", keys: [["Arrows / WASD", "Move"], ["Space", "Action"]] };
    const items = document.createElement("div");
    items.className = "controls-items";
    for (const [k, label] of meta.keys) {
        const chip = document.createElement("span");
        chip.className = "ctrl-chip";
        const kbd = document.createElement("kbd");
        kbd.textContent = k;
        chip.append(kbd, document.createTextNode(label));
        items.append(chip);
    }
    const esc = document.createElement("span");
    esc.className = "ctrl-chip";
    const escKbd = document.createElement("kbd");
    escKbd.textContent = "Esc";
    esc.append(escKbd, document.createTextNode("Close game"));
    controlsPanel.replaceChildren(items, esc);
}

function card(game) {
    const link = document.createElement("a");
    link.className = "card";
    link.href = "#" + game.id;
    link.dataset.genre = game.genre;

    const art = document.createElement("div");
    art.className = "art";
    if (game.image) {
        const image = document.createElement("img");
        image.src = "./images/" + game.image;
        image.alt = game.title + " preview";
        image.loading = "lazy";
        art.append(image);
    } else {
        art.classList.add("crate");
        art.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 3; i++) art.append(document.createElement("span"));
    }

    const meta = document.createElement("div");
    meta.className = "card-meta";
    const genre = document.createElement("span");
    genre.className = "genre";
    genre.textContent = game.genre;
    meta.append(genre);
    const bestText = readBestBadge(game);
    if (bestText) {
        const badge = document.createElement("span");
        badge.className = "best-badge";
        badge.textContent = bestText;
        meta.append(badge);
    }

    const name = document.createElement("h2");
    name.textContent = game.title;
    const description = document.createElement("p");
    description.textContent = game.description;

    const foot = document.createElement("div");
    foot.className = "card-foot";
    const inputTag = document.createElement("span");
    inputTag.className = "input-tag";
    inputTag.textContent = (GAME_META[game.id] && GAME_META[game.id].input) || "Keys";
    const cta = document.createElement("span");
    cta.className = "play-cta";
    cta.textContent = "Play →";
    foot.append(inputTag, cta);

    link.append(art, meta, name, description, foot);
    return link;
}

function renderCatalog() {
    const counts = new Map([["ALL", games.length]]);
    for (const g of games) counts.set(g.genre, (counts.get(g.genre) || 0) + 1);

    const pills = [];
    for (const [genre, count] of counts) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-pill";
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", String(activeGenre === genre));
        btn.textContent = genre === "ALL" ? "All" : genre[0] + genre.slice(1).toLowerCase();
        const cnt = document.createElement("span");
        cnt.className = "filter-count";
        cnt.textContent = String(count);
        btn.append(cnt);
        btn.addEventListener("click", () => {
            activeGenre = genre;
            renderCatalog();
        });
        pills.push(btn);
    }
    filtersRoot.replaceChildren(...pills);

    const visible = activeGenre === "ALL" ? games : games.filter((g) => g.genre === activeGenre);
    gameList.replaceChildren(...visible.map(card));
}

async function route() {
    const current = ++revision;
    if (document.fullscreenElement === stage) {
        await document.exitFullscreen().catch(() => {});
        if (current !== revision) return;
    }
    if (host) host.dispose();
    fullscreenLayout.disconnect();
    host = null;
    gameRoot.replaceChildren();
    fullscreen.hidden = true;
    fullscreenError.hidden = true;
    controlsPanel.hidden = true;
    controlsToggle.setAttribute("aria-expanded", "false");
    error.hidden = true;

    const game = games.find(({ id }) => "#" + id === location.hash);
    catalog.hidden = Boolean(game);
    play.hidden = !game;
    document.title = game ? game.title + " · Relax Arcade" : "Relax Arcade";
    if (!game) {
        renderCatalog();
        return;
    }

    title.textContent = game.title;
    genrePill.textContent = game.genre;
    gameSwitch.value = game.id;
    renderControls(game);
    title.focus();

    try {
        const { default: launch } = await import("./games/" + game.id + ".js");
        if (current !== revision) return;
        host = createHost(gameRoot, () => { location.hash = ""; });
        launch(host);
        fullscreenLayout.observe(stage);
        for (const control of gameRoot.querySelector(".game-dialog").children) {
            if (!(control instanceof HTMLCanvasElement)) fullscreenLayout.observe(control);
        }
        fullscreen.hidden = !document.fullscreenEnabled || !stage.requestFullscreen;
    } catch (cause) {
        if (current !== revision) return;
        if (host) host.dispose();
        gameRoot.replaceChildren();
        error.textContent = "Could not open " + game.title + ".";
        error.hidden = false;
        console.error(cause);
    }
}

try {
    const response = await fetch("./games.json");
    if (!response.ok) throw new Error("Game catalog unavailable");
    games = await response.json();
    gameSwitch.replaceChildren(...games.map((g) => new Option(g.title, g.id)));
    random.addEventListener("click", () => {
        const pool = activeGenre === "ALL" ? games : games.filter((g) => g.genre === activeGenre);
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick) location.hash = pick.id;
    });
    window.addEventListener("hashchange", route);
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) route();
    });
    await route();
} catch (cause) {
    random.disabled = true;
    error.textContent = "Could not load the game catalog.";
    error.hidden = false;
    console.error(cause);
}
