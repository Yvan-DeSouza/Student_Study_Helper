
export async function fetchFilteredAssignments(state, page = "assignments") {
    const payload = {
        page,
        layout: state.tableLayout,
        sort: state.sortBy,
        filters: {
            due_status: state.dueStatus,
            completion: state.completion,
            graded: state.graded,
            created: state.created,
            assignment_types: state.assignmentTypes
        }
    };
    
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    const res = await fetch("/api/select/assignments2", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error("Failed to fetch filtered assignments");
    }

    const data = await res.json();
    return data;
}