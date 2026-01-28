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
import { emitRefresh } from "../core/refreshBus.js";
import { refreshAssignmentRow } from "./refresh/refresh_row.js";
import { initAssignmentSelector } from "../selector/assignments/init.js";
import { saveUpcomingDeadlinesIfDirty } from '../global_refresh/save_upcoming_deadlines.js';

function registerAssignmentListeners() {
    console.log("[Assignments] Registering refresh listeners");
    
    registerRefresh("assignments:table", refreshAssignmentsTable);
    registerRefresh("assignments:charts", refreshAssignmentCharts);
    registerRefresh("assignments:deadlines", refreshAssignmentDeadlines);
    registerRefresh("assignments:row", refreshAssignmentRow);
    // alias for refreshing all tables (useful when many per-class cards exist)
    registerRefresh("assignments:tables", async (payload) => {
        // If single layout, behave like table; otherwise refresh whole table area
        await refreshAssignmentsTable(payload || {});
    });
    
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
    unregisterRefresh("assignments:row");
    unregisterRefresh("assignments:tables");
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

    // Listen for assignment events and translate into semantic refresh events
    document.addEventListener("assignment:changed", async (e) => {
        const detail = e?.detail || {};
        // If caller provided an assignmentId, refresh just that row
        if (detail.assignment_id) {
            await emitRefresh({ key: "assignments:row", payload: { assignmentId: detail.assignment_id } });
        } else if (detail.class_id) {
            await emitRefresh({ key: "assignments:table", payload: { classId: detail.class_id } });
        } else {
            await emitRefresh("assignments:changed");
        }

        // Always refresh charts + deadlines as separate semantic events
        await emitRefresh("assignments:charts");
        await emitRefresh("assignments:deadlines");
    });

    document.addEventListener("assignment:grade:changed", async (e) => {
        const detail = e?.detail || {};
        if (detail.assignment_id) {
            await emitRefresh({ key: "assignments:row", payload: { assignmentId: detail.assignment_id } });
        } else {
            await emitRefresh("assignments:table");
        }
        await emitRefresh("assignments:charts");
    });

    document.addEventListener("assignment:completion:changed", async (e) => {
        const detail = e?.detail || {};
        if (detail.assignment_id) {
            await emitRefresh({ key: "assignments:row", payload: { assignmentId: detail.assignment_id } });
        } else if (detail.class_id) {
            await emitRefresh({ key: "assignments:table", payload: { classId: detail.class_id } });
        } else {
            await emitRefresh("assignments:table");
        }
        await emitRefresh("assignments:charts");
        await emitRefresh("assignments:deadlines");
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