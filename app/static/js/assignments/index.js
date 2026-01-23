// static/js/assignments/index.js
import { initInlineEditing } from './inlineEditing.js';
import { initCompletion } from './completion.js';
import { initDeleteAssignment } from './deleteAssignment.js';
import { initEditAssignment } from './editAssignment.js';
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
    initModals();
    initInlineEditing();
    initCompletion();
    initDeleteAssignment();
    initEditAssignment();
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