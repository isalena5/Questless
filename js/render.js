import { arrowIcon, iconDelete, iconDrag, iconEdit, iconFullSc, iconPlus, iconSortAsc, iconSortDesc, iconFilter } from "./icons.js";
import { findTaskInGame } from "./logic.js";
import { appState } from "./state.js";
import { formatDateTime } from "./utils/date.js";

/*
==========================================================

--------------- Render sizes for checkbox ----------------

==========================================================
*/
// Shared size presets for the two task display modes:
// - full: main task list
// - compact: side-drawer subtask list

const SIZE = {
    full: {
        text: "text-base",
        checkbox: "checkbox-lg",
        deleteBtn: "btn-sm btn-circle",
        drag: "scale-100",
        gap: "gap-3"
    },
    compact: {
        text: "text-sm",
        checkbox: "checkbox-md",
        deleteBtn: "btn-xs btn-circle",
        drag: "scale-55",
        gap: "gap-2"
    }
};



function renderSortCreatedIcon() {
    const sortBtn = document.getElementById("sort-created-btn");
    if (!sortBtn) {
        return;     // Stop safely if this page doesn't have the sort button
    }

    const iconHost = sortBtn.querySelector("[data-sort-created-icon]");
    if (!iconHost) {
        return;     // Stop safely if the icon wrapper is missing
    }
    
    const dir = appState.sortRootByCreated;         // sort by: null, "asc", "desc"

    if (!dir) {
        iconHost.innerHTML = iconFilter;            // Default icon (no sort)
    } else {
        iconHost.innerHTML = dir === "asc" ? iconSortAsc : iconSortDesc;
    }
}


/*
==========================================================

---------------- Drawer Button UI State ------------------

==========================================================
*/
function updateDrawerButtons() {
    const saveBtn = document.getElementById("save-task-btn");
    const discardBtn = document.getElementById("discard-task-btn");

    // If the drawer is not currently rendered, stop
    if (!saveBtn || !discardBtn) {
        return;
    }

    // Controls whether save/discard buttons are enabled based on edit state
    saveBtn.disabled = !appState.isTaskUnsaved;
    discardBtn.disabled = !appState.isTaskUnsaved;
}

/*
==========================================================

------------- Persistent Subtask Input Row ---------------

==========================================================
*/

// Note: This helper is currently not being used
function renderSubtaskInputRow(parentTask, container, childLevel, mode = "full") {

    if (mode !== "full") {                        // Don't show in compact drawer
        return;
    }

    if (!parentTask?.expanded) {                 // Only when expanded
        return;
    }

    if (!parentTask?.subtasks) {                // Only tasks that can have children get a subtask input row
        return;
    }

    const li = document.createElement("li");
    li.className = "flex items-center gap-3";
    li.style.marginLeft = `${childLevel * 38}px`;

    li.innerHTML = `
    <input
      class="input input-sm input-bordered w-full subtask-input"
      data-parent-id="${parentTask.id}"
      placeholder="Type new objective..."
    />
  `;

    container.appendChild(li);

    const input = li.querySelector(".subtask-input");
    const draft = appState.subtaskDrafts?.[parentTask.id] ?? "";    // Fall back to "" so input.value is always a string
    input.value = draft;                                            // Restores text after any render
}



/*
==========================================================

--------------------- Main Page Render -------------------

==========================================================
*/

// Renders everything in Tasks page
export function render() {
    const listContainer = document.getElementById("list-container");
    listContainer.innerHTML = "";           // Clear existing HTML

    const game = appState.games.find(g => g.id === appState.activeGameId);
    if (!game) {                           // Stop safely if the active game is missing
        return;
    }

    renderSortCreatedIcon();

    const rootTasks = [...game.tasks];     // Copy list so sorting doesn't change original order

    const toTime = (createdAt) => {

        // createdAt is an ISO string in Task model, so parse it to milliseconds before sorting
        // since sorting needs numbers
        if (typeof createdAt === "number") {
            return createdAt;
        }
        const parsed = Date.parse(createdAt);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    if (appState.sortRootByCreated === "desc") {
        rootTasks.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));    // Newest first
    }
    else if (appState.sortRootByCreated === "asc") {
        rootTasks.sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));    // Oldest first
    }

    // Render Standalone/Root Tasks first
    rootTasks.forEach((task) => {
        renderTask(task, listContainer, 0);
    });

    // Render the side drawer separately
    renderTaskDetail();

    // Render grouped tasks after standalone tasks
    game.groups.forEach(group => {
        const header = document.createElement("h2");
        header.textContent = group.name;
        header.className = "font-bold mt-4"
        listContainer.appendChild(header);

        group.tasks.forEach(task => {
            renderTask(task, listContainer, 0);
        });
    });
}



/*
==========================================================

------------------- Task Row Template --------------------

==========================================================
*/

