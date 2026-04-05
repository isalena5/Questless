import { addTask, addSubtask, toggleTask, deleteTask, deleteAll, findTaskInGame, findParentTask, collapseIfEmpty, reorderTasks, recordUndoSnapshot, undoLastChange } from "./logic.js";
import { saveTasks } from "./storage.js";
import { render } from "./render.js";
import { appState } from "./state.js";

/*
==========================================================

------------------- Global Variables ---------------------

==========================================================
*/

let draggedTaskId = null;            // Tracks which task is currently being dragged
let pendingConfirmAction = null;     // Tracks the function that should run when the user confirms a modal action
let dropIndicatorLi = null;          // Tracks which <li> currently shows the drop indicator line



/*
==========================================================

-------------- Drag Drop Indicator Helpers ---------------

==========================================================
*/
function clearDropIndicator() {
    if (!dropIndicatorLi) {         // Nothing highlighted right now, so nothing to clear
        return;
    }

    dropIndicatorLi.classList.remove("drop-before", "drop-after");  // Remove both possible indicator classes from the last highlighted row
    dropIndicatorLi = null;                                         // Forget which row was highlighted
}

function setDropIndicator(li, before) {
    if (!li) {     // Stop safely if it didn't get a valid row
        return;
    }

    // If moving from one row to another, remove the old highlight first
    if (dropIndicatorLi && dropIndicatorLi !== li) {
        dropIndicatorLi.classList.remove("drop-before", "drop-after");
    }

    dropIndicatorLi = li;           // Track which row is highlighted


    // Add the correct class depending on whether it's in the top or bottom half
    // before = true, then line ABOVE the row
    // before = false, then line BELOW the row
    li.classList.toggle("drop-before", before);
    li.classList.toggle("drop-after", !before);
}



/*
==========================================================

------------- Inline Edit: Subtask Title -----------------

==========================================================
*/

// Enter edit mode for a subtask's title (subtasks only, no root tasks)
function startInlineSubtaskEdit(taskId) {
    const task = findTaskInGame(taskId);
    if (!task) {
        return;
    }

    // Store edit state in appState so render() can swap <span> for <input>
    appState.inlineEditingTaskId = taskId;
    appState.inlineEditingValue = task.title;

    render();      // Re-render list so the inline input appears

    requestAnimationFrame(() => {
        const input = document.querySelector(`[data-inline-edit="${CSS.escape(taskId)}"]`);
        input?.focus();
        input?.select();
    });
}


// Exit edit mode without saving changes
function cancelInlineSubtaskEdit() {
    appState.inlineEditingTaskId = null;
    appState.inlineEditingValue = "";
    render();
}

// Save title edit into the task object and persist it
function commitInlineSubtaskEdit(taskId, nextValue) {
    const task = findTaskInGame(taskId);
    if (!task) {
        cancelInlineSubtaskEdit();
        return;
    }

    const nextTitle = String(nextValue ?? "").trim();   // Convert to string & remove extra spaces
    if (!nextTitle) {
        cancelInlineSubtaskEdit();      // Don’t allow blank titles
        return;
    }

    recordUndoSnapshot();               // Undo applies to subtask rename

    task.title = nextTitle;             // Apply change to state


    // Clear edit state so render() swaps input back to normal text
    appState.inlineEditingTaskId = null;
    appState.inlineEditingValue = "";

    saveTasks();    // Persist to localStorage
    render();       // Refresh UI
}



/*
==========================================================

---------- Discard Drawer Edits (Save Guard) -------------

==========================================================
*/

// Restore edit buffers back to the last saved/original values
function discardDrawerEdits() {
    const task = findTaskInGame(appState.selectedTaskId);

    appState.editingTaskId = null;
    appState.editingValue = appState.originalTitle ?? "";
    appState.editingDescription = appState.originalDescription ?? task?.description ?? "";
    appState.isTaskUnsaved = false;
}

// Gate any drawer navigation/close behind the discard modal when dirty
function confirmDiscardIfDirty({ onProceed }) {
    if (!appState.isTaskUnsaved) {
        onProceed();
        return;
    }

    openConfirmModal({
        title: "WARNING: Discard changes?",
        message: "Your unsaved changes will be lost.",
        confirmText: "Discard",
        confirmClass: "btn-error",
        onConfirm: () => {
            discardDrawerEdits();
            onProceed();
            render();
        },
    });
}

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

