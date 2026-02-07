import { showModal } from "../modals.js";

let currentAssignmentId = null;


function toDatetimeLocal(value) {
  if (!value) return "";

  const d = new Date(value);
  if (isNaN(d)) return "";

  // Convert to YYYY-MM-DDTHH:MM
  const pad = n => String(n).padStart(2, "0");

  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  );
}

export function openEditAssignmentModal(assignment) {
  currentAssignmentId = assignment.id;

  document.getElementById("edit-assignment-id").value = assignment.id;
  document.getElementById("edit-title").value = assignment.title;
  document.getElementById("edit-class").value = assignment.class_id;
  document.getElementById("edit-type").value = assignment.assignment_type;
  document.getElementById("edit-due-at").value = toDatetimeLocal(assignment.due_at) || "";
  document.getElementById("edit-finished-at").value = toDatetimeLocal(assignment.finished_at) || "";

  const gradedCheckbox = document.getElementById("edit-is-graded");
  const graded = assignment.is_graded;

  gradedCheckbox.checked = graded;
  toggleGradedFields(graded);

  gradedCheckbox.onchange = e =>
    toggleGradedFields(e.target.checked);

  document.getElementById("edit-expected-grade").value = assignment.expected_grade || "";
  document.getElementById("edit-pass-grade").value = assignment.pass_grade || "";
  document.getElementById("edit-ponderation").value = assignment.ponderation || "";
  document.getElementById("edit-difficulty").value = assignment.difficulty || "";
  document.getElementById("edit-estimated-minutes").value =
    assignment.estimated_minutes || "";

  showModal("editAssignmentModal");
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
