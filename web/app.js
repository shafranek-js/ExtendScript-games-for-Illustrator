import { createHost } from "./host.js";

const catalog = document.querySelector("#catalog");
const gameList = document.querySelector("#games");
const play = document.querySelector("#play");
const gameRoot = document.querySelector("#game");
const title = document.querySelector("#game-title");
const error = document.querySelector("#error");
const random = document.querySelector("#random");
let revision = 0;
let host;
let games = [];

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
    if (host) host.dispose();
    host = null;
    gameRoot.replaceChildren();
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
