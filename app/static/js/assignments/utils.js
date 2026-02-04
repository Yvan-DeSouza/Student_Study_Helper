export function validateInlineGrades(card) {
    let hasInvalid = false;

    card.querySelectorAll(".inline-grade-input").forEach(input => {
        const raw = input.value.trim();

        if (raw === "") return;

        const num = Number(raw);

        const isValid =
            Number.isFinite(num) &&
            num >= 0 &&
            num <= 100;

        if (!isValid) {
            input.classList.add("invalid");
            hasInvalid = true;
        }
    });

    return !hasInvalid;
}

export function clearInvalidGradeHighlights(card) {
    card.querySelectorAll(".inline-grade-input.invalid")
        .forEach(input => input.classList.remove("invalid"));
}

export function collectInlineGradedAssignments(card) {
    const assignments = [];

    card.querySelectorAll("tbody tr").forEach(row => {
        const input = row.querySelector(".inline-grade-input");
        if (!input) return;

        const value = input.value.trim();
        if (value === "") return;

        assignments.push({
            id: row.dataset.assignmentId,
            title: row.dataset.title,
            class_id: row.dataset.classId,
            due_at: row.dataset.dueAt || null,
            grade: Number(value),
            finished_at: row.dataset.finishedAt || null
        });
    });

    return assignments;
}

export function collectAllInlineAssignments() {
    const assignments = [];

    document.querySelectorAll(".assignments-table-card").forEach(card => {
        card.querySelectorAll("tbody tr").forEach(row => {
            const input = row.querySelector(".inline-grade-input");
            if (!input) return;

            const value = input.value.trim();
            if (value === "") return;

            assignments.push({
                id: row.dataset.assignmentId,
                title: row.dataset.title,
                class_id: row.dataset.classId,
                due_at: row.dataset.dueAt || null,
                grade: Number(value),
                finished_at: row.dataset.finishedAt || null
            });
        });
    });

    return assignments;
}