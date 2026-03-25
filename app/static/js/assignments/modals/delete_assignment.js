import { showModal, closeModal } from "../../core/modalManager.js";
import { deleteAssignmentAPI } from "../../domain/assignment_api.js"; 

let deleteState = {
    step: 1,
    id: null,
    title: "",
    studySessions: 0,
    studyMinutes: 0
};

export async function openDeleteAssignmentModal(data) {
    deleteState = { step: 1, ...data };

    document.getElementById("deleteAssignmentConfirmName").innerText =
        `"${deleteState.title}"`;

    document.getElementById("deleteAssignmentNextBtn").disabled = false;

    // FETCH SUMMARY DATA BEFORE DELETION (required for impact assessment)
    // This must happen before delete to ensure assignment still exists
    try {
        const res = await fetch(`/assignments/${deleteState.id}/summary`);
        if (res.ok) {
            const summary = await res.json();
            deleteState.studySessions = summary.study_session_count ?? 0;
            deleteState.studyMinutes = summary.study_minutes ?? 0;
        }
    } catch (e) {
        console.warn('Failed to fetch assignment summary for delete modal', e);
        deleteState.studySessions = data.studySessions ?? 0;
        deleteState.studyMinutes = data.studyMinutes ?? 0;
    }

    // Display the fetched impact data
    document.getElementById("deleteAssignmentSessionCount").innerText =
        deleteState.studySessions;
    document.getElementById("deleteAssignmentStudyMinutes").innerText =
        deleteState.studyMinutes;

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
            confirmBtn.disabled = true;
            try {
                const assignmentId = deleteState.id;
                
                // STEP 1: FIND AND REMOVE ROW(S) FROM DOM
                // Do this BEFORE deletion so we know what to remove
                const rowsToRemove = document.querySelectorAll(`tr[data-assignment-id="${assignmentId}"]`);
                const cardsToUpdate = new Set();
                
                rowsToRemove.forEach(row => {
                    // Track which card this row is in
                    const card = row.closest('.assignments-table-card');
                    if (card) {
                        cardsToUpdate.add(card);
                    }
                    // Remove the row from DOM immediately (for UX feedback)
                    row.remove();
                });
                
                // STEP 2: CLOSE MODAL (user sees row is gone)
                closeModal("deleteAssignmentModal");
                
                // STEP 3: DELETE FROM DATABASE (AFTER DOM is updated and modal closed)
                // This is the last step that requires the assignment to exist
                await deleteAssignmentAPI(assignmentId);
                
                // STEP 4: EMIT REFRESH EVENTS
                // Charts, deadlines, and any other dependent data will update
                document.dispatchEvent(new CustomEvent("assignment:changed", {
                    detail: { assignment_id: assignmentId }
                }));
                
                // Reset state for next use
                deleteState = {
                    step: 1,
                    id: null,
                    title: "",
                    studySessions: 0,
                    studyMinutes: 0
                };
            } catch (error) {
                console.error('Delete failed:', error);
                alert("Failed to delete assignment");
                confirmBtn.disabled = false;
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
