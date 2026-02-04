import { openEditAssignmentModal } from "../modals/assignment_editor.js";

export function initEditFromTable() {
    // EVENT DELEGATION: Listen on document for dynamically created rows
    document.addEventListener("click", handleRowClick);
}

function handleRowClick(e) {
    const row = e.target.closest("tr[data-assignment-id]");
    if (!row) return;

    const card = row.closest(".assignments-table-card");
    if (!card || card.dataset.editing !== "true") return;
    
    if (e.target.closest("input, select, button, label")) return;

    openEditAssignmentModal({
        id: row.dataset.assignmentId,
        title: row.dataset.title,
        class_id: row.dataset.classId,
        assignment_type: row.dataset.assignmentType,
        due_at: row.dataset.dueAt || null,
        finished_at: row.dataset.finishedAt || null,
        is_graded: row.dataset.graded === "true",
        expected_grade: row.dataset.expectedGrade || null,
        pass_grade: row.dataset.passGrade || null,
        ponderation: row.dataset.ponderation || null,
        difficulty: row.dataset.difficulty || null,
        estimated_minutes: row.dataset.estimatedMinutes || null
    });
}