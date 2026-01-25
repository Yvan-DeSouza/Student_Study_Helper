import { initModalEvents } from "../core/modalManager.js";
import { registerRefresh, unregisterRefresh } from "../core/refreshBus.js";

import { initClassSelector } from "../selector/selector_init.js";
import { initVisualElements } from "./utils.js";
import { initInlineEditing } from "./inlineEditing.js";
import { initCompletion } from "./completion.js";
import { initClassModals } from "./modals/classModal.controller.js";
import { initUnsavedChangesModal } from "./modals/unsaved_changes.js";

// Import refresh handlers
import { refreshClassCards } from "./refresh/refresh_cards.js";
import { refreshSingleCard } from "./refresh/refresh_card.js";
import { refreshClassCharts } from "./refresh/refresh_charts.js";

function registerClassListeners() {
    console.log("[Classes] Registering refresh listeners");

    registerRefresh("classes:cards", refreshClassCards);
    registerRefresh("classes:card", refreshSingleCard);
    registerRefresh("classes:charts", refreshClassCharts);
}

function cleanup() {
    unregisterRefresh("classes:cards");
    unregisterRefresh("classes:card");
    unregisterRefresh("classes:charts");
}

document.addEventListener("DOMContentLoaded", () => {
    // Initialize modal system
    initModalEvents();
    
    // Register refresh listeners
    registerClassListeners();

    // Initialize UI components
    initClassSelector();
    initVisualElements();
    initInlineEditing();
    initCompletion();
    initClassModals();
    initUnsavedChangesModal();
});

window.addEventListener("beforeunload", cleanup);