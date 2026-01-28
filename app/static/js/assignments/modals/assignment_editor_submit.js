import { updateAssignment } from "../../domain/assignment_api.js";
import { showModal, closeModal } from "../../core/modalManager.js";
import { emitRefresh } from "../../core/refreshBus.js";

export function initEditAssignmentSubmit() {
    const form = document.getElementById("editAssignmentForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Prevent double submission
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;

        try {
            const finishedAt = document.getElementById("edit-finished-at").value;
            if (finishedAt && new Date(finishedAt) > new Date()) {
                showModal("futureFinishDateModal");
                submitBtn.disabled = false;
                return;
            }

            const id = document.getElementById("edit-assignment-id").value;
            const isGraded = document.getElementById("edit-is-graded").checked;

            const payload = {
                title: document.getElementById("edit-title").value,
                assignment_type: document.getElementById("edit-type").value,
                class_id: document.getElementById("edit-class").value,
                due_at: document.getElementById("edit-due-at").value || null,
                finished_at: finishedAt || null,
                is_graded: isGraded,
                expected_grade: isGraded
                    ? document.getElementById("edit-expected-grade").value || null
                    : null,
                pass_grade: isGraded
                    ? document.getElementById("edit-pass-grade").value || null
                    : null,
                ponderation: isGraded
                    ? document.getElementById("edit-ponderation").value || null
                    : null,
                difficulty: document.getElementById("edit-difficulty").value || null,
                estimated_minutes:
                    document.getElementById("edit-estimated-minutes").value || null
            };

            await updateAssignment(id, payload);
            
            // Close modal
            closeModal("editAssignmentModal");
            
            // Emit refresh events
            await emitRefresh("assignments:changed");
            
        } catch (error) {
            console.error("Error updating assignment:", error);
            alert("Failed to update assignment. Please try again.");
        } finally {
            submitBtn.disabled = false;
        }
    });
}

export function initEditAssignmentGradedToggle() {
    const checkbox = document.getElementById("edit-is-graded");
    if (!checkbox) return;

    checkbox.addEventListener("change", (e) => {
        toggleGradedFields(e.target.checked);
    });
}

function toggleGradedFields(enabled) {
    const gradedOnly = document.getElementById("edit-graded-only");
    if (gradedOnly) {
        gradedOnly.classList.toggle("hidden", !enabled);
    }
}