// static/js/columns/adapters/assignments.js

export const assignmentAdapter = {
    applyRowDataset(tr, rowData) {
        tr.dataset.assignmentId = rowData.assignment_id;
        if (rowData.class_id) {
            tr.dataset.classId = rowData.class_id;
        }
    },

    afterRowRender(tr, rowData) {
        // Normalize booleans (needed by existing logic)
        if (rowData.is_completed !== undefined) {
            tr.dataset.completed = rowData.is_completed ? "true" : "false";
        }

        if (rowData.is_graded !== undefined) {
            tr.dataset.graded = rowData.is_graded ? "true" : "false";
        }

        // Emit hook for legacy systems that listen to DOM rows
        tr.dispatchEvent(new CustomEvent("assignment:row:rendered", {
            bubbles: true,
            detail: {
                assignmentId: rowData.assignment_id
            }
        }));
    },

};