// Builds single task row (task & subtask)
function createTaskRow(task, level = 0, mode = "full") {
    const size = SIZE[mode];
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;

    // Inline edit state:
    // When a task is being edited, render an <input> instead of the <span>
    const isInlineEditing = appState.inlineEditingTaskId === task.id;

    const titleNode = isInlineEditing       // titleNode swaps between a read-only title <span> and an editable <input>
        ? `
      <input
        class="flex-1 ${size.text} bg-transparent focus:outline-none"
        data-inline-edit="${task.id}"
        value="${appState.inlineEditingValue ?? task.title}"
        autocomplete="off"
        spellcheck="false"
      />
    `
        : `
      <span
        class="flex-1 ${size.text} ${task.completed ? "line-through" : ""} ${mode === "full" && level === 0 ? "cursor-pointer" : ""}"
        data-task-label
      >${task.title}</span>
    `;

    return `
    <div class="flex items-center ${size.gap} flex-1 list-row">
      ${renderLeftControls(task, level, hasSubtasks, mode)}
      ${mode === "full" && level === 2 ? `
        <div class="ml-8">
          <div class="drag-handle ${size.drag}" draggable="true">
            ${iconDrag}
          </div>
        </div>` : ""}

      <input type="checkbox" class="task-checkbox checkbox ${size.checkbox} checkbox-primary" ${task.completed ? "checked" : ""} />
      ${titleNode}
    </div>

    <button class="delete btn ${size.deleteBtn} btn-circle btn-ghost text-error ml-auto">
      ${iconDelete}
    </button>
  `;
}


/*
==========================================================

-------------------- Recursive Task Render ----------------

==========================================================
*/

// Render parent tasks
function renderTask(task, container, level = 0, mode = "full") {

    // Create and append the current task row
    const li = createTaskElement(task, level, mode);
    container.appendChild(li);

    renderInputIfActive(task, container, level);    // Current active subtask input

    if (task.subtasks && task.expanded) {           // Recursively render children only if the task is expanded
        task.subtasks.forEach(sub =>
            renderSubtask(sub, container, level + 1, mode)
        );
    }
}

// Render Subtasks
function renderSubtask(task, container, level, mode = "full") {

    const li = createTaskElement(task, level, mode);
    container.appendChild(li);

    renderInputIfActive(task, container, level);

    if (task.subtasks && task.expanded) {
        task.subtasks.forEach(sub => {
            renderSubtask(sub, container, level + 1, mode);
        });
    }
}



/*
==========================================================

------------------ Task Element Creation -----------------

==========================================================
*/
function createTaskElement(task, level, mode = "full") {
    const li = document.createElement("li");
    li.className = "flex items-center gap-3";
    li.dataset.id = task.id;
    li.draggable = mode === "full";              // Only the full task list supports drag-and-drop
    li.style.marginLeft = `${level * 38}px`;    // Dynamic Indent (by nesting level)

    li.innerHTML = createTaskRow(task, level, mode);
    return li;

}



/*
==========================================================

-------------------- Left-side Controls ------------------

==========================================================
*/
function renderLeftControls(task, level, hasSubtasks, mode) {

    if (level <= 1 && mode === "full") {    // Only the main list shows drag + expand/collapse controls, compact does not
        return `
            <div class="drag-handle" draggable="true">
                ${iconDrag}
            </div>
            <label class="swap swap-flip ${!hasSubtasks ? "opacity-30" : ""}">
                <input type="checkbox" ${task.expanded ? "checked" : ""} />
                ${arrowIcon("right")}
                ${arrowIcon("down")}
            </label>
        `;
    }

    return "";
}




/*
==========================================================

------------------ Active Subtask Input ------------------

==========================================================
*/

// This renders the single subtask input that follows the currently active task
function renderInputIfActive(task, container, level) {

    if (appState.creatingSubtaskFor !== task.id) {          // Only render the input if this is the current task
        return;
    }

    const inputLi = document.createElement("li");
    inputLi.className = `flex items-center gap-2`;
    inputLi.style.marginLeft = `${(level + 1) * 24}px`;     // Indent input under the parent task

    inputLi.innerHTML = `
        <input class="input input-sm input-bordered w-full subtask-input"
        placeholder="Type new objective..." autofocus />
    `;

    container.appendChild(inputLi);
}



