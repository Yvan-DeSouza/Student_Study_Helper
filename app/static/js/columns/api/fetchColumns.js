
export async function fetchAssignmentColumns({
    assignmentIds,
    page = "assignments",
    now = null,
}) {
    if (!assignmentIds || assignmentIds.length === 0) {
        return { columns: [], rows: [] };
    }

    const payload = {
        assignment_ids: assignmentIds,
        page,
    };

    if (now) {
        payload.now = now;
    }

    const res = await fetch("/api/assignments/columns", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector("meta[name='csrf-token']").content
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch assignment columns");
    }

    return await res.json(); // { columns, rows }
}
