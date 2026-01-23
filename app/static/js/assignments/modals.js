// static/js/assignments/modals.js
import { saveAllInlineGrades, hasUnsavedChanges, clearUnsavedFlag } from './inlineEditing.js';
import { collectAllInlineAssignments } from './utils.js';
import { validateInlineGrades, clearInvalidGradeHighlights, openInlineFinishDatesModal } from './inlineEditing.js';
import { showModal as coreShowModal, closeModal as coreCloseModal, initModalEvents } from '../core/modalManager.js';

// Re-export so other modules can import from './modals.js'
export const showModal = coreShowModal;
export const closeModal = coreCloseModal;

let pendingNavigationUrl = null;

// Initialize general modal behaviors
export function initModals() {
    initModalEvents();
}

// Unsaved changes modal logic
export function initUnsavedChangesModal() {
    // Intercept navigation links
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", e => {
            if (!hasUnsavedChanges()) return;

            e.preventDefault();
            pendingNavigationUrl = link.href;
            showModal("unsavedChangesModal");
        });
    });

    // Browser-level navigation
    window.addEventListener("beforeunload", e => {
        if (!hasUnsavedChanges()) return;

        e.preventDefault();
        e.returnValue = "";
    });

    // Stay button
    document.getElementById("stayOnPage")?.addEventListener("click", () => {
        closeModal("unsavedChangesModal");
        pendingNavigationUrl = null;
    });

    // Leave without saving
    document.getElementById("leaveWithoutSaving")?.addEventListener("click", () => {
        clearUnsavedFlag();
        closeModal("unsavedChangesModal");

        if (pendingNavigationUrl) {
            window.location.href = pendingNavigationUrl;
        }
    });

    // Save all
    document.getElementById("saveAllInline")?.addEventListener("click", () => {
        document.querySelectorAll(".assignments-table-card")
            .forEach(clearInvalidGradeHighlights);

        let valid = true;
        document.querySelectorAll(".assignments-table-card")
            .forEach(card => {
                if (!validateInlineGrades(card)) valid = false;
            });

        if (!valid) {
            closeModal("unsavedChangesModal");
            showModal("invalidGradeModal");
            return;
        }

        const assignments = collectAllInlineAssignments();
        const missingFinishDates = assignments.filter(a => !a.finished_at);

        closeModal("unsavedChangesModal");

        if (missingFinishDates.length === 0) {
            saveAllInlineGrades(assignments, pendingNavigationUrl);
        } else {
            openInlineFinishDatesModal(missingFinishDates, pendingNavigationUrl);
        }
    });
}

export function getPendingNavigation() {
    return pendingNavigationUrl;
}

export function setPendingNavigation(url) {
    pendingNavigationUrl = url;
}
