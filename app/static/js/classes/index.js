import { initClassSelector } from "../selector/selector_init.js";
import "./utils.js";
import "./modals/add_class.js";
import "./modals/edit_class.js";
import "./modals/class_editor.js";
import "./modals/unsaved_changes.js";
import "./modals/delete_class.js";


document.addEventListener("DOMContentLoaded", () => {
    initClassSelector();
    // any global initialization if needed
});
