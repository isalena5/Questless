const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");

function addTask(){
    if(inputBox.value == ''){
        alert("You must write something!");
        return;
    }

    const li = document.createElement("li");
    li.className = "flex items-center gap-3"
        
    li.innerHTML = `<input type="checkbox" class="checkbox checkbox-primary" />
    <span class="flex-1">${inputBox.value}</span>
    <button class="btn btn-sm btn-circle btn-ghost text-error">
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

    inputBox.value = "";
    saveData();
}

listContainer.addEventListener("click", function(e){
    
    // Checkbox Toggled
    if(e.target.type === "checkbox"){
        e.target.nextElementSibling.classList.toggle("line-through");
        saveData();
    }

    // Delete Task
    else if (e.target.closest("button")){
        e.target.closest("li").remove();
        saveData();
    }
}, false);

function saveData(){
    localStorage.setItem("data", listContainer.innerHTML);
}

function showTask(){
    listContainer.innerHTML = localStorage.getItem("data");    
}

function deleteAll(){
    localStorage.removeItem("data");
    location.reload();
}

showTask();