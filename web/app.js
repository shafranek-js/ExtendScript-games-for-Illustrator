import { createHost } from "./host.js";

const catalog = document.querySelector("#catalog");
const gameList = document.querySelector("#games");
const play = document.querySelector("#play");
const stage = document.querySelector("#game-stage");
const gameRoot = document.querySelector("#game");
const fullscreen = document.querySelector("#fullscreen");
const fullscreenError = document.querySelector("#fullscreen-error");
const title = document.querySelector("#game-title");
const error = document.querySelector("#error");
const random = document.querySelector("#random");
let revision = 0;
let host;
let games = [];

function fitFullscreenGame() {
    if (document.fullscreenElement !== stage) return;
    const dialog = gameRoot.querySelector(".game-dialog");
    const boards = [...dialog.querySelectorAll("canvas")];
    const toolbar = fullscreen.parentElement;
    const stageStyle = getComputedStyle(stage);
    const displayedHeight = boards.reduce((height, board) => height + board.getBoundingClientRect().height, 0);
    const boardHeight = boards.reduce((height, board) => height + Number(board.dataset.logicalHeight), 0);
    const controlsHeight = dialog.getBoundingClientRect().height - displayedHeight;
    const availableHeight = stage.clientHeight - parseFloat(stageStyle.paddingTop) - parseFloat(stageStyle.paddingBottom)
        - toolbar.getBoundingClientRect().height - parseFloat(getComputedStyle(toolbar).marginBottom) - controlsHeight;
    for (const board of boards) {
        const width = Math.max(1, Math.floor(availableHeight * Number(board.dataset.logicalWidth) / boardHeight));
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

function card(game) {
    const link = document.createElement("a");
    link.className = "card";
    link.href = "#" + game.id;
    const art = document.createElement("div");
    art.className = "art";
    if (game.image) {
        const image = document.createElement("img");
        image.src = "./images/" + game.image;
        image.alt = "";
        image.loading = "lazy";
        art.append(image);
    } else {
        art.classList.add("crate");
        art.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 3; i++) art.append(document.createElement("span"));
    }
    const name = document.createElement("h2");
    name.textContent = game.title;
    const genre = document.createElement("span");
    genre.className = "genre";
    genre.textContent = game.genre;
    const description = document.createElement("p");
    description.textContent = game.description;
    link.append(art, genre, name, description);
    return link;
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
    error.hidden = true;
    const game = games.find(({ id }) => "#" + id === location.hash);
    catalog.hidden = Boolean(game);
    play.hidden = !game;
    document.title = game ? game.title + " · Relax Arcade" : "Relax Arcade";
    if (!game) return;
    title.textContent = game.title;
    title.focus();
    try {
        const { default: launch } = await import("./games/" + game.id + ".js");
        if (current !== revision) return;
        host = createHost(gameRoot, () => { location.hash = ""; });
        launch(host);
        fullscreenLayout.observe(stage);
        fullscreenLayout.observe(fullscreen.parentElement);
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
    gameList.replaceChildren(...games.map(card));
    random.addEventListener("click", () => {
        location.hash = games[Math.floor(Math.random() * games.length)].id;
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
