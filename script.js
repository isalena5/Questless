/*------ Global -------*/

class Task{
    constructor(title) {
        this.id = crypto.randomUUID(); // Generates random ID (Unique for each task)
        this.title = title;            // Task's title
        this.completed = false;        // Is the track done?
    }
}

const inputBox = document.getElementById("input-box"); // Input field of tasks
const listContainer = document.getElementById("list-container"); // Container that holds all tasks

let tasks = []; // Tasks array

/*----------------------------------------------------------------*/


/* --------------- Add Task --------------- */

function addTask(){
    const title = inputBox.value.trim(); // Remove extra spaces at start & end

    if(!title) {                             // If there is nothing written in title, show alert
        alert("You must write something!");
        return;
    }

    const newTask = new Task(title); // Create new task
    tasks.push(newTask); // Add task to the array

    inputBox.value = ""; // Clear input field

    saveTasks(); // Save to localStorage
    render(); // Update UI
}


/* --------------- Delete Task --------------- */

function deleteTask(taskId){        // Delete task by their ID

    tasks = tasks.filter(task => task.id !== taskId);  // Filter all tasks that are NOT the ID we're looking for

    saveTasks();
    render();

}


/* --------------- Toggle Task --------------- */

function toggleTask(taskId, checkboxElement){

    const task = tasks.find(task => task.id === taskId); // Find task by ID in the array

    /* if(task){
        task.completed = !task.completed;

        saveTasks();
    } */

   if(task) {
        task.completed = checkboxElement.checked; // Update task's state to completed
        const span = checkboxElement.nextElementSibling; // Show the task text in span

        // Add or remove line-through class depending on completed state
        if(task.completed){
            span.classList.add("line-through");
        }
        else {
            span.classList.remove("line-through");
        }
    }

}


/* --------------- Save Tasks --------------- */

function saveTasks(){
    localStorage.setItem("tasks", JSON.stringify(tasks)); // Save tasks array to localStorage as a JSON string (instead of HTML)
}


/* --------------- Load Tasks --------------- */

function loadTasks() {
    const restoreSesh = localStorage.getItem("tasks"); // Get saved tasks
    
    if(restoreSesh){
        tasks = JSON.parse(restoreSesh); // Convert JSON string back into an array
    }
}


/* --------------- Delete Tasks --------------- */

function deleteAll(){
    localStorage.removeItem("tasks"); // Remove tasks from localStorage
    tasks = []; // Clear the tasks array

    render();
}

/* --------------- Render Tasks (Update UI) --------------- */

function render(){
    listContainer.innerHTML = ""; // Clear existing HTML

    tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = "flex items-center gap-3";
        li.dataset.id = task.id;

        li.innerHTML = `<input type="checkbox" class="checkbox checkbox-primary" ${task.completed ? "checked" : ""} />
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
        }
    );
}


/* --------------- E V E N T S --------------- */

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