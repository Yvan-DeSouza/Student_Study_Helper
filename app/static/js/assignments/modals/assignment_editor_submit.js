import { updateAssignment } from "../../domain/assignment_api.js";
import { showModal } from "../../core/modalManager.js";

export function initEditAssignmentSubmit() {
  const form = document.getElementById("editAssignmentForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const finishedAt = document.getElementById("edit-finished-at").value;
    if (finishedAt && new Date(finishedAt) > new Date()) {
      showModal("futureFinishDateModal");
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
    document.querySelector("[data-close-modal]")?.click();
    // Emit event
    document.dispatchEvent(new CustomEvent("assignment:changed"));
  });
}

function toggleGradedFields(enabled) {
  document
    .getElementById("edit-graded-only")
    .classList.toggle("hidden", !enabled);
}

export function initEditAssignmentGradedToggle() {
  const checkbox = document.getElementById("edit-is-graded");
  if (!checkbox) return;

  checkbox.addEventListener("change", e =>
    toggleGradedFields(e.target.checked)
  );
}
