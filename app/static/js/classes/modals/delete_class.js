// static/js/classes/modals/delete_class.js
import { showModal, closeModal } from '../../core/modalManager.js';

let currentStep = 1;
let className = "";
let deleteClassId = null;

export function initDeleteClassModal() {
    const deleteModal = document.getElementById("deleteClassModal");
    if (!deleteModal) return;

    const deleteText = document.getElementById("deleteStepText");
    const impactBox = document.getElementById("deleteImpactBox");
    const inputBox = document.getElementById("deleteInputBox");
    const assignmentCountEl = document.getElementById("assignmentCount");
    const sessionCountEl = document.getElementById("sessionCount");
    const confirmInput = document.getElementById("deleteConfirmInput");
    const confirmBtn = document.getElementById("confirmDelete");
    const cancelBtn = document.getElementById("cancelDelete");
    const backBtn = document.getElementById("deleteBackBtn");

    // Open DELETE modal
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            className = btn.dataset.className;
            deleteClassId = btn.dataset.classId;

            assignmentCountEl.textContent = btn.dataset.assignments;
            sessionCountEl.textContent = btn.dataset.sessions;

            currentStep = 1;
            renderDeleteStep();

            showModal("deleteClassModal");
        });
    });

    // Next/Confirm button
    confirmBtn.addEventListener("click", async (e) => {
        if (currentStep < 3) {
            e.preventDefault();
            currentStep++;
            renderDeleteStep();
            return;
        }

        // FINAL DELETE STEP
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

        const response = await fetch(`/classes/${deleteClassId}`, {
            method: "DELETE",
            headers: {
                "X-CSRFToken": csrfToken
            }
        });

        if (response.ok) {
            window.location.reload();
        } else {
            alert("Failed to delete class.");
        }
    });

    // Enable delete only when name matches
    confirmInput.addEventListener("input", () => {
        confirmBtn.disabled = confirmInput.value !== className;
    });

    // Back button
    backBtn.addEventListener("click", () => {
        if (currentStep > 1) {
            currentStep--;
            renderDeleteStep();
        }
    });

    // Cancel delete
    cancelBtn.addEventListener("click", () => {
        closeModal("deleteClassModal");
    });

    function renderDeleteStep() {
        confirmBtn.disabled = currentStep === 3;
        confirmInput.value = "";

        impactBox.classList.add("hidden");
        inputBox.classList.add("hidden");
        backBtn.style.display = currentStep === 1 ? "none" : "inline-block";

        if (currentStep === 1) {
            deleteText.textContent = `Are you sure you want to delete the "${className}" class?`;
        }

        if (currentStep === 2) {
            deleteText.textContent = "Deleting this class will permanently remove:";
            impactBox.classList.remove("hidden");
        }

        if (currentStep === 3) {
            deleteText.textContent = `To confirm deletion of "${className}", type the class name below.`;
            inputBox.classList.remove("hidden");
        }

        confirmBtn.textContent = currentStep < 3 ? "Next" : "Delete";
    }
}