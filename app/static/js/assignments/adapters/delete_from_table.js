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

                // Fetch summary only if needed
                try {
                    const res = await fetch(`/assignments/${data.id}/summary`);
                    if (res.ok) {
                        const summary = await res.json();
                        data.studySessions = summary.study_session_count;
                        data.studyMinutes = summary.study_minutes;
                    }
                } catch {
                    data.studySessions = "—";
                    data.studyMinutes = "—";
                }

                openDeleteAssignmentModal(data);
            });
        });
    });
}
