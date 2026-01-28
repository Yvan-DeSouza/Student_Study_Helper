export function getAssignmentSelectorState(root = document) {
    // ------------------------- TABLE LAYOUT -------------------------
    const tableLayout = root.querySelector('#tableLayout')?.value ?? "single";

    // ------------------------- DUE STATUS -------------------------
    const dueStatus = root.querySelector('#dueStatusFilter')?.value ?? "all";

    // ------------------------- COMPLETION -------------------------
    const completion = root.querySelector('#completionFilter')?.value ?? "all";

    // ------------------------- GRADED -------------------------
    const graded = root.querySelector('#gradedFilter')?.value ?? "all";

    // ------------------------- CREATED -------------------------
    const created = root.querySelector('#createdFilter')?.value ?? "all";

    // ------------------------- ASSIGNMENT TYPES -------------------------
    const assignmentTypes = [...root.querySelectorAll("input[name='assignment_type_selector']")]
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // null = no filter, [] = show nothing
    const finalAssignmentTypes = assignmentTypes.length === 10 ? null : assignmentTypes;

    // ------------------------- SORT CATEGORY -------------------------
    const sortCategory = root.querySelector("input[name='sortCategory']:checked")?.value ?? "name";

    // ------------------------- SORT BY -------------------------
    const sortBy = root.querySelector('#assignmentSortBy')?.value ?? "name_asc";

    return {
        tableLayout,
        dueStatus,
        completion,
        graded,
        created,
        assignmentTypes: finalAssignmentTypes,
        sortCategory,
        sortBy
    };
}