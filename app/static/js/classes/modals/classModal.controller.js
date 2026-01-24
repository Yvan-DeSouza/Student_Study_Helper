// js/classes/modals/classModal.controller.js
import { openAddClassModal } from './add_class.js';
import { openEditClassModal } from './edit_class.js';
import { openDeleteClassModal } from './delete_class.js';

// Handle all "class" modals
export function initClassModalController() {
    function handleClick(e) {
        const btn = e.target.closest("[data-open-modal]");
        if (!btn) return;

        const modalType = btn.dataset.openModal || btn.dataset.mode;

        if (!modalType) return;

        e.preventDefault();

        switch (modalType) {
            case "addClassModal":
            case "add":
                openAddClassModal();
                break;
            case "edit":
                openEditClassModal(btn);
                break;
            case "delete":
                openDeleteClassModal(btn);
                break;
        }
    }

    // Capture all clicks on the page for class modals
    document.body.addEventListener("click", handleClick);

    // Re-init buttons after classes refresh
    document.addEventListener("classes:updated", () => {
        document.querySelectorAll(".class-card").forEach(card => {
            const editBtn = card.querySelector("[data-mode='edit']");
            const deleteBtn = card.querySelector("[data-mode='delete']");

            if (editBtn) editBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openEditClassModal(editBtn);
            });

            if (deleteBtn) deleteBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openDeleteClassModal(deleteBtn);
            });
        });
    });
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initClassModalController);
