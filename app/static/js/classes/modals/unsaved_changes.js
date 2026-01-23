import { showModal, closeModal } from "../../core/modalManager.js";

document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("saveAllInline");
    const leaveBtn = document.getElementById("leaveWithoutSaving");
    const stayBtn = document.getElementById("stayOnPage");
    const modalId = "unsavedChangesModal";

    saveBtn?.addEventListener("click", () => {
        // implement saving logic
        console.log("Saving all changes...");
        closeModal(modalId);
    });

    leaveBtn?.addEventListener("click", () => {
        window.location.href = "/"; // or previous page
    });

    stayBtn?.addEventListener("click", () => {
        closeModal(modalId);
    });
});
