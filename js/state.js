export let appState = {

    /*
    ==========================================================

    ----------------------- Stored Data ----------------------

    ==========================================================
    */
    games: [],
    activeGameId: null,


    /*
    ==========================================================

    ----------------------- UI State -------------------------

    ==========================================================
    */
    creatingSubtaskFor: null,   // Which task currently shows the subtask input
    selectedTaskId: null,       // Which root task is open in the drawer


    /*
    ==========================================================

    ------------------- Drawer Edit State --------------------

    ==========================================================
    */
    editingTaskId: null,        // Root task having the title edited inside drawer (null when not editing title)
    editingValue: "",           // Draft title value
    editingDescription: null,   // Draft description value
    originalTitle: "",          // Original title when the drawer opened/last saved
    originalDescription: "",    // Original description when the drawer opened/last saved
    isTaskUnsaved: false,       // Enables/disables save + discard


    /*
    ==========================================================

    ---------------------- Sorting UI ------------------------

    ==========================================================
    */
    sortRootByCreated: null,    // null, "desc", "asc"


    /*
    ==========================================================

    -------------------- Subtask Input UI --------------------

    ==========================================================
    */
    subtaskDrafts: {},          // Draft per parent


    /*
    ==========================================================

    ------------------ Inline Edit (Subtasks) ----------------

    ==========================================================
    */
    inlineEditingTaskId: null,  // Subtask currently being inline-edited
    inlineEditingValue: "",     // Inline edit draft value


    /*
    ==========================================================

    ------------------------ Undo ----------------------------

    ==========================================================
    */
    undoSnapshot: null,         // Stores the previous appState.games for one-step undo
};