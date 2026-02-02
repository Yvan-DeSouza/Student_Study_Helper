import { getAssignmentSelectorState } from '../../selector/core/state_assignments.js';
import { fetchFilteredAssignments } from '../../selector/core/filter_assignments.js';
import { fetchAssignmentColumns } from '../../columns/api/fetchColumns.js';
import { buildAssignmentTable } from '../../columns/builders/buildTable.js';

export async function refreshAssignmentsTable() {
    console.log("[Assignments] Refreshing table (API)");

    const assignmentState = getAssignmentSelectorState();
    const data = await fetchFilteredAssignments(assignmentState);

    let assignmentIds = [];

    if (data.layout === "single") {
        assignmentIds = data.assignment_ids;
    } else {
        assignmentIds = data.classes.flatMap(c => c.assignment_ids);
    }

    if (!assignmentIds.length) return;



    const { columns, rows } = await fetchAssignmentColumns({
        assignmentIds,
        page: "assignments",
    });
    if (data.layout === "per_class") {
        const wrapper = document.querySelector(
            ".assignments-table-wrapper [data-table-mode='per_class']"
        );

        wrapper.innerHTML = "";

        for (const cls of data.classes) {
            const card = document.querySelector(
                `.per-class-card[data-class-id="${cls.class_id}"]`
            );

            if (!card) continue;

            const mount = card.querySelector(".assignments-table-mount");

            const rowsForClass = rows.filter(r =>
                cls.assignment_ids.includes(r.assignment_id)
            );

            buildAssignmentTable({
                container: mount,
                columns,
                rows: rowsForClass
            });
        }

        return;
    }



    const container = document.querySelector(
        assignmentState.tableLayout === "single"
            ? ".assignments-table-wrapper [data-table-mode='single'] .assignments-table-mount"
            : ".assignments-table-wrapper [data-table-mode='per_class']"
    );


    if (!container) return;


    buildAssignmentTable({
        container,
        columns,
        rows,
    });

    // re-init interactive behavior
    const [
        { initInlineEditing },
        { initCompletion },
        { initDeleteFromTable },
        { initEditFromTable },
    ] = await Promise.all([
        import('../inlineEditing.js'),
        import('../completion.js'),
        import('../adapters/delete_from_table.js'),
        import('../adapters/edit_from_table.js'),
    ]);

    initInlineEditing();
    initCompletion();
    initDeleteFromTable();
    initEditFromTable();
}
