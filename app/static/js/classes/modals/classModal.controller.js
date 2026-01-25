// static/js/classes/modals/classModal.controller.js
import { initAddClassModal, openAddClassModal } from './add_class.js';
import { initEditClassModal, openEditClassModal } from './edit_class.js';
import { initDeleteClassModal, openDeleteClassModal } from './delete_class.js';

export function initClassModals() {
    initAddClassModal();
    initEditClassModal();
    initDeleteClassModal();

    // Listen for modal open events
    document.addEventListener("modal:open", (e) =>{
    const { feature, mode, source } = e.detail;
        if (feature === "addClassModal") {
            openAddClassModal();
        }

        if (feature === "editClassModal") {
            openEditClassModal(source);
        }

        if (feature === "deleteClassModal") {
            openDeleteClassModal(source);
        }
    });
}