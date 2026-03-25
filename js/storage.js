import {appState} from "./state.js";


export function saveTasks(){
    localStorage.setItem("appState", JSON.stringify(appState));
}

export function loadTasks() {
    const saved = localStorage.getItem("appState");

    if(!saved) {return;}
    
    const parsed = JSON.parse(saved);

    appState.games = parsed.games || [];
    appState.activeGameId = parsed.activeGameId || null;
}