export function getClassSelectorState(root = document) {
    // -------------------------
    // SORT & STATUS
    // -------------------------
    const sortBy = root.querySelector("#sortSelect")?.value ?? root.querySelector("#classSortBy")?.value ?? "name_asc";
    const status = root.querySelector("#statusFilter")?.value ?? root.querySelector("#classStatusFilter")?.value ?? "all";

    // -------------------------
    // IMPORTANCE
    // -------------------------
    const importance = [...root.querySelectorAll(
        "input[name='importance_check'][value]"
    )]
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // null = no filter, [] = show nothing
    const finalImportance = importance.length === 4 ? null : importance;

    // -------------------------
    // CLASS TYPES
    // -------------------------
    const noneChecked =
        root.querySelector("#class_type_none")?.checked ?? false;

    const checkedTypes = [...root.querySelectorAll(
        "input[name='class_type_selector']:checked"
    )]
        .filter(cb => cb.id !== "class_type_none")
        .map(cb => cb.id.replace("class_type_selector_", ""));

    // If "None / Unset" is checked → disable filtering
    // Otherwise filter by selected types
    const classTypes = noneChecked
        ? null
        : checkedTypes.length === 0
            ? []
            : checkedTypes;


    console.log({
        sortBy,
        status,
        importance: finalImportance,
        classTypes
    })
    return {
        sortBy,
        status,
        importance: finalImportance,
        classTypes
    };
}
