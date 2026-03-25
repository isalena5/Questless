import { loadTasks } from "./storage.js";
import { render, renderGames } from "./render.js";
import { appState } from "./state.js";
import { Game } from "./models.js";
import { initTaskEvents } from "./events.tasks.js";
import { initGameEvents } from "./events.games.js";

window.appState = appState;

function init() {
    loadTasks();

    if (appState.games.length === 0) {

        /*
        // Test
        const g1 = new Game("Game 1");
        const g2 = new Game("Game 2");
        const g3 = new Game("Game 3");

        appState.games.push(g1, g2, g3);
        appState.activeGameId = g1.id;

        localStorage.setItem("appState", JSON.stringify(appState)); */

        const defaultGame = new Game("Default Game");

        appState.games.push(defaultGame);
        appState.activeGameId = defaultGame.id;

        localStorage.setItem("appState", JSON.stringify(appState));
    }

    const hasTaskUI = document.getElementById("list-container");
    const hasGameUI = document.querySelector(".cd-cards-group");

    if (hasTaskUI) {

        const gameExists = appState.games.some(g => g.i == appState.activeGameId);

        if (!gameExists) {
            appState.activeGameId = appState.games[0]?.id;
        }

        initTaskEvents();
        render();
    }

    else if (hasGameUI) {
        initGameEvents();
        renderGames();
    }
}

init();