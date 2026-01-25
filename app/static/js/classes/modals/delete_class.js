// static/js/classes/modals/delete_class.controller.js
import { showModal, closeModal } from '../../core/modalManager.js';
import { emitRefresh } from '../../core/refreshBus.js';
import { saveAllInlineEditsSilently } from '../inlineEditing.js';

let currentStep = 1;
let className = "";
let deleteClassId = null;

export function initDeleteClassModal() {
    const deleteModal = document.getElementById("deleteClassModal");
    if (!deleteModal) return;

    const confirmInput = document.getElementById("deleteConfirmInput");
    const confirmBtn = document.getElementById("confirmDelete");
    const cancelBtn = document.getElementById("cancelDelete");
    const backBtn = document.getElementById("deleteBackBtn");

    confirmBtn.addEventListener("click", async (e) => {
        if (currentStep < 3) {
            e.preventDefault();
            currentStep++;
            renderDeleteStep();
            return;
        }

        await executeDelete();
    });

    confirmInput.addEventListener("input", () => {
        confirmBtn.disabled = confirmInput.value !== className;
    });

    backBtn.addEventListener("click", () => {
        if (currentStep > 1) {
            currentStep--;
            renderDeleteStep();
        }
    });

    cancelBtn.addEventListener("click", () => {
        closeModal("deleteClassModal");
    });
}

function renderDeleteStep() {
    const deleteText = document.getElementById("deleteStepText");
    const impactBox = document.getElementById("deleteImpactBox");
    const inputBox = document.getElementById("deleteInputBox");
    const confirmBtn = document.getElementById("confirmDelete");
    const confirmInput = document.getElementById("deleteConfirmInput");
    const backBtn = document.getElementById("deleteBackBtn");

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

async function executeDelete() {
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

        const response = await fetch(`/classes/${deleteClassId}`, {
            method: "DELETE",
            headers: {
                "Accept": "application/json",
                "X-CSRFToken": csrfToken
            }
        });

        if (!response.ok) {
            let err = {};
            try {
                err = await response.json();
            } catch {
                err.error = "Server responded but not in JSON format";
            }
            throw new Error(err.error || "Failed to delete class");
        }

        closeModal("deleteClassModal");
        
        // Emit refresh events
        await emitRefresh("classes:cards", "classes:charts");

    } catch (error) {
        console.error("Error deleting class:", error);
        alert(error);
    }
}

export async function openDeleteClassModal(btn) {
    await saveAllInlineEditsSilently();

    const assignmentCountEl = document.getElementById("assignmentCount");
    const sessionCountEl = document.getElementById("sessionCount");

    className = btn.dataset.className || "";
    deleteClassId = btn.dataset.classId;

    assignmentCountEl.textContent = btn.dataset.assignments || "0";
    sessionCountEl.textContent = btn.dataset.sessions || "0";

    currentStep = 1;
    renderDeleteStep();

    showModal("deleteClassModal");
}