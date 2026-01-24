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
import { refreshClassCards } from "./refresh/refresh_cards.js";
import { runRefreshes } from "../core/refreshBus.js";

document.addEventListener("DOMContentLoaded", () => {
    // Initialize modal system
    initModalEvents();

    // Register refresh
    registerRefresh("cards", refreshClassCards);
    registerRefresh("charts", refreshCharts);

    // Listen for class changes
    document.addEventListener("class:changed", async () => {
        await runRefreshes(["cards", "charts"]);
    });

    // Listen for class grade changes
    document.addEventListener("class:grade:changed", async () => {
        await runRefreshes(["charts"]);
    });

    // Listen for class completion changes
    document.addEventListener("class:completion:changed", async () => {
        await runRefreshes(["cards", "charts"]);
    });

    // Listen for assignment changes
    document.addEventListener("assignment:changed", async () => {
        await runRefreshes(["charts"]);
    });

    initClassSelector();
    initVisualElements();
    initInlineEditing();
    initCompletion();
    initModals();
    initUnsavedChangesModal();
});