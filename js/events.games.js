import { renderGames } from "./render.js";

export function initGameEvents() {
    const container = document.getElementById("games-container");
    if (!container) {
        return;
    }

    container.addEventListener("click", (e) => {
        const card = e.target.closest("[data-game-id]");
        if (!card) {
            return;
        }

        const gameId = card.dataset.gameId;

        window.location.href = `game.html?id=${gameId}`;

    });
}