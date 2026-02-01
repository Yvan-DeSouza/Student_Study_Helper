// static/js/columns/adapters/assignments.js

export const assignmentAdapter = {
    applyRowDataset(tr, rowData) {
        tr.dataset.assignmentId = rowData.assignment_id;
        if (rowData.class_id) {
            tr.dataset.classId = rowData.class_id;
        }
    },

    afterRowRender(tr, rowData) {
        // Inline editing, completion, delete adapters hook here later
    },
};