/*
==========================================================

------------------ Side-drawer Main Render ---------------

==========================================================
*/
export function renderTaskDetail() {
    const panel = document.getElementById("task-detail-panel");

    if (!appState.selectedTaskId) {         // If no task is selected, hide and clear the drawer
        panel.classList.add("hidden");
        panel.innerHTML = "";
        return;
    }

    const task = findTaskInGame(appState.selectedTaskId);
    if (!task) {
        return;
    }

    panel.classList.remove("hidden");

    const { formattedDate, formattedTime } = formatDateTime(task.createdAt);    // Format the stored creation date (task.createdAt) into a more readable format

    panel.innerHTML = `
        <div class="p-3 flex flex-col h-full">
            <div dir="rtl" class="h-10 w-full justify-end">
                <button id="close-panel" class="btn btn-circle btn-xs">${iconDelete}</button>
            </div>
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-4xl font-bold">${appState.editingTaskId === task.id
            ? `<input
                            class="input input-sm w-full"
                            data-edit-task="${task.id}"
                            value="${appState.editingValue ?? task.title}"
                            />`
            : `<span
                            class="cursor-pointer hover:underline"
                            data-task-title="${task.id}">
                            ${task.title}
                            </span>`
        }
                </h2>
            </div>

            <div class="flex flex-col gap-4">
                <fieldset class="fieldset rounded-box">
                    <legend class="fieldset-legend">Description</legend>

                    <textarea class="textarea h-24 w-full"
                    data-edit-description
                    placeholder="Type a description for your objective...">${appState.editingDescription ?? ""}</textarea>
                </fieldset>

                <label dir="ltr" class="flex flex-row justify-left items-center">
                    <h6 class="text-sm me-4">Created on</h6>
                    <div class="text-xs font-semibold opacity-75">
                        <span class="mr-2">${formattedDate}</span>
                        <span>${formattedTime}</span>
                    </div>
                </label>
            </div>  
            <div class="divider accent-primary"></div>
            


            <!-- Second Part -->

            <div>
                <!-- Gallery container -->
                
                <!-- Subtasks Table -->
                <div class="flex flex-col h-100">
                    <div class="flex flex-row mb-3">
                        <h6 class="text-base mr-3">Subtasks</h6>
                        <button class="btn btn-primary btn-xs rounded-selector text-primary-content">${iconFullSc}</button>
                    </div>
                    <div id="subtasks-container"
                        class="flex flex-col gap-3 py-2 px-4 bg-base-300/75 rounded-selector list overflow-auto">
                    </div>
                </div>
            </div>

            <!-- Buttons Bottom -->
            <div class="flex justify-between mt-auto mb-[24px]">
                <button id="discard-task-btn" class="btn btn-error">
                    Discard changes
                </button>

                <button id="save-task-btn" class="btn btn-primary">
                    Save changes
                </button>
            </div>

        </div>
    `;

    const container = document.getElementById("subtasks-container");

    if (task.subtasks && task.subtasks.length > 0) {                    // Render subtasks in compact mode inside drawer
        task.subtasks.forEach(sub => {
            renderTaskCompact(sub, container, 0);
        });
    }

    updateDrawerButtons();                                              // Refresh save/discard enabled state after the drawer is rendered


    // Wait until the drawer DOM exists,
    // then attach listeners directly to the live drawer inputs
    requestAnimationFrame(() => {
        const titleInput = panel.querySelector("[data-edit-task]");
        const descInput = panel.querySelector("[data-edit-description]");

        if (titleInput) {
            titleInput.addEventListener("input", () => {
                appState.editingValue = titleInput.value;
                appState.isTaskUnsaved = true;
                updateDrawerButtons();
            });
        }

        if (descInput) {
            descInput.addEventListener("input", () => {
                appState.editingDescription = descInput.value;
                appState.isTaskUnsaved = true;
                updateDrawerButtons();
            });
        }
    });


}



/*
==========================================================

---------------- Compact Drawer Task Render --------------

==========================================================
*/
function renderTaskCompact(task, container, level = 0) {
    const li = createTaskElement(task, level, "compact");
    container.appendChild(li);

    if (task.subtasks && task.subtasks.length > 0) {    // Compact mode recursively shows nested subtasks, but uses the smaller size preset
        task.subtasks.forEach(sub => {
            renderTaskCompact(sub, container, level + 1);
        });
    }
}



/*
==========================================================

-------------------- Game Card Rendering -----------------

==========================================================
*/
export function renderGames() {
    const container = document.getElementById("games-container");
    container.innerHTML = "";

    appState.games.forEach(game => {
        const card = document.createElement("div");
        card.dataset.gameId = game.id;      // Used by homepage click handler to navigate to the game page

        card.className = "card w-[350px] overflow-hidden group relative mx-auto"

        card.innerHTML = `
            
            <div class="w-full h-full gap-4 flex flex-col items-center justify-center relative">
                    
                <div class="card-image flex items-baseline justify-center 
                    transform transition-transform duration-300 group-hover:-translate-y-7">

                        <!-- Image -->
                        <img 
                        src="${game.coverUrl ?? "../covers/default.png"}"
                        alt="${game.name} cover"
                        class="image-game w-[220px] h-[220px] object-cover rounded-full"
                        />
            
                </div>

                <!-- Game Title + Edit -->
                <div class="absolute bottom-6 left-0 w-full max-h-[32px] opacity-0 translate-y-3 transition-all
                duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
                
                    <div class="flex items-center justify-center gap-[10px]">
                
                        <p data-game-name class="text-white font-bold">${game.name}</p>

                        <button class="edit-game-btn btn btn-xs btn-circle btn-secondary mt-1">
                            ${iconEdit}
                        </button>

                    </div>
                </div>
            </div>
            `;

        container.appendChild(card);

    });

}

// Gallery container code (to be used later)
/*
<div class="task-gallery flex flex-col w-full justify-start bg-accent mb-4">
                    <div class="flex flex-row">
                        <div class="flex flex-row mr-3">
                            <h6 class="text-base mr-1">Gallery</h6>
                            ${arrowIcon("right")}
                        </div>
                        <button class="btn btn-primary btn-xs rounded-selector">${iconPlus}</button>
                    </div>

                    <!-- Image container code -->
                    <div></div>
                </div>

*/