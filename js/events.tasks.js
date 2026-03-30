import { addTask, addSubtask, toggleTask, deleteTask, deleteAll, findTaskInGame, findParentTask, collapseIfEmpty, reorderTasks } from "./logic.js";
import { saveTasks } from "./storage.js";
import { render } from "./render.js";
import { appState } from "./state.js";

/*
==========================================================

------------------- Global Variables ---------------------

==========================================================
*/

let draggedTaskId = null;            // Tracks which task is currently being dragged
let pendingConfirmAction = null;    // Tracks the function that should run when the user confirms a modal action




/*
==========================================================

-------------------- Reusable Modal ----------------------

==========================================================
*/
function openConfirmModal({ title, message, confirmText, confirmClass = "btn-error", onConfirm
}) {

    // Get modal elements from the page
    const modal = document.getElementById("my_modal_1");
    const titleEl = document.getElementById("confirm-modal-title");
    const messageEl = document.getElementById("confirm-modal-message");
    const confirmBtn = document.getElementById("confirm-delete-all");

    // Update the modal text so it can be reused for different actions
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;

    // Replace the confirm button classes so the button can change color
    // (Added just in case I wanted to change this later on)
    confirmBtn.className = `btn ${confirmClass}`;


    pendingConfirmAction = onConfirm;       // Save to run later when the user clicks "confirm"
    modal.showModal();                      // Open the modal
}




/*
==========================================================

---------------- Extract TaskID from ID ------------------

==========================================================
*/
function getTaskIdFromEvent(e) {
    const li = e.target.closest("li");  // Find the closest <li> for the clicked/changed element

    // If a matching <li> exists, return its task id
    // Otherwise return null so callers can safely stop
    return li ? li.dataset.id : null;
}




/*
==========================================================

--------- Handles Adding Task from Input Field -----------

==========================================================
*/
function handleAddTask(inputBox) {          // Shared handler (btns & 'enter' key) for adding a parent task
    const title = inputBox.value.trim();    // Remove extra spaces
    if (!title) {                           // Do nothing if the input is empty after trimming
        return;
    }

    addTask(title);                         // Add task
    inputBox.value = "";                    // Clear the input after adding task
}




/*
==========================================================

------------ Handles Task Row Click Behavior -------------

==========================================================
*/
function handleListClick(e) {

    // Check whether the click happened on one of the row controls
    const deleteButton = e.target.closest(".delete");
    const checkbox = e.target.matches('input[type="checkbox"]');
    const drag = e.target.closest(".drag-handle");
    const swap = e.target.closest(".swap");

    const taskId = getTaskIdFromEvent(e);   // Get the task id for the clicked row
    if (!taskId) {
        return;
    }

    if (deleteButton) {                     // If delete button was clicked, delete the task and return
        deleteTask(taskId);
        return;
    }

    if (drag || swap || checkbox) {        // If the user clicked a control, do not open the side drawer
        return;
    }

    const parent = findParentTask(taskId);      // Only root tasks should open the side drawer
    if (parent) {                               // If the task has a parent, it is not a root task
        return;
    }

    appState.selectedTaskId = taskId;           // Store the currently selected task for the drawer


    const task = findTaskInGame(taskId);        // Load the full task so the drawer can be filled with its current data
    if (!task) {
        return;
    }

    // Reset drawer editing state whenever a new task is opened
    appState.editingTaskId = null;
    appState.editingValue = task.title;
    appState.editingDescription = task.description || "";

    // Keep copies of the original values so "discard changes" can restore them
    appState.originalTitle = task.title;
    appState.originalDescription = task.description || "";

    appState.isTaskUnsaved = false;     // Opening a task should not immediately count as having unsaved changes

    render();                           // Re-render so the drawer appears with the selected task data
}




/*
==========================================================

--------------- Tracks Unsaved Drawer Edits -------------

==========================================================
*/
function updateDirtyState() {
    appState.isTaskUnsaved =                                        // If the title or the description is changed,
        appState.editingValue !== appState.originalTitle ||         // mark the drawer as having unsaved changes
        appState.editingDescription !== appState.originalDescription;
}






//////////////////////////////////////////////////////////




/*
==========================================================

--------------- Task Page Events Function ----------------

==========================================================
*/

