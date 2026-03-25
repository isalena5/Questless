import { appState } from "./state.js";
import { Game, Group, Task } from "./models.js";
import { saveTasks } from "./storage.js";
import { render } from "./render.js";

function commit() {
    saveTasks();
    render();
}

function getActiveGame() {
    return appState.games.find(g => g.id === appState.activeGameId);
}

export function addGame(name) {
    const newGame = new Game(name);

    appState.games.push(newGame);
    appState.activeGameId = newGame.id;

    commit();
}

export function addGroup(name) {
    const game = getActiveGame();
    if (!game) {
        return;
    }

    const newGroup = new Group(name);
    game.groups.push(newGroup);

    commit();
}

/*
==========================================================

------------------- Add Task To Group --------------------

==========================================================
*/

function addTaskToGroup(groupId, title) {
    const game = getActiveGame();

    if (!game) {
        return;
    }

    const group = game.groups.find(g => g.id === groupId);
    if (!group) {
        return;
    }

    const newTask = new Task(title.trim());
    group.tasks.push(newTask);

    commit();
}




/*
==========================================================

------------------------ Add Task ------------------------

==========================================================
*/

export function addTask(title) {
    const game = getActiveGame();
    if (!game || !title.trim()) {
        return;
    }

    const newTask = new Task(title.trim());
    game.tasks.push(newTask);

    commit();
}



/*
==========================================================

---------------------- Add Subtasks ----------------------

==========================================================
*/

export function addSubtask(parentId, title) {
    const task = findTaskInGame(parentId);
    if (!task || !task.subtasks) {
        return;
    }

    const newSubtask = new Task(title.trim(), task.level + 1);
    task.subtasks.push(newSubtask);

    commit();
}



/*
==========================================================

---------------------- Delete Game -----------------------

==========================================================
*/

export function deleteGame(gameId) {
    const index = appState.games.findIndex(g => g.id === gameId);
    if (index === -1) {
        return;
    }

    const wasActive = appState.activeGameId === gameId;

    appState.games.splice(index, 1);    // Remove Game

    // if deleted game was active, switch to next id
    if (wasActive) {
        if (appState.games.length > 0) {
            appState.activeGameId = appState.games[0].id;
        } else {
            addGame("Default Game");
        }
    }

    commit();
}




/*
==========================================================

---------------------- Delete Task -----------------------

==========================================================
*/

export function deleteTask(taskId) {        // Delete task by their ID
    const game = getActiveGame();
    if (!game) return;

    // Standalone
    const standaloneIndex = game.tasks.findIndex(t => t.id === taskId);
    if (standaloneIndex !== -1) {
        game.tasks.splice(standaloneIndex, 1);
        commit();
        return;
    }

    // Groups
    for (let group of game.groups) {
        const index = group.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            group.tasks.splice(index, 1);
            commit();
            return;
        }
    }

    // Delete in subtasks
    for (let task of game.tasks) {
        if (deleteFromSubtasks(task, taskId)) {
            commit();
            return;
        }
    }

    for (let group of game.groups) {
        for (let task of group.tasks) {
            if (deleteFromSubtasks(task, taskId)) {
                commit();
                return;
            }
        }
    }
}

function deleteFromSubtasks(task, taskId) {
    if (!task.subtasks) return false;

    const index = task.subtasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        task.subtasks.splice(index, 1);
        return true;
    }

    for (let sub of task.subtasks) {
        if (deleteFromSubtasks(sub, taskId)) {
            return true;
        }
    }

    return false;
}



/*
==========================================================

------------------- Delete All Tasks ---------------------

==========================================================
*/

export function deleteAll() {
    const game = getActiveGame();
    if (!game) {
        return;
    }

    game.tasks = [];
    game.groups.forEach(group => group.tasks = []);

    commit();
}


/*
==========================================================

----------------------- Find Tasks -----------------------

==========================================================
*/

export function findTaskInGame(taskId) {
    const game = getActiveGame();
    if (!game) {
        return null;
    }

    // Search Standalone Tasks
    for (let task of game.tasks) {
        const found = searchTask(task, taskId);
        if (found) {
            return found;
        }
    }

    // Search Groups
    for (let group of game.groups) {
        for (let task of group.tasks) {
            const found = searchTask(task, taskId);
            if (found) {
                return found;
            }
        }
    }

    return null;
}




/*
==========================================================

---------------------- Search Tasks ----------------------

==========================================================
*/

function searchTask(task, taskId) {
    if (task.id === taskId) {
        return task;
    }

    if (task.subtasks) {
        for (let sub of task.subtasks) {
            const found = searchTask(sub, taskId);
            if (found) {
                return found;
            }
        }
    }

    return null;

}




/*
==========================================================

---------------------- Toggle Task -----------------------

==========================================================
*/

export function toggleTask(taskId) {
    const task = findTaskInGame(taskId);
    if (!task) {
        return;
    }

    task.completed = !task.completed;
    saveTasks();

}

export function findParentTask(childId, tasks = appState.games.find(g => g.id === appState.activeGameId)?.tasks) {
    for (const task of tasks) {
        if (task.subtasks?.some(sub => sub.id === childId)) {
            return task;
        }
        const found = findParentTask(childId, task.subtasks || []);
        if (found) {
            return found;
        }
    }
    return null;
}

export function collapseAllSubtasks(tasks) {
    tasks.forEach(task => {
        task.expanded = false;
        if (task.subtasks) collapseAllSubtasks(task.subtasks);
    });
}

export function collapseIfEmpty(taskId) {
    if (!taskId) {
        return;
    }

    const task = findTaskInGame(taskId);
    if (!task) {
        return;
    }

    // only collapse if no subtasks exist
    if (!task.subtasks || task.subtasks.length === 0) {
        task.expanded = false;

        const parent = findParentTask(taskId);
        if (parent) {
            collapseIfEmpty(parent.id); // recursive collapse
        }
    }
}