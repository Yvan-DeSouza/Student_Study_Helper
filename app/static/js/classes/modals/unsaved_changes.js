// static/js/classes/modals/unsaved_changes.js
import { showModal, closeModal } from '../../core/modalManager.js';
import { hasUnsavedChanges, clearUnsavedFlag, saveAllInlineGrades } from '../inlineEditing.js';

let pendingNavigation = null;

export function initUnsavedChangesModal() {
    // Intercept navigation links
    document.addEventListener("click", (e) => {
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const link = e.target.closest("a[href]");
        if (!link) return;

        if (link.dataset.openModal) return;
        if (link.dataset.ignoreUnsaved === "true") return;
        if (!link.contains(e.target)) return;

        if (!hasUnsavedChanges()) return;

        e.preventDefault();

        pendingNavigation = () => {
            window.location.href = link.href;
        };

        showModal("unsavedChangesModal");
    });

    // Browser-level page leave
    window.addEventListener("beforeunload", (e) => {
        if (!hasUnsavedChanges()) return;
        e.preventDefault();
        e.returnValue = "";
    });

    // Stay button
    document.getElementById("stayOnPage")?.addEventListener("click", () => {
        pendingNavigation = null;
        closeModal("unsavedChangesModal");
    });

    // Leave without saving
    document.getElementById("leaveWithoutSaving")?.addEventListener("click", () => {
        clearUnsavedFlag();
        closeModal("unsavedChangesModal");

        if (pendingNavigation) {
            pendingNavigation();
        }
    });

    // Save all
    document.getElementById("saveAllInline")?.addEventListener("click", async () => {
        const success = await saveAllInlineGrades();

        if (!success) {
            return;
        }

        closeModal("unsavedChangesModal");

        if (pendingNavigation) {
            pendingNavigation();
        }
    });

}