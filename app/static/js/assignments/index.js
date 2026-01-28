import { initEditAssignmentModal } from "./modals/edit_assignment_init.js";
import { initEditAssignmentSubmit, initEditAssignmentGradedToggle } from "./modals/assignment_editor_submit.js";
import { initAddAssignmentSubmit } from "./modals/add_assignment_submit.js";
import { initInlineEditing } from './inlineEditing.js';
import { initCompletion } from './completion.js';
import { initDeleteFromTable } from './adapters/delete_from_table.js';
import { initDeleteAssignmentModal } from './modals/delete_assignment.js';
import { initEditFromTable } from './adapters/edit_from_table.js';
import { initModals, initUnsavedChangesModal } from './modals.js';
import { refreshAssignmentsTable } from "./refresh/refresh_table.js";
import { refreshAssignmentCharts } from "./refresh/refresh_charts.js";
import { refreshAssignmentDeadlines } from "./refresh/refresh_deadlines.js";
import { registerRefresh, unregisterRefresh } from "../core/refreshBus.js";
import { initAssignmentSelector } from "../selector/assignments/init.js";
import { saveUpcomingDeadlinesIfDirty } from '../global_refresh/save_upcoming_deadlines.js';

function registerAssignmentListeners() {
    console.log("[Assignments] Registering refresh listeners");
    
    registerRefresh("assignments:table", refreshAssignmentsTable);
    registerRefresh("assignments:charts", refreshAssignmentCharts);
    registerRefresh("assignments:deadlines", refreshAssignmentDeadlines);
    
    // Combined refresh for full assignment changes
    registerRefresh("assignments:changed", async () => {
        await refreshAssignmentsTable();
        await refreshAssignmentCharts();
        await refreshAssignmentDeadlines();
    });
}

function cleanup() {
    unregisterRefresh("assignments:table");
    unregisterRefresh("assignments:charts");
    unregisterRefresh("assignments:deadlines");
    unregisterRefresh("assignments:changed");
}

document.addEventListener("DOMContentLoaded", () => {
    // Normalize completed attributes
    document.querySelectorAll("tr[data-completed]").forEach(row => {
        const raw = row.dataset.completed;
        row.dataset.completed =
            raw === "true" || raw === "True" || raw === "1"
                ? "true"
                : "false";
    });

    // Initialize modal system
    initModals();
    
    // Initialize all modules
    initEditAssignmentModal();
    initEditAssignmentSubmit();
    initEditAssignmentGradedToggle();
    initAddAssignmentSubmit();
    initInlineEditing();
    initCompletion();
    initDeleteAssignmentModal();
    initDeleteFromTable();
    initEditFromTable();
    initUnsavedChangesModal();

    // Initialize selector system
    initAssignmentSelector();
    
    // Initialize sort category
    initSortCategory();
    
    // Register refresh listeners
    registerAssignmentListeners();

    // Listen for assignment events
    document.addEventListener("assignment:changed", async () => {
        console.log("[Assignments] Assignment changed event");
        await refreshAssignmentsTable();
        await refreshAssignmentCharts();
        await refreshAssignmentDeadlines();
    });

    document.addEventListener("assignment:grade:changed", async () => {
        console.log("[Assignments] Grade changed event");
        await refreshAssignmentsTable();
        await refreshAssignmentCharts();
    });

    document.addEventListener("assignment:completion:changed", async () => {
        console.log("[Assignments] Completion changed event");
        await refreshAssignmentsTable();
        await refreshAssignmentCharts();
        await refreshAssignmentDeadlines();
    });
});

window.addEventListener("beforeunload", () => {
    saveUpcomingDeadlinesIfDirty("assignments");
    cleanup();
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