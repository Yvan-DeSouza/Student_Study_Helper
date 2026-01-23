// static/js/assignments/modals/delete_assignment.js
import { showModal, closeModal } from "../../core/modalManager.js";
import { deleteAssignmentAPI } from "../../domain/assignment_api.js"; 

let deleteState = {
    step: 1,
    id: null,
    title: "",
    studySessions: 0,
    studyMinutes: 0
};

export function openDeleteAssignmentModal(data) {
    deleteState = { step: 1, ...data };

    document.getElementById("deleteAssignmentConfirmName").innerText =
        `"${deleteState.title}"`;

    document.getElementById("deleteAssignmentNextBtn").disabled = false;

    if ("studySessions" in data && "studyMinutes" in data) {
        document.getElementById("deleteAssignmentSessionCount").innerText =
            deleteState.studySessions;
        document.getElementById("deleteAssignmentStudyMinutes").innerText =
            deleteState.studyMinutes;
    }

    updateDeleteStep();
    showModal("deleteAssignmentModal");
}

export function initDeleteAssignmentModal() {
    const nextBtn = document.getElementById("deleteAssignmentNextBtn");
    const backBtn = document.getElementById("deleteAssignmentBackBtn");
    const confirmInput = document.getElementById("deleteAssignmentConfirmInput");
    const confirmBtn = document.getElementById("deleteAssignmentConfirmBtn");

    if (nextBtn) nextBtn.addEventListener("click", () => { deleteState.step++; updateDeleteStep(); });
    if (backBtn) backBtn.addEventListener("click", () => { deleteState.step--; updateDeleteStep(); });

    if (confirmInput) {
        confirmInput.addEventListener("input", () => {
            confirmBtn.disabled = confirmInput.value.trim() !== deleteState.title;
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            try {
                await deleteAssignmentAPI(deleteState.id);
                location.reload();
            } catch {
                alert("Failed to delete assignment");
            }
        });
    }
}

function updateDeleteStep() {
    const stepText = document.getElementById("deleteAssignmentStepText");
    const impactBox = document.getElementById("deleteAssignmentImpactBox");
    const inputBox = document.getElementById("deleteAssignmentInputBox");

    const backBtn = document.getElementById("deleteAssignmentBackBtn");
    const nextBtn = document.getElementById("deleteAssignmentNextBtn");
    const confirmBtn = document.getElementById("deleteAssignmentConfirmBtn");

    impactBox.classList.add("hidden");
    inputBox.classList.add("hidden");
    backBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");
    confirmBtn.classList.add("hidden");

    if (deleteState.step === 1) {
        stepText.innerText = `You are about to permanently delete "${deleteState.title}".`;
    }
    if (deleteState.step === 2) {
        backBtn.classList.remove("hidden");
        impactBox.classList.remove("hidden");
        stepText.innerText = "This assignment has the following impact:";
    }
    if (deleteState.step === 3) {
        backBtn.classList.remove("hidden");
        inputBox.classList.remove("hidden");
        nextBtn.classList.add("hidden");
        confirmBtn.classList.remove("hidden");
        stepText.innerText = "This action cannot be undone.";
    }
}
