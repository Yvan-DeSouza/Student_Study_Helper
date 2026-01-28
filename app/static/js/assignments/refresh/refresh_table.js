import { getAssignmentSelectorState } from '../../selector/core/state_assignments.js';
import { getClassSelectorState } from '../../selector/core/state_classes.js';
import { fetchFilteredAssignments } from '../../selector/core/filter_assignments.js';
import { fetchFilteredClassIds } from '../../selector/core/filter_classes.js';
import { applyAssignmentOrdering } from '../../selector/assignments/apply.js';

export async function refreshAssignmentsTable(options = {}) {
    console.log("[Assignments] Refreshing table", options);
    
    try {
        // 1. Capture current state
        const assignmentState = getAssignmentSelectorState();
        const classState = getClassSelectorState();
        const currentLayout = assignmentState.tableLayout;
        
        // 2. Fetch fresh HTML from server
        const classId = options.classId;
        let html = null;

        if (classId) {
            const resp = await fetch(`/assignments/table?class_id=${classId}`);
            if (!resp.ok) throw new Error('Failed to fetch class table');
            html = await resp.text();
        } else {
            const response = await fetch('/assignments?partial=table');
            if (!response.ok) throw new Error('Failed to fetch table');
            html = await response.text();
        }
        
        // 3. Update DOM based on layout
        const container = document.querySelector('.assignments-table-wrapper');
        if (!container) return;
        
        if (currentLayout === 'single') {
            const singleCard = container.querySelector('[data-table-mode="single"]');
            if (singleCard) {
                const scrollDiv = singleCard.querySelector('.assignments-table-scroll');
                if (scrollDiv) {
                    // Replace table content but keep header bar
                    const headerBar = scrollDiv.querySelector('.table-header-bar');
                    scrollDiv.innerHTML = html;
                    if (headerBar) {
                        scrollDiv.insertBefore(headerBar, scrollDiv.firstChild);
                    }
                }
            }
        } else {
            // For per-class mode, we can either replace a single class card or rebuild all cards
            const perClassWrapper = container.querySelector('[data-table-mode="per_class"]');
            if (perClassWrapper) {
                if (classId) {
                    // HTML contains the class-specific table fragment
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    const newCard = temp.querySelector(`.per-class-card[data-class-id="${classId}"]`);
                    if (newCard) {
                        const oldCard = perClassWrapper.querySelector(`.per-class-card[data-class-id="${classId}"]`);
                        if (oldCard) {
                            oldCard.replaceWith(newCard);
                        } else {
                            perClassWrapper.appendChild(newCard);
                        }
                    }
                } else {
                    // Full rebuild
                    const perClassResponse = await fetch('/assignments');
                    const fullHTML = await perClassResponse.text();
                    
                    // Parse and extract per-class wrapper
                    const temp = document.createElement('div');
                    temp.innerHTML = fullHTML;
                    const newPerClassWrapper = temp.querySelector('[data-table-mode="per_class"]');
                    
                    if (newPerClassWrapper) {
                        perClassWrapper.innerHTML = newPerClassWrapper.innerHTML;
                    }
                }
            }
        }
        
        // 4. Re-initialize interactive elements
        const [
            { initInlineEditing },
            { initCompletion },
            { initDeleteFromTable },
            { initEditFromTable }
        ] = await Promise.all([
            import('../inlineEditing.js'),
            import('../completion.js'),
            import('../adapters/delete_from_table.js'),
            import('../adapters/edit_from_table.js')
        ]);
        
        initInlineEditing();
        initCompletion();
        initDeleteFromTable();
        initEditFromTable();
        
        // 5. Reapply filters and ordering
        const filteredClassIds = await fetchFilteredClassIds(classState, 'assignments');
        const data = await fetchFilteredAssignments(assignmentState);
        
        // Get current items
        let allItems = [];
        if (currentLayout === 'single') {
            const tbody = container.querySelector('[data-table-mode="single"] tbody');
            allItems = tbody ? [...tbody.querySelectorAll("tr")] : [];
        } else {
            allItems = [...container.querySelectorAll(".per-class-card")];
        }
        
        // Apply ordering with class filter
        if (currentLayout === 'per_class') {
            const filteredData = {
                layout: 'per_class',
                classes: data.classes.filter(cls =>
                    filteredClassIds.includes(String(cls.class_id))
                )
            };
            applyAssignmentOrdering(container, allItems, filteredData, currentLayout);
        } else {
            const filteredData = {
                layout: 'single',
                assignments: data.assignments.filter(a =>
                    filteredClassIds.includes(String(a.class_id))
                )
            };
            applyAssignmentOrdering(container, allItems, filteredData, currentLayout);
        }
        
        console.log("[Assignments] Table refreshed with state preserved");
    } catch (error) {
        console.error("[Assignments] Error refreshing table:", error);
    }
}