------------ Handles Task Row Click Behaviour -------------

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
        recordUndoSnapshot();              // Undo applies to single deletes
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

    const isSwitchingTasks =
        appState.selectedTaskId && String(appState.selectedTaskId) !== String(taskId);

    const openTaskInDrawer = () => {
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
    };

    if (isSwitchingTasks) {
        confirmDiscardIfDirty({ onProceed: openTaskInDrawer });
        return;
    }

    openTaskInDrawer();

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
    const sortBtn = document.getElementById("sort-created-btn");

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

        if (appState.sortRootByCreated) {
            appState.sortRootByCreated = null;      // Dragging switches you back to no order
            saveTasks();

            draggedTaskId = null;

            e.preventDefault();
            return;
        }

    });

    listContainer.addEventListener("dragover", (e) => {     // Allows dropping
        e.preventDefault();

        const li = e.target.closest("li");                  // Find the task row currently under the mouse
        if (!li || !draggedTaskId) {                        // If it's not over a row or not dragging anything, remove any old "drop" line
            clearDropIndicator();
            return;
        }

        // Don't show indicator on the same item being dragged
        if (li.dataset.id === draggedTaskId) {
            clearDropIndicator();
            return;
        }

        const rect = li.getBoundingClientRect();        // Get this row’s position & size on the screen

        const mouseY = e.clientY;                       // Mouse position on screen (vertical/Y axis)
        const rowTop = rect.top;                        // Top of the row (Y position)
        const rowMiddle = rowTop + rect.height / 2;     // Halfway point down the row

        const before = mouseY < rowMiddle;              // If true show the line above, false show the line below

        setDropIndicator(li, before);                   // Apply the correct visual indicator to this row
    });

    listContainer.addEventListener("drop", (e) => {

        // Find the row where the task was dropped
        const li = e.target.closest("li");
        if (!li || !draggedTaskId) {
            clearDropIndicator();
            return;
        }

        const targetId = li.dataset.id;

        if (!targetId || draggedTaskId === targetId) {       // Do nothing if task is dropped on itself
            clearDropIndicator();
            return;
        }

        reorderTasks(draggedTaskId, targetId);  // Reorder the tasks in state

        draggedTaskId = null;                   // Clear drag state after finishing the move
        clearDropIndicator();

        saveTasks();                            // Save and re-render so new order stays
        render();
    });

    listContainer.addEventListener("dragend", () => {
        draggedTaskId = null;       // Clear drag state so future drags start clean
        clearDropIndicator();
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


    if (sortBtn) {
        sortBtn.addEventListener("click", () => {
            // Toggle: null/desc -> asc -> desc -> asc...
            appState.sortRootByCreated = appState.sortRootByCreated === "desc" ? "asc" : "desc";

            saveTasks(); // Persist across reloads
            render();
        });
    }


    /*
    * Click Events
    */

    document.addEventListener("click", (e) => {

        // Close button inside drawer ("X")
        if (e.target.closest("#close-panel")) {
            confirmDiscardIfDirty({
                onProceed: () => {
                    appState.selectedTaskId = null; // Close drawer
                    render();
                },
            });
            return;
        }


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

            recordUndoSnapshot();   // Undo applies to title/description saves

            // Only overwrite title when editing the title input
            if (appState.editingTaskId) {
                task.title = appState.editingValue.trim() || task.title;
            }

            // Save the description
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
   ==========================================================

   ---------------- Subtask Title Inline Edit ---------------

   ==========================================================
   */

    document.addEventListener("dblclick", (e) => {

        if (!e.target.closest("#list-container, #subtasks-container")) {        // Only allow inline edit inside main list or drawer subtasks list
            return;
        }

        // Only start edit when double-clicking a subtask title
        const label = e.target.closest("[data-task-label]");
        if (!label) {
            return;
        }

        const li = label.closest("li");
        const taskId = li?.dataset?.id;     // dataset reads "data-id" attributes (chaining avoids crashes)
        if (!taskId) {
            return;
        }

        // Subtasks only (no root tasks)
        const parent = findParentTask(taskId);
        if (!parent) {
            return;
        }

        startInlineSubtaskEdit(taskId);     // Swap the title span into an input and focusses it
    });

    document.addEventListener("input", (e) => {
        const input = e.target.closest("[data-inline-edit]");   // Only react to the subtask inline edit input
        if (!input) return;

        appState.inlineEditingValue = input.value;              // Keep the draft value in state so it survives re-renders
    });

    document.addEventListener("keydown", (e) => {
        const input = e.target.closest("[data-inline-edit]");
        if (!input) {
            return;
        }

        const taskId = input.dataset.inlineEdit;    // Reads data-inline-edit="TASK_ID"
        if (!taskId) {
            return;
        }

        if (e.key === "Enter") {                   // Enter saves
            e.preventDefault();                    // Prevents browser default behaviour
            e.stopPropagation();                   // Stops other key handlers from also firing
            commitInlineSubtaskEdit(taskId, input.value);
            return;
        }

        if (e.key === "Escape") {                 // Escape cancels
            e.preventDefault();
            e.stopPropagation();
            cancelInlineSubtaskEdit();
        }
    });



    /*
    ==========================================================
    
    ----------------------- Undo (Ctrl+Z) --------------------
    
    ==========================================================
    */

    document.addEventListener("keydown", (e) => {
        const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z";     // Ctrl+Z (Windows) or Cmd+Z (Mac)
        if (!isUndo) {
            return;
        }

        e.preventDefault();                 // Stops the browser from undoing text inside an input instead

        const ok = undoLastChange();        // Restore the last snapshot
        
        // Re-render so the UI matches the restored state
        if (ok) {
            render();
        }
    });

    /*
    * Input Events
    */

    /* document.addEventListener("input", (e) => {

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
    }); */


    // Initial Page load
    saveTasks();
    render();
}