import { loadTasks } from "./storage.js";
import { render, renderGames } from "./render.js";
import { appState } from "./state.js";
import { Game } from "./models.js";
import { initTaskEvents } from "./events.tasks.js";
import { initGameEvents } from "./events.games.js";

window.appState = appState;     // !!! Dev helper to inspect state in the console


/*
==========================================================

--------------- Active Game From URL Param ---------------

==========================================================
*/
function setActiveGameFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (gameId) {
        appState.activeGameId = gameId;     // Keep navigation state in sync with ?id=
    }
}


/*
==========================================================

------------------- Game Page Breadcrumbs ----------------

==========================================================
*/
function initBreadcrumbs() {
  const crumb = document.getElementById("breadcrumb-game-name");
  if (!crumb) {         // Stop safely if this page does not contain breadcrumbs
    return;
  }

  const game = appState.games.find((g) => String(g.id) === String(appState.activeGameId));
  crumb.textContent = game?.name ?? "Game";
}


/*
==========================================================

---------------- Dev Patch: Game Cover URLs --------------

==========================================================
*/
function devPatchGameCovers() {
  const byName = {
    "Default Game": "../covers/default.png",
    "Planning Questless": "../covers/PlanningQuestless.png",
    "Cities: Skylines I": "../covers/CitiesSkylines.png",
    "Tomodachi Life 2": "../covers/TomodachiLife2.png",
  };

  let changed = false;

  for (const g of appState.games) {

    if (!g.coverUrl) {                                              // Only fill missing covers for existing saved games
      g.coverUrl = byName[g.name] ?? "../covers/default.jpg";
      changed = true;
    }
    else if (byName[g.name] && g.coverUrl !== byName[g.name]) {     // Keep known covers consistent by name
      g.coverUrl = byName[g.name];
      changed = true;
    }
  }

  if (changed) localStorage.setItem("appState", JSON.stringify(appState));      // Persist patched covers once
}


/*
==========================================================

---------------------- Program Init ----------------------

==========================================================
*/
function init() {

    loadTasks();                // Load saved app state from localStorage first
    devPatchGameCovers();       // !!! Dev-only: assign covers to existing games
    setActiveGameFromUrl();     // Apply the game id from the URL after loading saved data

    if (appState.games.length === 0) {  // If there are no saved games yet, create a default game

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

    // Detect which page UI to render:
    // - Task page (game.html)
    // - Home page with the game card group
    const hasTaskUI = document.getElementById("list-container");
    const hasGameUI = document.querySelector(".cd-cards-group");


    /*
    * Task page setup
    */
    if (hasTaskUI) {    // Check whether the active game id actually exists

        const gameExists = appState.games.some(g => g.id == appState.activeGameId);

        if (!gameExists) {     // Fallback to first game if the active one is invalid
            appState.activeGameId = appState.games[0]?.id;
        }

        initBreadcrumbs();     // Update breadcrumb label with the active game name

        // Attach task-page event listeners
        // and render the task UI
        initTaskEvents();
        render();
    }

    /*
    * Homepage setup
    */
    else if (hasGameUI) {

        // Attach homepage game-card events
        // and render game cards
        initGameEvents();
        renderGames();
    }
}


// Start Program
init();