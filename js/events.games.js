import { renderGames } from "./render.js";
import { renameGame } from "./logic.js";

let activeEdit = null; // Tracks the current inline edit session (one at a time)

/*
==========================================================

---------------- Inline Rename Helpers -------------------

==========================================================
*/
function setInputWidth(input) {     // Snug the input so it feels like editing the text itself
    input.style.width = `${Math.max(4, input.value.length + 1)}ch`;
}

function cancelEdit() {            // Exit edit mode without saving and restore the original title
    if (!activeEdit) {
        return;
    }

    const { input, originalName } = activeEdit;
    activeEdit = null;

    const p = document.createElement("p");
    p.className = "text-white font-bold";
    p.setAttribute("data-game-name", "");
    p.textContent = originalName;

    input.replaceWith(p);
}

function commitEdit() {             // Save the current input value into state and re-render the cards
    if (!activeEdit){
        return;
    }

    const { gameId, input, originalName } = activeEdit;
    activeEdit = null;

    const ok = renameGame(gameId, input.value);
    
    // Prevent empty/invalid names by reverting quickly
    if (!ok) {
        const p = document.createElement("p");
        p.className = "text-white font-bold";
        p.setAttribute("data-game-name", "");
        p.textContent = originalName;
        input.replaceWith(p);
        return;
    }

    renderGames();   // Rebuild cards with the updated name
}

function startInlineEdit(card) {     // Swap the title <p> into an <input> and add Enter/Esc behavior
    const gameId = card.dataset.gameId;
    if (!gameId) {
        return;
    }

    const titleEl = card.querySelector("[data-game-name]");
    if (!titleEl) {
        return;
    }

    if (activeEdit) {               // Only allow one active editor at a time
        cancelEdit();
    }

    const originalName = titleEl.textContent ?? "";
    const input = document.createElement("input");
    input.type = "text";
    input.value = originalName;

    // Match the existing title styling
    input.className = "bg-transparent text-white font-bold text-center focus:outline-none";
    input.autocomplete = "off";
    input.spellcheck = false;

    setInputWidth(input);
    titleEl.replaceWith(input);

    activeEdit = { gameId, input, originalName };
    
    input.addEventListener("input", () => setInputWidth(input));    // Live resize so input always fits text as you type
    input.addEventListener("click", (e) => e.stopPropagation());    // Prevent card click navigation while the user is editing

    input.addEventListener("keydown", (e) => {                      // 'Enter' to confirm & 'Esc' to cancel
        e.stopPropagation();
        if (e.key === "Enter") {
            e.preventDefault();
            commitEdit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
        }
    });

    // Clicking away would still keep the changes
    input.addEventListener("blur", () => commitEdit());

    input.focus();
    input.select();
}


/*
==========================================================

--------------- Homepage Game Events Init ----------------

==========================================================
*/
export function initGameEvents() {
    const container = document.getElementById("games-container");
    if (!container) {       // Stop safely if this page does not contain the games container
        return;
    }
    
    if (container.dataset.gamesEventsBound === "1") {       // Prevents double-binding if init runs again
        return;
    }
    
    container.dataset.gamesEventsBound = "1";

    /*
   ==========================================================

   -------------------- Game Card Click --------------------

   ==========================================================
   */
    container.addEventListener("click", (e) => {
        // If the click happened on the edit button, do not navigate
        const editBtn = e.target.closest(".edit-game-btn");
        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const card = editBtn.closest("[data-game-id]");
            if (card) startInlineEdit(card);
            return;
        }

        if (e.target.closest("input")) {
            return;
        }

        // Find the closest game card that stores a game id
        const card = e.target.closest("[data-game-id]");
        if (!card || !container.contains(card)) {
            return;
        }

        window.location.assign(`game.html?id=${encodeURIComponent(card.dataset.gameId)}`);    // Navigate to the task page for that specific game

    });
}