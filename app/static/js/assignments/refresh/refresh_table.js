
import { getAssignmentSelectorState } from '../../selector/core/state_assignments.js';
import { getClassSelectorState } from '../../selector/core/state_classes.js';
import { fetchFilteredAssignments } from '../../selector/core/filter_assignments.js';
import { fetchFilteredClassIds } from '../../selector/core/filter_classes.js';
import { fetchAssignmentColumns } from '../../columns/api/fetchColumns.js';
import { buildAssignmentTable } from '../../columns/builders/buildTable.js';

/**
 * Render empty state message
 */
function renderEmptyState(container, isFiltered) {
    container.innerHTML = "";
    
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "no-assignments-message";
    
    const cardBody = document.createElement("div");
    cardBody.className = "card-body";
    
    if (isFiltered) {
        // Filters removed all assignments
        const title = document.createElement("p");
        title.textContent = "No assignments match your filters";
        
        const hint = document.createElement("p");
        hint.textContent = "Try adjusting your filters to see more assignments";
        
        cardBody.appendChild(title);
        cardBody.appendChild(hint);
    } else {
        // No assignments at all
        const title = document.createElement("p");
        title.textContent = "You don't have any assignments yet";
        
        const hint = document.createElement("p");
        hint.textContent = "Click the '+ Add Assignment' button to create your first assignment";
        
        cardBody.appendChild(title);
        cardBody.appendChild(hint);
    }
    
    emptyDiv.appendChild(cardBody);
    container.appendChild(emptyDiv);
}

/**
 * Apply risk threshold filter to rows
 */
function filterRowsByRisk(rows, riskFilterMode, riskThreshold) {
    if (riskFilterMode === "none" || !riskThreshold) {
        return rows;
    }
    
    const threshold = parseFloat(riskThreshold);
    
    return rows.filter(row => {
        const riskValue = row.risk_score?.value;
        
        // If no risk score, exclude when filter is active
        if (riskValue === null || riskValue === undefined) {
            return false;
        }
        
        // Apply threshold
        if (riskFilterMode === "under") {
            return riskValue <= threshold;
        } else if (riskFilterMode === "over") {
            return riskValue >= threshold;
        }
        
        return true;
    });
}

export async function refreshAssignmentsTable() {
    console.log("[Assignments] Refreshing table");

    // Get current filter states
    const assignmentState = getAssignmentSelectorState();
    const classState = getClassSelectorState();

    // Fetch filtered class IDs
    const classData = await fetchFilteredClassIds(classState, 'assignments');
    const eligibleClassIds = classData.class_ids || [];
    console.log("eligibleClassIds:", eligibleClassIds);

    // Fetch filtered assignments
    const assignmentData = await fetchFilteredAssignments(assignmentState);

    let assignmentIds = [];

    if (assignmentState.tableLayout === "single") {
        // Filter assignments by eligible classes
        assignmentIds = (assignmentData.assignment_ids || []);
    } else {
        // Per-class mode: get all assignment IDs from all classes
        assignmentIds = (assignmentData.classes || []).flatMap(c => c.assignment_ids);
    }

    // Check if we have any assignments at all (before column API)
    const hasAnyAssignments = assignmentIds.length > 0;

    if (!hasAnyAssignments) {
        // No assignments match the filters
        const singleMount = document.querySelector('.assignments-table-wrapper [data-table-mode="single"] .assignments-table-mount');
        const perClassWrapper = document.querySelector('.assignments-table-wrapper [data-table-mode="per_class"]');
        
        if (singleMount) renderEmptyState(singleMount, true); // Filtered out
        if (perClassWrapper) perClassWrapper.innerHTML = "";
        return;
    }
   
    // Fetch column data
    const { columns, rows } = await fetchAssignmentColumns({
        assignmentIds,
        page: "assignments",
    });

    // Filter rows to only include those from eligible classes
    let filteredRows = rows.filter(row =>
        eligibleClassIds.includes(parseInt(row.class_id))
    );
    
    // Apply risk threshold filter (client-side)
    filteredRows = filterRowsByRisk(filteredRows, assignmentState.riskFilterMode, assignmentState.riskThreshold);
    
    console.log(`[Assignments] Building table with ${filteredRows.length} rows`);

    // Check if filters removed everything
    if (filteredRows.length === 0) {
        const singleMount = document.querySelector('.assignments-table-wrapper [data-table-mode="single"] .assignments-table-mount');
        const perClassWrapper = document.querySelector('.assignments-table-wrapper [data-table-mode="per_class"]');
        
        if (singleMount) renderEmptyState(singleMount, true); // Filtered out
        if (perClassWrapper) perClassWrapper.innerHTML = "";
        return;
    }

    if (assignmentState.tableLayout === "per_class") {
        // Per-class mode: dynamically create cards
        const wrapper = document.querySelector('.assignments-table-wrapper [data-table-mode="per_class"]');
        if (!wrapper) return;

        wrapper.innerHTML = "";

        // Group rows by class
        const rowsByClass = {};
        filteredRows.forEach(row => {
            const classId = row.class_id;
            if (!rowsByClass[classId]) {
                rowsByClass[classId] = [];
            }
            rowsByClass[classId].push(row);
        });

        // Create a card for each class (in order of eligible classes)
        for (const classId of eligibleClassIds) {
            const classRows = rowsByClass[classId];
            if (!classRows || classRows.length === 0) continue;

            // Extract class name from first row's metadata
            const className = classRows[0]._meta?.class || "Unknown Class";

            // Create card
            const card = document.createElement("div");
            card.className = "card assignments-table-card per-class-card";
            card.dataset.classId = classId;

            card.innerHTML = `
                <div class="assignments-table-scroll">
                    <div class="table-header-bar">
                        <h3 class="table-title">${className}</h3>
                        <div class="table-actions">
                            <button class="btn-tiny table-edit-inline-btn">✏ Edit Inline</button>
                            <button class="btn-tiny table-edit-btn">✏ Edit</button>
                            <button class="btn-tiny danger table-delete-btn">🗑 Delete</button>
                            <button class="btn-tiny hidden table-save-inline-btn">💾 Save</button>
                            <button class="btn-tiny hidden table-cancel-inline-btn">✖ Cancel</button>
                        </div>
                    </div>
                    <div class="assignments-table-mount"></div>
                </div>
            `;

            wrapper.appendChild(card);

            // Build table for this class
            const mount = card.querySelector('.assignments-table-mount');
            buildAssignmentTable({
                container: mount,
                columns,
                rows: classRows
            });
        }
    } else {
        // Single table mode
        const container = document.querySelector('.assignments-table-wrapper [data-table-mode="single"] .assignments-table-mount');
        if (!container) return;

        buildAssignmentTable({
            container,
            columns,
            rows: filteredRows,
        });
    }

    // Re-init interactive behaviors
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