// static/js/classes/modals/classModal.controller.js
import { initAddClassModal, openAddClassModal } from './add_class.js';
import { initEditClassModal, openEditClassModal } from './edit_class.js';
import { initDeleteClassModal, openDeleteClassModal } from './delete_class.js';

export function initClassModalController() {
    // Initialize all modals
    initAddClassModal();
    initEditClassModal();
    initDeleteClassModal();

    // Global click handler for all class modal triggers
    function handleClick(e) {
        const btn = e.target.closest("[data-open-modal], [data-mode]");
        if (!btn) return;

        const modalType = btn.dataset.openModal || btn.dataset.mode;
        if (!modalType) return;

        // Only handle class-related modals
        const classModalTypes = ["addClassModal", "add", "edit", "delete"];
        if (!classModalTypes.includes(modalType)) return;

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

    // Re-attach event listeners after classes refresh
    document.addEventListener("classes:updated", () => {
        attachClassCardButtons();
    });

    // Initial attachment
    attachClassCardButtons();
}

function attachClassCardButtons() {
    document.querySelectorAll(".class-card").forEach(card => {
        const editBtn = card.querySelector("[data-mode='edit']");
        const deleteBtn = card.querySelector("[data-mode='delete']");

        // Remove old listeners by cloning (prevents duplicate listeners)
        if (editBtn) {
            const newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            
            newEditBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openEditClassModal(newEditBtn);
            });
        }

        if (deleteBtn) {
            const newDeleteBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
            
            newDeleteBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openDeleteClassModal(newDeleteBtn);
            });
        }
    });
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClassModalController);
} else {
    initClassModalController();
}