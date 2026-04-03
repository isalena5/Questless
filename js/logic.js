import { appState } from "./state.js";
import { Game, Group, Task } from "./models.js";
import { saveTasks } from "./storage.js";
import { render } from "./render.js";


/*
==========================================================

--------------------- Commit Helper ----------------------

==========================================================
*/
// Special cases:
// - Not used for toggle
function commit() {     // Call this after modifying state
    saveTasks();
    render();
}




/*
==========================================================

------------------- Get Active Game ID -------------------

==========================================================
*/
function getActiveGame() {  // Return the currently active game object
    return appState.games.find(g => g.id === appState.activeGameId);
}




/*
==========================================================

-------------------- Create New Game ---------------------

==========================================================
*/
export function addGame(name) {   
    const newGame = new Game(name);

    appState.games.push(newGame);
    appState.activeGameId = newGame.id;     // Switch new game to active game

    commit();
}



/*
==========================================================

--------- Create Groups (of tasks) Inside Games ----------

==========================================================
*/
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

----------------------- Drag Tasks -----------------------

==========================================================
*/
// * - Tasks can only move within same level
//

export function reorderTasks(draggedId, targetId) {     // Moves dragged task before target task
    if (draggedId === targetId) {
        return;
    }

    const game = appState.games.find(g => g.id === appState.activeGameId);
    if (!game) {
        return;
    }

    // Find which are both parents arrays before moving
    const draggedParent = findParentArray(game.tasks, draggedId);
    const targetParent = findParentArray(game.tasks, targetId);

    if (!draggedParent || !targetParent) {
        return;
    }

    // Prevent cross-level drag
    if (draggedParent !== targetParent) {      // If task is not in the same level,
        return;                                // do nothing
    }

    const fromIndex = draggedParent.findIndex(t => t.id === draggedId);
    const toIndex = targetParent.findIndex(t => t.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
        return;
    }

    // Insert before target
    const [moved] = draggedParent.splice(fromIndex, 1);
    targetParent.splice(toIndex, 0, moved);
}




/*
==========================================================

------------------- Find Parent Array --------------------

==========================================================
*/
function findParentArray(tasks, targetId) {     // Find parent array containing target (recursively)
    for (let task of tasks) {
        if (task.id === targetId) {
            return tasks;
        }

        if (task.subtasks) {
            const found = findParentArray(task.subtasks, targetId);
            if (found) {
                return found;
            }
        }
    }
    return null;
}





/*
==========================================================

------------------- Add Task To Group --------------------

==========================================================
*/
//  (Not used yet in program)
//
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

-------------------- Add Parent Task ---------------------

==========================================================
*/
export function addTask(title) {    // Just for standalone tasks, not grouped
    const game = getActiveGame();

    if (!game || !title.trim()) {   // Prevent empty tasks or invalid state
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

    if (!task || !task.subtasks) {      // Cannot add if task doesn't exist or cannot have children
        return;
    }

    const newSubtask = new Task(title.trim(), task.level + 1);
    task.subtasks.push(newSubtask);

    commit();
}




/*
==========================================================

---------------------- Delete Task -----------------------

==========================================================
*/
export function deleteTask(taskId) {        // Delete task by their ID
    const game = getActiveGame();
    if (!game) {
        return;
    }

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

    // Delete in subtasks (recursive)
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





/*
==========================================================

-------------------- Delete Subtask ----------------------

==========================================================
*/
function deleteFromSubtasks(task, taskId) {         // Recursively removes a task from nested subtasks
    if (!task.subtasks) { 
        return false;
    }

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
export function deleteAll() {                           // Deletes all tasks inside current game
    const game = getActiveGame();
    if (!game) {
        return;
    }

    game.tasks = [];                                    // Clear standalone tasks
    game.groups.forEach(group => group.tasks = []);     // Clear all group tasks

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

    if (wasActive) {                    // If deleted game was active, switch to next id
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
function searchTask(task, taskId) {     // Search recursively through task tree
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

    const newState = !task.completed;

    toggleDown(task, newState);         // Apply to parent task and all children (down)

    updateParents(taskId);              // Match parent task to subtasks (up)

    saveTasks();                        // No render, it's handled by events

}

function toggleDown(task, state) {      // Recursively apply state downward
    task.completed = state;

    if (task.subtasks) {
        task.subtasks.forEach(sub => toggleDown(sub, state));
    }
}

function updateParents(taskId) {        // Update parent based on children
    const parent = findParentTask(taskId);
    if (!parent) {
        return;
    }

    const allDone = parent.subtasks.every(t => t.completed);

    parent.completed = allDone;

    updateParents(parent.id); // upwards recursively
}



/*
==========================================================

------------------ Find Parent of Task -------------------

==========================================================
*/
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



/*
==========================================================

--------- Collapse entire task tree (UI Reset) -----------

==========================================================
*/
export function collapseAllSubtasks(tasks) {
    tasks.forEach(task => {
        task.expanded = false;
        if (task.subtasks) collapseAllSubtasks(task.subtasks);
    });
}



/*
==========================================================

----------------- Collapse Empty Tasks -------------------

==========================================================
*/
export function collapseIfEmpty(taskId) {       // Collapse empty tasks when user leaves input
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

/*
==========================================================

------------------- Rename Game Title --------------------

==========================================================
*/
export function renameGame(gameId, name) {
  const nextName = String(name ?? "").trim();       // Normalize title format

  if (!nextName) {                                  // Block empty names to not save a blank label into state
    return false;
  }

  const game = appState.games.find((g) => String(g.id) === String(gameId));     // Compare ids safely

  if (!game) {
    return false;
  }

  game.name = nextName;     // Apply change directly to app state
  saveTasks();              // Persist changes so refresh/navigation keeps the rename
  return true;
}