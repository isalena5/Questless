import { appState } from "./state.js";

export function saveTasks() {   // Save appState into localStorage so it persists after refresh

    // Strip undoSnapshot to not store undo history in localStorage
    const { undoSnapshot, ...persistable } = appState;
    localStorage.setItem("appState", JSON.stringify(persistable));      // Save only the persistable state
}

export function loadTasks() {   // Load appState from localStorage on page start
    const saved = localStorage.getItem("appState");

    if (!saved) {                       // Stop safely if there's nothing saved yet
        return;
    }

    const parsed = JSON.parse(saved);   // Convert stored JSON string back into an object

    // Restore the parts of state that actually persist
    appState.games = parsed.games || [];
    appState.activeGameId = parsed.activeGameId || null;

    // Undo is not restored (No undo history in new session)
    appState.undoSnapshot = null;
}