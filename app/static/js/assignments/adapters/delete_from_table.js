// Attach click listeners to table rows in delete mode
import { openDeleteAssignmentModal } from "../modals/delete_assignment.js";

export function initDeleteFromTable() {
    document.querySelectorAll(".assignments-table-card").forEach(card => {
        const rows = card.querySelectorAll("tbody tr");

        rows.forEach(row => {
            row.addEventListener("click", async e => {
                if (card.dataset.deleteMode !== "true") return;

                e.stopPropagation();
                e.preventDefault();

                const data = {
                    id: row.dataset.assignmentId,
                    title: row.dataset.title,
                };

                // Await the modal opening (which now fetches summary internally)
                await openDeleteAssignmentModal(data);
            });
        });
    });
}
