// static/js/assignments/index.js
import { initEditAssignmentModal } from "./modals/edit_assignment_init.js";
import { initEditAssignmentSubmit } from "./modals/assignment_editor_submit.js";
import { initEditAssignmentGradedToggle } from "./modals/assignment_editor.js";
import { initInlineEditing } from './inlineEditing.js';
import { initCompletion } from './completion.js';
import { initDeleteFromTable } from './adapters/delete_from_table.js';
import { initDeleteAssignmentModal } from './modals/delete_assignment.js';
import { initEditFromTable } from './adapters/edit_from_table.js';
import { initModals, initUnsavedChangesModal } from './modals.js';





document.addEventListener("DOMContentLoaded", () => {
    // Normalize completed attributes
    document.querySelectorAll("tr[data-completed]").forEach(row => {
        const raw = row.dataset.completed;
        row.dataset.completed =
            raw === "true" || raw === "True" || raw === "1"
                ? "true"
                : "false";
    });

    // Initialize all modules
    initEditAssignmentModal();
    initEditAssignmentSubmit();
    initEditAssignmentGradedToggle();
    initModals();
    initInlineEditing();
    initCompletion();
    initDeleteAssignmentModal();  
    initDeleteFromTable();      

    initEditFromTable();
    initUnsavedChangesModal();

    // Sort category logic
    initSortCategory();
});

function initSortCategory() {
    const radios = document.querySelectorAll("input[name='sortCategory']");
    const sortSelect = document.getElementById("assignmentSortBy");

    function updateSortOptions(category) {
        [...sortSelect.options].forEach(opt => {
            opt.hidden = opt.dataset.cat !== category;
        });

        const firstVisible = [...sortSelect.options].find(o => !o.hidden);
        if (firstVisible) sortSelect.value = firstVisible.value;
    }

    radios.forEach(radio => {
        radio.addEventListener("change", e => {
            updateSortOptions(e.target.value);
        });
    });

    const checked = document.querySelector("input[name='sortCategory']:checked");
    if (checked) updateSortOptions(checked.value);
}