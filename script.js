/*
==============================================

------------------ Global --------------------

==============================================
*/

// Game object
// Genre
    // -----> templates ***
    // -----> submit own templates *
    // -----> make own templates **



class Task{
    constructor(title, isSubtask = false) {
        this.id = crypto.randomUUID(); // Generates random ID (Unique for each task)
        this.title = title;            // Task's title
        this.completed = false;        // Is the track done?

        // Date & Time the task was created at       
        this.creationDate = new Date().toLocaleDateString();
        this.creationTime = new Date().toLocaleTimeString();

        this.subtasks = isSubtask ? null: [];            // If it's not a subtask give an array, if it is then set to null
        this.isSubtask = isSubtask;                      // Determines if current task is a Parent task or a subtask

        // this.tags = []; ---> Create addToArray (categories) function. **
            // Create assignCategories function 
        // MORE GRANDCHILDREN (1 more level)
        // this.colour; **
        // this.description; ***
        // this.gallery; ***
        // this.guides; ***
        // this.difficulty; *
    }
}

const inputBox = document.getElementById("input-box"); // References input field of tasks
const listContainer = document.getElementById("list-container"); // References the container <ul> that holds all tasks

let tasks = []; // Tasks array (holds all tasks)

// --------------------------------------------------------
// --------------------------------------------------------





/*
==========================================================

------------------------ Add Task ------------------------

==========================================================
*/

function addTask(){
    const title = inputBox.value.trim(); // Remove extra spaces at start & end

    if(!title) {                             // If there is nothing written in title, show alert
        alert("You must write something!");
        return;                              // Exit
    }

    const newTask = new Task(title); // Create new task
    tasks.push(newTask); // Add task to the array

    inputBox.value = ""; // Clear input field

    saveTasks(); // Save to localStorage
    render(); // Update UI
}





/*
==========================================================

---------------------- Delete Task -----------------------

==========================================================
*/

function deleteTask(taskId){        // Delete task by their ID

    const parentIndex = tasks.findIndex(t => t.id === taskId);  // Look for level of ID
    if(parentIndex !== -1){                                     // If it's in the parent level, run:
        tasks.splice(parentIndex, 1);                           // Remove the parent task from array
        
        saveTasks();
        render();
        
        return;
    }

    for(let task of tasks){                                                         // If not parent, then check other level (children)
        const childIndex = task.subtasks?.findIndex(s => s.id === taskId);          // 
        if(childIndex !== -1 && childIndex !== undefined){                          // If it is in the child level, run:
            task.subtasks.splice(childIndex, 1);                                    // Remove subtask from parent's subtasks array
            
            saveTasks();
            render();
            
            return;
        }
    }
    

}






/*
==========================================================

---------------------- Toggle Task -----------------------

==========================================================
*/

function toggleTask(taskId, checkboxElement){

    const result = findParentAndTask(taskId);    // Find if the Id belongs to a parent or a subtask
    if(!result) {                               // If nothing found, stop running
        return;
    }

    const {task, parent} = result;  // De-construct

    task.completed = checkboxElement.checked;  // Update with current checkbox state

    const span = checkboxElement.nextElementSibling;            // Get the span besides the checkbox
    span.classList.toggle("line-through", task.completed);      // Add or remove line-through effect

    if(!parent && task.subtasks){
        task.subtasks.forEach(sub => {
            sub.completed = task.completed;

            const childLi = document.querySelector(`li[data-id="${sub.id}"]`);
            if(!childLi){
                return;
            }

            const childCheck = childLi.querySelector("input[type='checkbox']");
            const childSpan = childLi.querySelector("span");

            childCheck.checked = task.completed;
            childSpan.classList.toggle("line-through", task.completed);
        });

    }

    if(parent){
        parent.completed = parent.subtasks.every(s => s.completed);

        const parentLi = document.querySelector(`li[data-id="${parent.id}"]`);
        if(!parentLi){
            return;
        }

        const parentCheck = parentLi.querySelector("input[type='checkbox']");
        const parentSpan = parentLi.querySelector("span");

        parentCheck.checked = parent.completed;
        parentSpan.classList.toggle("line-through", parent.completed);
    }

    saveTasks();
}





