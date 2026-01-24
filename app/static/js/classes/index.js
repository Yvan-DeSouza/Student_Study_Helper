// static/js/classes/index.js
import { initModalEvents } from "../core/modalManager.js";
import { registerRefresh } from "../core/refreshBus.js";


import { initClassSelector } from "../selector/selector_init.js";
import { initVisualElements } from "./utils.js";
import { initInlineEditing } from "./inlineEditing.js";
import { initCompletion } from "./completion.js";
import { initModals } from "./modals/modal.js";
import { initUnsavedChangesModal } from "./modals/unsaved_changes.js";

// Import refresh handlers
import "./refresh/refresh_classes.js"; // Auto-registers
import { refreshCharts } from "./refresh/refresh_charts.js";

document.addEventListener("DOMContentLoaded", () => {
    // Initialize modal system
    initModalEvents();

    // Register chart refresh
    registerRefresh("charts", refreshCharts);

    // Listen for class changes
    document.addEventListener("class:changed", async () => {
        // Charts will be refreshed via the runRefreshes call in modals
    });
    
    initClassSelector();
    initVisualElements();
    initInlineEditing();
    initCompletion();
    initModals();
    initUnsavedChangesModal();
});