import { getClassSelectorState } from "./selector_state.js";
import { filterAndSortClasses } from "./selector_filter.js";
import { applyVisibilityAndOrder } from "./selector_apply.js";

export function initClassSelector() {
    const applyBtn = document.getElementById("applyClassFilters");
    const resetBtn = document.getElementById("resetClassFilters");
    const container = document.querySelector(".classes-grid");

    if (!container) return;

    const allItems = [...container.querySelectorAll(".class-card")];

    // capture initial control state so Reset can restore it
    const initialState = getClassSelectorState();

    const apply = () => {
        const state = getClassSelectorState();
        const filteredAndSorted = filterAndSortClasses(allItems, state);

        applyVisibilityAndOrder(
            container,
            allItems,
            filteredAndSorted,
            state.sortBy
        );
    };

    const reset = () => {
        // Restore selects
        const sortSelect = document.querySelector('#sortSelect');
        const statusSelect = document.querySelector('#statusFilter');
        if (sortSelect) sortSelect.value = initialState.sortBy ?? '';
        if (statusSelect) statusSelect.value = initialState.status ?? 'all';

        // Restore importance checkboxes
        ['high', 'medium', 'low'].forEach(v => {
            const cb = document.querySelector(`.selector-checks input[value='${v}']`);
            if (cb) cb.checked = !!initialState.importance[v];
        });

        // Restore class type checkboxes
        document.querySelectorAll("input[name='class_type_selector']").forEach(cb => {
            const idSuffix = cb.id.replace('class_type_selector_', '');
            cb.checked = initialState.classTypes.includes(idSuffix);
        });

        // Do NOT auto-apply; wait for the user to click Apply
    };

    // initial application (show current state)
    apply();

    // Apply button only applies filters
    applyBtn?.addEventListener("click", apply);

    // Reset button restores controls to initial state but does NOT apply until user clicks Apply
    resetBtn?.addEventListener('click', reset);

    // NOTE: no automatic application on control change — user must click Apply to apply filters

}
