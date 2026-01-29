import { openEditAssignmentModal } from "../modals/assignment_editor.js";

export function initEditFromTable() {
  document.querySelectorAll(".assignments-table-card").forEach(card => {
    const rows = card.querySelectorAll("tbody tr");

    rows.forEach(row => {
      row.addEventListener("click", e => {
        console.log(row.dataset.graded);
        if (card.dataset.editing !== "true") return;
        if (e.target.closest("input, select, button, label")) return;

        openEditAssignmentModal({
          id: row.dataset.assignmentId,
          title: row.dataset.title,
          class_id: row.dataset.classId,
          assignment_type: row.dataset.assignmentType,
          due_at: row.dataset.dueAt !== "null" ? row.dataset.dueAt : null,
          finished_at: row.dataset.finishedAt || null,
          is_graded: row.dataset.graded,
          expected_grade: row.dataset.expectedGrade,
          pass_grade: row.dataset.passGrade,
          ponderation: row.dataset.ponderation,
          difficulty: row.dataset.difficulty,
          estimated_minutes: row.dataset.estimatedMinutes
        });
      });
    });
  });
}