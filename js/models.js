export class Game {
    constructor(name) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.groups = [];
        this.tasks = [];
    }
}

export class Group {
    constructor(name) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.tasks = [];
    }
}

export class Task {
    constructor(title, level = 0) {
        this.id = crypto.randomUUID(); // Generates random ID (Unique for each task)
        this.title = title;            // Task's title
        this.completed = false;        // Tracks whether the track's done or not
        this.tags = [];
        this.images = [];
        this.description = "";

        // Date & Time the task was created at 
        this.createdAt = new Date().toISOString();

        this.expanded = false;                  // Tracks if the task is expanded or collapsed
        this.level = level;
        this.subtasks = level < 2 ? [] : null; // If level is equal to 2, no more subtasks can be created

        // this.tags = []; ---> Create addToArray (categories) function. **
        // Create assignCategories function
        // this.colour; **
        // this.description; ***
        // this.gallery; ***
        // this.guides; ***
        // this.difficulty; *
    }
}