/*
==========================================================

---------------------- Add Subtasks ----------------------

==========================================================
*/

function addSubtask(parentId, title){
    const parent = tasks.find(t => t.id === parentId);

    if(!parent || parent.isSubtask){
        return;
    }
    
    parent.subtasks.push(new Task(title, true));

    saveTasks();
    render();
}




/*
==========================================================

----------------- Find Parent & Subtask ------------------

==========================================================
*/

function findParentAndTask(taskId){

    // Check for parents
    const parent = tasks.find(t => t.id === taskId);
    if(parent){
        return {task: parent, parent: null};
    }

    // Check for subtask
    for(let t of tasks){
        const sub = t.subtasks?.find(s => s.id === taskId);
        if(sub){
            return {task: sub, parent: t};
        }
    }

    return null;
}





/*
==========================================================

---------------------- Save Tasks ------------------------

==========================================================
*/

function saveTasks(){
    localStorage.setItem("tasks", JSON.stringify(tasks)); // Save tasks array to localStorage as a JSON string
}





/*
==========================================================

---------------------- Load Tasks ------------------------

==========================================================
*/

function loadTasks() {
    const restoreSesh = localStorage.getItem("tasks"); // Get saved tasks
    
    if(restoreSesh){
        tasks = JSON.parse(restoreSesh); // Convert JSON string back into an array
    }
}





/*
==========================================================

------------------- Delete All Tasks ---------------------

==========================================================
*/

function deleteAll(){
    localStorage.removeItem("tasks"); // Remove tasks from localStorage
    tasks = []; // Clear the tasks array

    render();
}





// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ---------------- Render Tasks (Update UI) -----------------
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function render(){
    listContainer.innerHTML = ""; // Clear existing HTML

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = "flex items-center gap-3";
        li.dataset.id = task.id;

        li.innerHTML = 
            `<input type="checkbox" class="checkbox checkbox-primary" ${task.completed ? "checked" : ""} />
            <span class="flex-1 ${task.completed ? "line-through" : ""}">${task.title}</span>
            
            
            <button class="delete btn btn-sm btn-circle btn-ghost text-error">
            
            <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-5 stroke-{--color-error}">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>

            </button>
            `;

        listContainer.appendChild(li);

        if(task.subtasks && task.subtasks.length > 0){
            task.subtasks.forEach(sub => {
                const subLi = document.createElement("li");

                subLi.className = "flex items-center gap-3 ml-6";
                subLi.dataset.id = sub.id;

                subLi.innerHTML = 
                `<input type="checkbox" class="checkbox checkbox-primary" ${sub.completed ? "checked" : ""} />
                <span class="flex-1 ${sub.completed ? "line-through" : ""}"> ${sub.title} </span>

                <button class="delete btn btn-sm btn-circle btn-ghost text-error">
            
                <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-5 stroke-{--color-error}">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>

                </button>`;

                listContainer.appendChild(subLi);

            })
        }

        }
    );

    
}





// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ---------------- E V E N T S -----------------
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

listContainer.addEventListener("change",
    function(e){
        if(e.target.type !== "checkbox"){
            return;
        }

        const li = e.target.closest("li");
        if (!li) {
        return;
    }

    const taskId = li.dataset.id;
    toggleTask(taskId, e.target);
        
    })

listContainer.addEventListener("click",
    function(e){
    const deleteButton = e.target.closest(".delete");
    if(!deleteButton){
        return;
    }

    const li = deleteButton.closest("li");
    if(!li){
        return;
    }

    const taskId = li.dataset.id;
    deleteTask(taskId);

});

document.getElementById("add-btn").addEventListener("click", addTask);
document.getElementById("reset-btn").addEventListener("click", deleteAll);

inputBox.addEventListener("keypress",
    function(e){
        if(e.key === "Enter"){
            addTask();
        }
    });

loadTasks();
render();