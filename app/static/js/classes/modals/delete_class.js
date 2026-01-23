import { showModal, closeModal } from "../../core/modalManager.js";

document.addEventListener("DOMContentLoaded", () => {
    const deleteBtns = document.querySelectorAll(".delete-btn");
    const modal = document.getElementById("deleteClassModal");
    if (!modal) return;

    const stepText = document.getElementById("deleteStepText");
    const impactBox = document.getElementById("deleteImpactBox");
    const inputBox = document.getElementById("deleteInputBox");
    const confirmBtn = document.getElementById("confirmDelete");
    const cancelBtn = document.getElementById("cancelDelete");

    deleteBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const name = btn.dataset.className;
            const assignments = btn.dataset.assignments;
            const sessions = btn.dataset.sessions;

            stepText.textContent = `Are you sure you want to delete "${name}"?`;
            impactBox.querySelector("#assignmentCount").textContent = assignments;
            impactBox.querySelector("#sessionCount").textContent = sessions;
            
            showModal("deleteClassModal");
        });
    });

    cancelBtn?.addEventListener("click", () => closeModal("deleteClassModal"));
});
