// static/js/assignments/modals.js
import { saveAllInlineGrades, hasUnsavedChanges, clearUnsavedFlag } from './inlineEditing.js';
import { collectAllInlineAssignments } from './utils.js';
import { validateInlineGrades, clearInvalidGradeHighlights, openInlineFinishDatesModal } from './inlineEditing.js';


let pendingNavigationUrl = null;

export function showModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    document.querySelectorAll(".modal-overlay")
        .forEach(m => m.classList.remove("modal-top"));

    modal.classList.add("modal-top");
    modal.classList.remove("hidden");
    modal.classList.add("visible");
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("visible");
    modal.classList.add("hidden");
}

export function initModals() {
    // Generic close modal handler
    document.addEventListener("click", e => {
        const btn = e.target.closest("[data-close-modal]");
        if (!btn) return;

        const modal = btn.closest(".modal-overlay");
        if (!modal) return;

        modal.classList.remove("visible");
        modal.classList.add("hidden");
    });
}

export function initUnsavedChangesModal() {

    // Intercept navigation
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
    document.getElementById("stayOnPage")
        .addEventListener("click", () => {
            closeModal("unsavedChangesModal");
            pendingNavigationUrl = null;
        });

    // Leave without saving
    document.getElementById("leaveWithoutSaving")
        .addEventListener("click", () => {
            clearUnsavedFlag();
            closeModal("unsavedChangesModal");

            if (pendingNavigationUrl) {
                window.location.href = pendingNavigationUrl;
            }
        });

    // Save all
    document.getElementById("saveAllInline")
        .addEventListener("click", () => {
            document
                .querySelectorAll(".assignments-table-card")
                .forEach(clearInvalidGradeHighlights);

            let valid = true;
            document
                .querySelectorAll(".assignments-table-card")
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