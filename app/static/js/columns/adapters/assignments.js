// static/js/columns/adapters/assignments.js

export const assignmentAdapter = {
    applyRowDataset(tr, rowData) {
        tr.dataset.assignmentId = rowData.assignment_id;
        
        if (rowData.class_id) {
            tr.dataset.classId = rowData.class_id;
        }

        // Extract ALL metadata for modals and interactions
        const meta = rowData._meta || {};
        
        tr.dataset.title = meta.title || "";
        tr.dataset.assignmentType = meta.assignment_type || "";
        tr.dataset.dueAt = meta.due_at || "";
        tr.dataset.finishedAt = meta.finished_at || "";
        
        // Convert booleans to strings
        tr.dataset.completed = meta.is_completed ? "true" : "false";
        tr.dataset.graded = meta.is_graded ? "true" : "false";
        
        // Numeric fields (use empty string for null)
        tr.dataset.grade = meta.grade !== null && meta.grade !== undefined ? String(meta.grade) : "";
        tr.dataset.ponderation = meta.ponderation !== null && meta.ponderation !== undefined ? String(meta.ponderation) : "";
        tr.dataset.passGrade = meta.pass_grade !== null && meta.pass_grade !== undefined ? String(meta.pass_grade) : "";
        tr.dataset.expectedGrade = meta.expected_grade !== null && meta.expected_grade !== undefined ? String(meta.expected_grade) : "";
        tr.dataset.difficulty = meta.difficulty !== null && meta.difficulty !== undefined ? String(meta.difficulty) : "";
        tr.dataset.estimatedMinutes = meta.estimated_minutes !== null && meta.estimated_minutes !== undefined ? String(meta.estimated_minutes) : "";
    },

    afterRowRender(tr, rowData) {
        // Emit hook for legacy systems that listen to DOM rows
        tr.dispatchEvent(new CustomEvent("assignment:row:rendered", {
            bubbles: true,
            detail: {
                assignmentId: rowData.assignment_id
            }
        }));
    },
};