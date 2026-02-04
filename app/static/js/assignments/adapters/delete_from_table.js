
import { openDeleteAssignmentModal } from "../modals/delete_assignment.js";

export function initDeleteFromTable() {
    // EVENT DELEGATION: Listen on document for dynamically created rows
    document.addEventListener("click", handleRowClick);
}

async function handleRowClick(e) {
    const row = e.target.closest("tr[data-assignment-id]");
    if (!row) return;

    const card = row.closest(".assignments-table-card");
    if (!card || card.dataset.deleteMode !== "true") return;

    e.stopPropagation();
    e.preventDefault();

    const data = {
        id: row.dataset.assignmentId,
        title: row.dataset.title,
    };

    await openDeleteAssignmentModal(data);
}