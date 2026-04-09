import { appState } from "./state.js";

export function saveTasks() {   // Save appState into localStorage so it persists after refresh

    // Strip undoSnapshot to not store undo history in localStorage
    const { undoSnapshot, ...persistable } = appState;
    localStorage.setItem("appState", JSON.stringify(persistable));      // Save only the persistable state
}

export async function loadTasks() {   // Load appState from localStorage on page start
    const saved = localStorage.getItem("appState");

    if (saved) {
        const parsed = JSON.parse(saved);   // Convert stored JSON string back into an object

        // Restore the parts of state that actually persist
        appState.games = parsed.games || [];
        appState.activeGameId = parsed.activeGameId || null;

        // Undo is not restored (No undo history in new session)
        appState.undoSnapshot = null;
        return;
    }

    try {   // Run seed from file path (if it exists)
        const res = await fetch("./seed/appState.seed.json", { cache: "no-store" });
        if (!res.ok) {
            return;     // Stop safely if seed file isn't present
        }

        const seed = await res.json();

        appState.games = seed.games || [];
        appState.activeGameId = seed.activeGameId || null;
        appState.undoSnapshot = null;

        localStorage.setItem("appState", JSON.stringify(seed));     // Store seed so it becomes the user's starting point
    } catch {
        // Stop safely if fetch fails
    }

}