export function initTaskEvents() {

    /*
    * DOM Nodes
    */

    // Main page elements
    const inputBox = document.getElementById("input-box");
    const listContainer = document.getElementById("list-container");
    const addBtn = document.getElementById("add-btn-js");
    const resetBtn = document.getElementById("deleteAll-btn-js");

    // Shared modal elements
    const modal = document.getElementById("my_modal_1");
    const confirmBtn = document.getElementById("confirm-delete-all");
    const cancelBtn = document.getElementById("cancel-delete-all");


    /*
    * Change Event:
    * - Expand/collapse toggle
    * - Task completion checkbox 
    */

    document.addEventListener("change", function (e) {
        if (!e.target.closest("#list-container, #subtasks-container")) {        // Only react to changes coming from the main list or compact drawer list
            return;
        }

        const taskId = getTaskIdFromEvent(e);                                   // Get the task id related to the changed element
        if (!taskId) {
            return;
        }

        // Finds the checkbox hidden inside the DaisyUI "swap" control,
        // which controls expanded/collapsed state
        const swapCheckbox = e.target.closest(".swap")?.querySelector('input[type="checkbox"]');

        // Handle expand/collapse toggle separately from task completion
        if (swapCheckbox && e.target === swapCheckbox) {
            const newTaskId = taskId;
            const prevTaskId = appState.creatingSubtaskFor;

            // If the user moved from one expandable task to another,
            // collapse the previous one if it was still empty
            if (prevTaskId && prevTaskId !== newTaskId) {
                collapseIfEmpty(prevTaskId);
            }

            const task = findTaskInGame(newTaskId);             // Find the actual task object in state
            if (!task) {
                return;
            }

            // Read the visual checkbox state and store it on the task
            const isExpanded = swapCheckbox.checked;
            task.expanded = isExpanded;

            if (isExpanded) {   // If expanded, this task becomes the active place where a subtask can be created
                appState.creatingSubtaskFor = newTaskId;
            }

            else {             // If collapsed, fall back to its parent if it exists
                const parent = findParentTask(newTaskId);
                appState.creatingSubtaskFor = parent ? parent.id : null;
            }

            saveTasks();      // Save immediately so expanded/collapsed state persists
            setTimeout(render, 200);    // Delay render a bit so the UI animation can finish first.
            return;
        }

        if (e.target.classList.contains("task-checkbox")) {     // Handle the actual completion checkbox
            toggleTask(taskId);                                 // (intentionally specific so the swap checkbox is not triggered)

            setTimeout(render, 400);                            // Delayed render to preserve DaisyUI's checkbox animation
            return;
        }
    });



    /*
    * Drag functionality Events
    */

    listContainer.addEventListener("dragstart", (e) => {

        // Only allow dragging from the drag handle, not the whole row
        const handle = e.target.closest(".drag-handle");
        if (!handle) {
            e.preventDefault();
            return;
        }

        // Find the row being dragged
        const li = handle.closest("li");
        if (!li) {
            return;
        }

        // Store the dragged task id for later use in the drop event
        draggedTaskId = li.dataset.id;
    });

    listContainer.addEventListener("dragover", (e) => {     // Allows dropping
        e.preventDefault();
    });

    listContainer.addEventListener("drop", (e) => {

        // Find the row where the task was dropped
        const li = e.target.closest("li");
        if (!li || !draggedTaskId) {
            return;
        }

        const targetId = li.dataset.id;

        if (draggedTaskId === targetId) {       // Do nothing if task is dropped on itself
            return;
        }

        reorderTasks(draggedTaskId, targetId);  // Reorder the tasks in state

        draggedTaskId = null;                   // Clear drag state after finishing the move

        saveTasks();                             // Save and re-render so new order stays
        render();
    });



    /*
    * Subtask input events
    */

    listContainer.addEventListener("keydown",
        function (e) {
            if (!e.target.classList.contains("subtask-input")) {    // Only react when the user is typing in the subtask input
                return;
            }

            if (e.key !== "Enter") {                                // Create subtask when 'Enter' is pressed
                return;
            }

            const title = e.target.value.trim();
            const parentId = appState.creatingSubtaskFor;

            if (title) {                                            // Only add the subtask if there is actual text
                addSubtask(parentId, title);
            }

            render();                                               // Re-render so the new subtask appears
        });




    /*
    * Focusout Event:
    * - Clicking away from subtask input box
    * - Collapsing empty nodes
    */

    listContainer.addEventListener("focusout", function (e) {
        if (!e.target.classList.contains("subtask-input")) {    // Only handle focus leaving the subtask input
            return;
        }

        const title = e.target.value.trim();
        const parentId = appState.creatingSubtaskFor;

        if (title) {                                            // If there is text, save it as a new subtask
            addSubtask(parentId, title);
        }
        else {
            collapseIfEmpty(parentId);                          // Collapse only if user abandoned input empty
            appState.creatingSubtaskFor = null;
        }

        render();                                               // Re-render to update UI
    });




    /*
    * Parent Task Creation Event(s):
    * - Add btn
    * - "Enter" key
    */

    addBtn.addEventListener("click", () => handleAddTask(inputBox));      // Add task with the button

    inputBox.addEventListener("keypress",                                 // Add task by pressing Enter in the main input box
        function (e) {
            if (e.key === "Enter") {
                handleAddTask(inputBox);
            }
        });





    /*
    * Delete all tasks & modal events
    */
    resetBtn.addEventListener("click", () => {
        openConfirmModal({                          // Modal values for when user clicks the "Delete all" button
            title: "WARNING: Delete all tasks?",
            message: "This will permanently delete all objectives in this game.",
            confirmText: "Delete all",
            confirmClass: "btn-error",
            onConfirm: () => {
                deleteAll();
            }
        });
    });

    confirmBtn.addEventListener("click", () => {
        if (pendingConfirmAction) {                // Run the currently stored confirm action
            pendingConfirmAction();
        }

        pendingConfirmAction = null;              // Clear the action so old actions don't accidentally run later
        modal.close();
    });

    cancelBtn.addEventListener("click", () => {
        pendingConfirmAction = null;             // Cancel clears the pending action  
        modal.close();                           // Close modal
    });



    /*
    * Click Events
    */

    document.addEventListener("click", (e) => {

        if (e.target.closest("#list-container, #subtasks-container")) {             // Handle clicks inside the main list or the compact drawer list
            handleListClick(e);
        }

        // Save button inside drawer
        if (e.target.closest("#save-task-btn")) {
            const taskId = appState.editingTaskId || appState.selectedTaskId;
            const task = findTaskInGame(taskId);
            if (!task) {
                return;
            }

            // Only overwrite title when editing the title input
            if (appState.editingTaskId) {
                task.title = appState.editingValue.trim() || task.title;
            }

            // // Save the description
            const desc = (appState.editingDescription || "").trim();
            task.description = desc;

            // After saving, refresh the original values so the current state becomes the new state
            appState.originalTitle = task.title;
            appState.originalDescription = task.description;

            // Keep drawer edit state in sync with saved changes
            appState.editingDescription = task.description;

            // End title edit mode
            appState.editingTaskId = null;
            appState.editingValue = "";

            // When saving it updates to no longer have unsaved changes
            appState.isTaskUnsaved = false;

            saveTasks();
            render();
            return;
        }

        // Discard button inside drawer
        if (e.target.closest("#discard-task-btn")) {
            openConfirmModal({                                  // Modal values for when user clicks the "Discard changes" button
                title: "WARNING: Discard changes?",
                message: "Your unsaved changes will be lost.",
                confirmText: "Discard",
                confirmClass: "btn-error",
                onConfirm: () => {
                    const task = findTaskInGame(appState.selectedTaskId);

                    // Restore original values kept in app state
                    appState.editingTaskId = null;
                    appState.editingValue = appState.originalTitle ?? "";
                    appState.editingDescription = appState.originalDescription ?? task?.description ?? "";
                    appState.isTaskUnsaved = false;

                    render();
                }
            });

            return;
        }


        // Edit title:
        // Clicking the task title in the drawer turns it into an input field
        const titleEl = e.target.closest("[data-task-title]");
        if (titleEl) {
            const taskId = titleEl.dataset.taskTitle;
            const task = findTaskInGame(taskId);
            if (!task) {
                return;
            }

            // Only allows title editing for root tasks
            const parent = findParentTask(taskId);
            if (parent) {
                return;
            }

            // Start title edit mode and load current values into edit state
            appState.editingTaskId = taskId;
            appState.editingValue = task.title;
            appState.editingDescription = task.description || "";

            // Opening edit mode should not count as unsaved changes yet
            appState.isTaskUnsaved = false;

            render();
            return;
        }

        // Outside click:
        // if the click is not inside the list, drawer, or modal,
        // collapse empty active subtask creation state
        const isInsideList = e.target.closest("#list-container");
        const isInsidePanel = e.target.closest("#task-detail-panel");
        const isInsideModal = e.target.closest("#my_modal_1");

        if (!isInsideList && !isInsidePanel && !isInsideModal) {
            const activeId = appState.creatingSubtaskFor;

            collapseIfEmpty(activeId);
            appState.creatingSubtaskFor = null;

            render();
        }
    });


    /*
    * Input Events
    */

    document.addEventListener("input", (e) => {

        // Live title editing inside the drawer
        const titleInput = e.target.closest("[data-edit-task]");
        if (titleInput) {
            appState.editingValue = titleInput.value;
            updateDirtyState();

            // Re-render the drawer so button enabled/disabled state updates
            renderTaskDetail();
            return;
        }


        // Live description editing inside the drawer
        const descInput = e.target.closest("[data-edit-description]");
        if (descInput) {
            appState.editingDescription = descInput.value;
            updateDirtyState();

            // Re-render the drawer so button enabled/disabled state updates
            renderTaskDetail();
        }
    });

    
    // Initial Page load
    saveTasks();
    render();
}