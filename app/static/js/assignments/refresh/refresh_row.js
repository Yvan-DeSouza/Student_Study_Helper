// static/js/assignments/refresh/refresh_row.js
import { getAssignmentSelectorState } from '../../selector/core/state_assignments.js';
import { getClassSelectorState } from '../../selector/core/state_classes.js';
import { fetchFilteredAssignments } from '../../selector/core/filter_assignments.js';
import { fetchFilteredClassIds } from '../../selector/core/filter_classes.js';
import { applyAssignmentOrdering } from '../../selector/assignments/apply.js';

export async function refreshAssignmentRow({ assignmentId } = {}) {
    if (!assignmentId) return;

    console.log(`[Assignments] Refreshing row ${assignmentId}`);

    try {
        // Capture state
        const assignmentState = getAssignmentSelectorState();
        const classState = getClassSelectorState();

        const response = await fetch(`/assignments/${assignmentId}/row`);
        if (!response.ok) throw new Error('Failed to fetch assignment row');

        const html = await response.text();

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const newRow = temp.querySelector(`tr[data-assignment-id="${assignmentId}"]`);
        if (!newRow) {
            // Row not present in returned HTML — nothing to do
            return;
        }

        // Find existing row in any table and replace
        const existing = document.querySelector(`tr[data-assignment-id="${assignmentId}"]`);
        if (existing && existing.parentElement) {
            existing.parentElement.replaceChild(newRow, existing);
        } else {
            // If row not present in DOM, maybe it should appear in current filtered view — insert into single table tbody if available
            const singleTbody = document.querySelector('.assignments-table-wrapper [data-table-mode="single"] tbody');
            if (singleTbody) singleTbody.appendChild(newRow);
        }

        // Re-init interactive bits on the new row
        const [{ initInlineEditing }, { initCompletion }] = await Promise.all([
            import('../inlineEditing.js'),
            import('../completion.js')
        ]);

        initInlineEditing();
        initCompletion();

        // Reapply filters/order to ensure consistent state
        const filteredClassIds = await fetchFilteredClassIds(classState, 'assignments');
        const data = await fetchFilteredAssignments(assignmentState);

        // Recompute items and reapply ordering
        let allItems = [];
        if (assignmentState.tableLayout === 'single') {
            const tbody = document.querySelector('.assignments-table-wrapper [data-table-mode="single"] tbody');
            allItems = tbody ? [...tbody.querySelectorAll('tr')] : [];

            const filteredData = {
                layout: 'single',
                assignments: data.assignments.filter(a => filteredClassIds.includes(String(a.class_id)))
            };
            const container = document.querySelector('.assignments-table-wrapper');
            applyAssignmentOrdering(container, allItems, filteredData, 'single');
        } else {
            allItems = [...document.querySelectorAll('.per-class-card')];
            const filteredData = {
                layout: 'per_class',
                classes: data.classes.filter(cls => filteredClassIds.includes(String(cls.class_id)))
            };
            const container = document.querySelector('.assignments-table-wrapper');
            applyAssignmentOrdering(container, allItems, filteredData, 'per_class');
        }

        console.log('[Assignments] Row refreshed');
    } catch (error) {
        console.error('[Assignments] Error refreshing row:', error);
    }
}
