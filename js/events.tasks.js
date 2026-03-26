import { addTask, addSubtask, toggleTask, deleteTask, deleteAll, findTaskInGame, findParentTask, collapseIfEmpty, reorderTasks } from "./logic.js";
import { saveTasks } from "./storage.js";
import { render } from "./render.js";
import { appState } from "./state.js";

/*
==========================================================

------------------- Global Variables ---------------------

==========================================================
*/

let draggedTaskId = null;   // Tracks which task is currently being dragged


/*
==========================================================

---------------- Extract TaskID from ID ------------------

==========================================================
*/
function getTaskIdFromEvent(e) {        // Extract taskId (safely) from event target 
    const li = e.target.closest("li");
    return li ? li.dataset.id : null;
}


/*
==========================================================

--------- Handles Adding Task from Input Field -----------

==========================================================
*/
function handleAddTask(inputBox) {      // Shared handler (btns & 'enter' key) for adding a parent task
    const title = inputBox.value.trim();
    if (!title) {
        return;
    }

    addTask(title);
    inputBox.value = "";
}





//////////////////////////////////////////////////////////




/*
==========================================================

--------------- Task Page Events Function ----------------

==========================================================
*/

export function initTaskEvents() {
    const inputBox = document.getElementById("input-box");
    const listContainer = document.getElementById("list-container");
    const addBtn = document.getElementById("add-btn-js");
    const resetBtn = document.getElementById("deleteAll-btn-js");

    // Modal elements
    const modal = document.getElementById("my_modal_1");
    const confirmBtn = document.getElementById("confirm-delete-all");
    const cancelBtn = document.getElementById("cancel-delete-all");


    /*
    * Change Event:
    * - Expand/collapse toggle
    * - Task completion checkbox 
    */

    listContainer.addEventListener("change", function (e) {
        const taskId = getTaskIdFromEvent(e);
        if (!taskId) {
            return;
        }

        // Expand/collapse (swap) toggle
        const swapCheckbox = e.target.closest(".swap")?.querySelector('input[type="checkbox"]');

        if (swapCheckbox && e.target === swapCheckbox) {
            const newTaskId = taskId;
            const prevTaskId = appState.creatingSubtaskFor;

            if (prevTaskId && prevTaskId !== newTaskId) {       // Collapse previous empty task if still empty (no added tasks)
                collapseIfEmpty(prevTaskId);
            }

            const task = findTaskInGame(newTaskId);
            if (!task) {
                return;
            }

            const isExpanded = swapCheckbox.checked;
            task.expanded = isExpanded;

            if (isExpanded) {                                   // Track which task is being added subtasks to
                appState.creatingSubtaskFor = newTaskId;
            }

            else {
                const parent = findParentTask(newTaskId);
                appState.creatingSubtaskFor = parent ? parent.id : null;
            }

            setTimeout(() => {      // For Daisy UI rendering
                render();
            }, 200);

            return;
        }

        // Task completion checkbox
        if (e.target.type === "checkbox") {
            toggleTask(taskId);

            setTimeout(() => {     // For Daisy UI rendering
                render();
            }, 200);
        }
    });




    /*
    * Drag functionality Events
    */

    listContainer.addEventListener("dragstart", (e) => {
        const handle = e.target.closest(".drag-handle");
        if (!handle) {
            e.preventDefault();     // Only allow drag from handle
            return;
        }

        const li = handle.closest("li");
        if (!li) {
            return;
        }

        draggedTaskId = li.dataset.id;
    });

    listContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    listContainer.addEventListener("drop", (e) => {
        const li = e.target.closest("li");
        if (!li || !draggedTaskId) {
            return;
        }

        const targetId = li.dataset.id;

        if (draggedTaskId === targetId) {       // prevent self-drop
            return;
        }

        reorderTasks(draggedTaskId, targetId);

        draggedTaskId = null;
        saveTasks();
        render();
    });




    /*
    * Delete btn (one task) click Event
    */

    listContainer.addEventListener("click",
        function (e) {
            const deleteButton = e.target.closest(".delete");
            if (!deleteButton) {
                return;
            }

            const taskId = getTaskIdFromEvent(e);
            if (!taskId) {
                return;
            }

            deleteTask(taskId);

        });


    /*
    * Subtask creation "Enter" Event
    */

    listContainer.addEventListener("keydown",
        function (e) {
            if (!e.target.classList.contains("subtask-input")) {
                return;
            }

            if (e.key !== "Enter") {
                return;
            }

            const title = e.target.value.trim();
            const parentId = appState.creatingSubtaskFor;

            if (title) {
                addSubtask(parentId, title);
            }

            render();
        });



    /*
    * Focusout Event:
    * - Clicking away from subtask input box
    * - Collapsing empty nodes
    */

    listContainer.addEventListener("focusout", function (e) {
        if (!e.target.classList.contains("subtask-input")) {
            return;
        }

        const title = e.target.value.trim();
        const parentId = appState.creatingSubtaskFor;

        if (title) {
            addSubtask(parentId, title);
        }
        else {
            collapseIfEmpty(parentId);          // Collapse only if user abandoned input
            appState.creatingSubtaskFor = null;
        }

        render();
    });




    /*
    * Parent Task Creation Event(s):
    * - Add btn
    * - "Enter" key
    */

    addBtn.addEventListener("click", () => handleAddTask(inputBox));      // Add btn click

    inputBox.addEventListener("keypress",     // "Enter" keypress
        function (e) {
            if (e.key === "Enter") {
                handleAddTask(inputBox);
            }
        });


    /*
    * Delete all tasks & modal
    */
    resetBtn.addEventListener("click", () => {
        modal.showModal();
    });

    confirmBtn.addEventListener("click", () => {
        deleteAll();
        modal.close();
    });

    cancelBtn.addEventListener("click", () => {
        modal.close();
    });



    /*
    *  Global click Event:
    * - Collapse active empty node when clicking outside task list
    */
    document.addEventListener("click", (e) => {
        const isInsideList = e.target.closest("#list-container");
        if (isInsideList) {
            return;
        }

        const activeId = appState.creatingSubtaskFor;

        collapseIfEmpty(activeId);
        appState.creatingSubtaskFor = null;

        render();
    });


    
    // Initial Page load
    saveTasks();
    render();
}