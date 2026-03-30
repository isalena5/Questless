import { arrowIcon, iconDelete, iconDrag, iconEdit, iconFullSc, iconPlus } from "./icons.js";
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

--------------------- Main Page Render -------------------

==========================================================
*/

// Renders everything in Tasks page
export function render() {
    const listContainer = document.getElementById("list-container");
    listContainer.innerHTML = "";           // Clear existing HTML

    const game = appState.games.find(g => g.id === appState.activeGameId);
    if (!game) {
        return;
    }


    // Render Standalone/Root Tasks first
    game.tasks.forEach(task => {
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
        <span class="flex-1 ${size.text} ${task.completed ? "line-through" : ""}">${task.title}</span>
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

    renderInputIfActive(task, container, level);    // If this is the active task for subtask creation, render the input right below it

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
    li.draggable = mode === "full";           // Only the full task list supports drag-and-drop
    li.style.marginLeft = `${level * 38}px`; // Dynamic Indent

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
function renderInputIfActive(task, container, level) {

    if (appState.creatingSubtaskFor !== task.id) {          // Only render the input if this is the current task
        return;
    }

    const inputLi = document.createElement("li");
    inputLi.className = `flex items-center gap-2`;
    inputLi.style.marginLeft = `${(level + 1) * 24}px`;     // Dynamic Indent

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

    const { formattedDate, formattedTime } = formatDateTime(task.createdAt);    // Format the stored creation date into a more readable format

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

    document.getElementById("close-panel").onclick = () => {            // Close button clears the selected task and hides the drawer
        appState.selectedTaskId = null;
        renderTaskDetail();
    };

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
        card.dataset.gameId = game.id;

        card.className = "card w-[350px] overflow-hidden group relative mx-auto"

        card.innerHTML = `
            
            <div class="w-full h-full gap-4 flex flex-col items-center justify-center relative">
                    
                <div class="flex items-baseline justify-center 
                    transform transition-transform duration-300 group-hover:-translate-y-7">

                        <!-- Image -->
                        <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 207 207" fill="none">
                                <path d="M206.25 103.38C206.25 160.475 160.079 206.759 103.125 206.759C46.1706 206.759 0 160.475 0 103.38C0 46.2846 46.1706 0 103.125 0C160.079 0 206.25 46.2846 206.25 103.38Z" fill="url(#paint0_linear_280_6057)"/>
                                <path d="M124.898 103C124.898 115.094 115.094 124.898 103 124.898C90.906 124.898 81.1019 115.094 81.1019 103C81.1019 90.906 90.906 81.1019 103 81.1019C115.094 81.1019 124.898 90.906 124.898 103Z" fill="white"/>
                                <path d="M65.8608 167.546V158.819H69.1335C69.804 158.819 70.3665 158.944 70.821 159.194C71.2784 159.444 71.6236 159.788 71.8565 160.225C72.0923 160.66 72.2102 161.154 72.2102 161.708C72.2102 162.268 72.0923 162.765 71.8565 163.2C71.6207 163.634 71.2727 163.977 70.8125 164.227C70.3523 164.474 69.7855 164.597 69.1122 164.597H66.9432V163.298H68.8991C69.2912 163.298 69.6122 163.23 69.8622 163.093C70.1122 162.957 70.2969 162.769 70.4162 162.531C70.5384 162.292 70.5994 162.018 70.5994 161.708C70.5994 161.399 70.5384 161.126 70.4162 160.89C70.2969 160.654 70.1108 160.471 69.858 160.34C69.608 160.207 69.2855 160.14 68.8906 160.14H67.4418V167.546H65.8608Z" fill="black"/>
                                <path d="M73.5153 167.546V161.001H75.011V162.092H75.0792C75.1985 161.714 75.4031 161.423 75.6928 161.218C75.9854 161.011 76.3192 160.907 76.6942 160.907C76.7795 160.907 76.8746 160.911 76.9798 160.92C77.0877 160.926 77.1772 160.936 77.2482 160.95V162.369C77.1829 162.346 77.0792 162.326 76.9371 162.309C76.7979 162.289 76.663 162.279 76.5323 162.279C76.2511 162.279 75.9982 162.34 75.7738 162.463C75.5522 162.582 75.3775 162.748 75.2496 162.961C75.1218 163.174 75.0579 163.42 75.0579 163.698V167.546H73.5153Z" fill="black"/>
                                <path d="M80.8587 167.674C80.2195 167.674 79.6655 167.534 79.1967 167.252C78.728 166.971 78.3644 166.578 78.1058 166.072C77.8501 165.566 77.7223 164.975 77.7223 164.299C77.7223 163.623 77.8501 163.031 78.1058 162.522C78.3644 162.014 78.728 161.619 79.1967 161.338C79.6655 161.056 80.2195 160.916 80.8587 160.916C81.4979 160.916 82.0518 161.056 82.5206 161.338C82.9893 161.619 83.3516 162.014 83.6072 162.522C83.8658 163.031 83.995 163.623 83.995 164.299C83.995 164.975 83.8658 165.566 83.6072 166.072C83.3516 166.578 82.9893 166.971 82.5206 167.252C82.0518 167.534 81.4979 167.674 80.8587 167.674ZM80.8672 166.438C81.2138 166.438 81.5035 166.343 81.7365 166.153C81.9695 165.96 82.1428 165.701 82.2564 165.377C82.3729 165.053 82.4311 164.693 82.4311 164.295C82.4311 163.894 82.3729 163.532 82.2564 163.208C82.1428 162.882 81.9695 162.622 81.7365 162.428C81.5035 162.235 81.2138 162.139 80.8672 162.139C80.5121 162.139 80.2166 162.235 79.9808 162.428C79.7479 162.622 79.5731 162.882 79.4567 163.208C79.343 163.532 79.2862 163.894 79.2862 164.295C79.2862 164.693 79.343 165.053 79.4567 165.377C79.5731 165.701 79.7479 165.96 79.9808 166.153C80.2166 166.343 80.5121 166.438 80.8672 166.438Z" fill="black"/>
                                <path d="M85.3043 161.001H86.8469V167.921C86.8469 168.393 86.7575 168.782 86.5785 169.089C86.3995 169.396 86.141 169.624 85.8029 169.775C85.4648 169.926 85.0543 170.001 84.5714 170.001C84.5146 170.001 84.462 169.999 84.4137 169.997C84.3654 169.997 84.3129 169.995 84.256 169.992V168.735C84.2986 168.738 84.337 168.74 84.3711 168.74C84.4052 168.742 84.4407 168.744 84.4776 168.744C84.7731 168.744 84.9847 168.671 85.1126 168.526C85.2404 168.384 85.3043 168.176 85.3043 167.9V161.001ZM86.0714 160.072C85.8242 160.072 85.6126 159.991 85.4364 159.829C85.2631 159.664 85.1765 159.467 85.1765 159.237C85.1765 159.004 85.2631 158.806 85.4364 158.644C85.6126 158.48 85.8242 158.397 86.0714 158.397C86.3157 158.397 86.5245 158.48 86.6978 158.644C86.8739 158.806 86.962 159.004 86.962 159.237C86.962 159.467 86.8739 159.664 86.6978 159.829C86.5245 159.991 86.3157 160.072 86.0714 160.072Z" fill="black"/>
                                <path d="M91.331 167.674C90.6747 167.674 90.108 167.538 89.6307 167.265C89.1563 166.99 88.7912 166.6 88.5355 166.097C88.2798 165.592 88.152 164.997 88.152 164.312C88.152 163.639 88.2798 163.048 88.5355 162.539C88.794 162.028 89.1548 161.63 89.6179 161.346C90.081 161.059 90.625 160.916 91.25 160.916C91.6534 160.916 92.0341 160.981 92.392 161.112C92.7528 161.24 93.071 161.438 93.3466 161.708C93.625 161.978 93.8437 162.322 94.0028 162.74C94.1619 163.154 94.2415 163.649 94.2415 164.222V164.695H88.8764V163.656H92.7628C92.7599 163.36 92.696 163.097 92.571 162.867C92.446 162.634 92.2713 162.451 92.0469 162.318C91.8253 162.184 91.5668 162.117 91.2713 162.117C90.956 162.117 90.679 162.194 90.4403 162.347C90.2017 162.498 90.0156 162.697 89.8821 162.944C89.7514 163.188 89.6847 163.457 89.6818 163.749V164.657C89.6818 165.038 89.7514 165.365 89.8906 165.637C90.0298 165.907 90.2244 166.115 90.4744 166.259C90.7244 166.401 91.017 166.472 91.3523 166.472C91.5767 166.472 91.7798 166.441 91.9616 166.379C92.1435 166.313 92.3011 166.218 92.4347 166.093C92.5682 165.968 92.669 165.813 92.7372 165.629L94.1776 165.791C94.0866 166.171 93.9134 166.504 93.6577 166.788C93.4048 167.069 93.081 167.288 92.6861 167.444C92.2912 167.597 91.8395 167.674 91.331 167.674Z" fill="black"/>
                                <path d="M98.4016 167.674C97.7482 167.674 97.1871 167.531 96.7184 167.244C96.2525 166.957 95.8931 166.561 95.6403 166.055C95.3903 165.546 95.2653 164.961 95.2653 164.299C95.2653 163.634 95.3931 163.048 95.6488 162.539C95.9045 162.028 96.2653 161.63 96.7312 161.346C97.1999 161.059 97.7539 160.916 98.3931 160.916C98.9244 160.916 99.3945 161.014 99.8036 161.21C100.216 161.403 100.544 161.677 100.788 162.032C101.032 162.384 101.172 162.796 101.206 163.268H99.7312C99.6715 162.953 99.5295 162.69 99.305 162.48C99.0835 162.267 98.7866 162.16 98.4144 162.16C98.0991 162.16 97.8221 162.245 97.5835 162.416C97.3448 162.583 97.1587 162.825 97.0252 163.14C96.8945 163.455 96.8292 163.833 96.8292 164.274C96.8292 164.72 96.8945 165.103 97.0252 165.424C97.1559 165.742 97.3391 165.988 97.5749 166.161C97.8136 166.332 98.0934 166.417 98.4144 166.417C98.6417 166.417 98.8448 166.374 99.0238 166.289C99.2056 166.201 99.3576 166.075 99.4798 165.91C99.6019 165.745 99.6857 165.545 99.7312 165.309H101.206C101.169 165.772 101.032 166.183 100.797 166.541C100.561 166.896 100.24 167.174 99.8335 167.376C99.4272 167.575 98.9499 167.674 98.4016 167.674Z" fill="black"/>
                                <path d="M105.741 161.001V162.194H101.978V161.001H105.741ZM102.907 159.433H104.45V165.578C104.45 165.785 104.481 165.944 104.543 166.055C104.609 166.163 104.694 166.237 104.799 166.276C104.904 166.316 105.021 166.336 105.148 166.336C105.245 166.336 105.333 166.329 105.413 166.315C105.495 166.301 105.558 166.288 105.6 166.276L105.86 167.482C105.778 167.511 105.66 167.542 105.506 167.576C105.356 167.61 105.171 167.63 104.952 167.636C104.566 167.647 104.218 167.589 103.908 167.461C103.599 167.33 103.353 167.129 103.171 166.856C102.992 166.583 102.904 166.242 102.907 165.833V159.433Z" fill="black"/>
                                <path d="M111.55 163.711V167.546H110.007V161.001H111.482V162.113H111.559C111.709 161.747 111.949 161.455 112.279 161.24C112.611 161.024 113.022 160.916 113.51 160.916C113.962 160.916 114.355 161.012 114.691 161.205C115.029 161.399 115.29 161.678 115.475 162.045C115.662 162.411 115.755 162.856 115.752 163.379V167.546H114.209V163.617C114.209 163.18 114.096 162.838 113.868 162.59C113.644 162.343 113.333 162.22 112.935 162.22C112.665 162.22 112.425 162.279 112.215 162.399C112.007 162.515 111.844 162.684 111.725 162.906C111.608 163.127 111.55 163.396 111.55 163.711Z" fill="black"/>
                                <path d="M119.203 167.678C118.789 167.678 118.415 167.605 118.083 167.457C117.753 167.306 117.492 167.085 117.299 166.792C117.108 166.499 117.013 166.139 117.013 165.71C117.013 165.34 117.081 165.035 117.218 164.793C117.354 164.552 117.54 164.359 117.776 164.214C118.012 164.069 118.277 163.96 118.573 163.886C118.871 163.809 119.179 163.754 119.498 163.72C119.881 163.68 120.192 163.644 120.431 163.613C120.669 163.579 120.843 163.528 120.951 163.46C121.061 163.389 121.117 163.279 121.117 163.132V163.106C121.117 162.785 121.022 162.536 120.831 162.36C120.641 162.184 120.367 162.096 120.009 162.096C119.631 162.096 119.331 162.178 119.11 162.343C118.891 162.508 118.743 162.703 118.667 162.927L117.226 162.722C117.34 162.325 117.527 161.992 117.789 161.725C118.05 161.455 118.37 161.254 118.748 161.12C119.125 160.984 119.543 160.916 120 160.916C120.316 160.916 120.63 160.953 120.942 161.026C121.255 161.1 121.54 161.222 121.799 161.393C122.057 161.561 122.265 161.789 122.421 162.079C122.58 162.369 122.659 162.731 122.659 163.166V167.546H121.176V166.647H121.125C121.032 166.829 120.9 166.999 120.729 167.159C120.561 167.315 120.35 167.441 120.094 167.538C119.841 167.632 119.544 167.678 119.203 167.678ZM119.604 166.545C119.914 166.545 120.182 166.484 120.409 166.362C120.637 166.237 120.811 166.072 120.934 165.867C121.059 165.663 121.121 165.44 121.121 165.198V164.427C121.073 164.467 120.99 164.504 120.874 164.538C120.76 164.572 120.632 164.602 120.49 164.627C120.348 164.653 120.208 164.676 120.069 164.695C119.929 164.715 119.809 164.732 119.706 164.747C119.476 164.778 119.27 164.829 119.088 164.9C118.907 164.971 118.763 165.07 118.658 165.198C118.553 165.323 118.5 165.485 118.5 165.684C118.5 165.968 118.604 166.183 118.811 166.328C119.019 166.472 119.283 166.545 119.604 166.545Z" fill="black"/>
                                <path d="M124.211 167.546V161.001H125.685V162.113H125.762C125.898 161.738 126.124 161.445 126.439 161.235C126.755 161.022 127.131 160.916 127.569 160.916C128.012 160.916 128.385 161.024 128.689 161.24C128.996 161.453 129.212 161.744 129.337 162.113H129.405C129.55 161.749 129.794 161.46 130.138 161.244C130.485 161.025 130.895 160.916 131.37 160.916C131.972 160.916 132.463 161.106 132.844 161.487C133.225 161.867 133.415 162.423 133.415 163.153V167.546H131.868V163.391C131.868 162.985 131.76 162.688 131.544 162.501C131.328 162.311 131.064 162.215 130.752 162.215C130.38 162.215 130.088 162.332 129.878 162.565C129.671 162.795 129.567 163.095 129.567 163.464V167.546H128.054V163.328C128.054 162.99 127.952 162.72 127.748 162.518C127.546 162.316 127.282 162.215 126.955 162.215C126.733 162.215 126.532 162.272 126.35 162.386C126.168 162.497 126.023 162.654 125.915 162.859C125.807 163.061 125.753 163.296 125.753 163.566V167.546H124.211Z" fill="black"/>
                                <path d="M137.878 167.674C137.222 167.674 136.655 167.538 136.178 167.265C135.703 166.99 135.338 166.6 135.082 166.097C134.827 165.592 134.699 164.997 134.699 164.312C134.699 163.639 134.827 163.048 135.082 162.539C135.341 162.028 135.702 161.63 136.165 161.346C136.628 161.059 137.172 160.916 137.797 160.916C138.2 160.916 138.581 160.981 138.939 161.112C139.3 161.24 139.618 161.438 139.893 161.708C140.172 161.978 140.391 162.322 140.55 162.74C140.709 163.154 140.788 163.649 140.788 164.222V164.695H135.423V163.656H139.31C139.307 163.36 139.243 163.097 139.118 162.867C138.993 162.634 138.818 162.451 138.594 162.318C138.372 162.184 138.114 162.117 137.818 162.117C137.503 162.117 137.226 162.194 136.987 162.347C136.749 162.498 136.562 162.697 136.429 162.944C136.298 163.188 136.232 163.457 136.229 163.749V164.657C136.229 165.038 136.298 165.365 136.438 165.637C136.577 165.907 136.771 166.115 137.021 166.259C137.271 166.401 137.564 166.472 137.899 166.472C138.124 166.472 138.327 166.441 138.509 166.379C138.69 166.313 138.848 166.218 138.982 166.093C139.115 165.968 139.216 165.813 139.284 165.629L140.724 165.791C140.634 166.171 140.46 166.504 140.205 166.788C139.952 167.069 139.628 167.288 139.233 167.444C138.838 167.597 138.386 167.674 137.878 167.674Z" fill="black"/>
                                <path d="M129.991 102.745C129.991 117.793 117.793 129.991 102.745 129.991C87.6982 129.991 75.5 117.793 75.5 102.745C75.5 87.6982 87.6982 75.5 102.745 75.5C117.793 75.5 129.991 87.6982 129.991 102.745Z" fill="url(#paint1_linear_280_6057)"/>
                                <path d="M124.898 103C124.898 115.094 115.094 124.898 103 124.898C90.906 124.898 81.1019 115.094 81.1019 103C81.1019 90.906 90.906 81.1019 103 81.1019C115.094 81.1019 124.898 90.906 124.898 103Z" fill="white"/>
                                <defs>
                                    <linearGradient id="paint0_linear_280_6057" x1="148.704" y1="7.38426" x2="27.2454" y2="292.569" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#ECF9FF"/>
                                    <stop offset="1" stop-color="#78B7FF"/>
                                    </linearGradient>
                                    <linearGradient id="paint1_linear_280_6057" x1="121.588" y1="32.7222" x2="42.1435" y2="208.162" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#DFDFDF"/>
                                    <stop offset="1" stop-color="#797979"/>
                                    </linearGradient>
                                </defs>
                                </svg>
            
                </div>

                <!-- Game Title + Edit -->
                <div class="absolute bottom-6 left-0 w-full max-h-[32px] opacity-0 translate-y-3 transition-all
                duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
                
                    <div class="flex items-center justify-center gap-[10px]">
                
                        <p class="text-white font-bold">${game.name}</p>

                        <button class="btn btn-xs btn-circle btn-secondary mt-1">
                            ${iconEdit}
                        </button>

                    </div>
                </div>
            </div>
            `;

        container.appendChild(card);

    });

}