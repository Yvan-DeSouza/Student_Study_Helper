// static/js/classes/index.js
import { initClassSelector } from "../selector/selector_init.js";
import { initVisualElements } from "./utils.js";
import { initInlineEditing } from "./inlineEditing.js";
import { initCompletion } from "./completion.js";
import { initModals } from "./modals/modal.js";
import { initAddClassModal } from "./modals/add_class.js";
import { initEditClassModal } from "./modals/edit_class.js";
import { initDeleteClassModal } from "./modals/delete_class.js";
import { initUnsavedChangesModal } from "./modals/unsaved_changes.js";
import { registerRefresh } from "../core/refreshBus.js";
import { refreshCharts } from "./refresh/refresh_charts.js";
import "./refresh/refresh_classes.js";
import "./refresh/refresh_charts.js";

document.addEventListener("DOMContentLoaded", () => {
    // Register refresh handlers
    registerRefresh("charts", refreshCharts);

    // Initialize selector
    initClassSelector();
    
    // Initialize visual elements (dots, bars, emojis)
    initVisualElements();
    // Initialize modal system
    initModals();

    // Initialize inline editing
    initInlineEditing();

    // Initialize completion logic
    initCompletion();

    // Initialize modals
    initAddClassModal();
    initEditClassModal();
    initDeleteClassModal();
    initUnsavedChangesModal();
});