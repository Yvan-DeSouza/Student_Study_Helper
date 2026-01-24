import { initClassSelector } from "../selector/selector_init.js";
import { initVisualElements } from "./utils.js";
import { initInlineEditing } from "./inlineEditing.js";
import { initCompletion } from "./completion.js";
import { initModals } from "./modals/modal.js";
import { initUnsavedChangesModal } from "./modals/unsaved_changes.js";
import "./refresh/refresh_classes.js";
import "./refresh/refresh_charts.js";

document.addEventListener("DOMContentLoaded", () => {
    initClassSelector();
    initVisualElements();
    initInlineEditing();
    initCompletion();
    initModals();
    initUnsavedChangesModal();
});
