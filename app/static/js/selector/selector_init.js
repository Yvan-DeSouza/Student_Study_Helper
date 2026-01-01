import { getClassSelectorState } from "./selector_state.js";
import { filterAndSortClasses } from "./selector_filter.js";
import { applyVisibilityAndOrder } from "./selector_apply.js";

const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");
export function initClassSelector() {
    const applyBtn = document.getElementById("applyClassFilters");
    const resetBtn = document.getElementById("resetClassFilters");
    const container = document.querySelector(".classes-grid");

    if (!container) return;

    const allItems = [...container.querySelectorAll(".class-card")];

    // capture initial control state so Reset can restore it
    let personalPrefs = null;

    const DEFAULT = {
        sortBy: 'name_asc',
        status: 'all',
        importance: { high: true, medium: true, low: true },
        classTypes: [...document.querySelectorAll("input[name='class_type_selector']")].map(cb => cb.id.replace('class_type_selector_', ''))
    };

    function setControlsFromState(state) {
        const sortSelect = document.querySelector('#sortSelect');
        const statusSelect = document.querySelector('#statusFilter');
        if (sortSelect) sortSelect.value = state.sortBy ?? DEFAULT.sortBy;
        if (statusSelect) statusSelect.value = state.status ?? DEFAULT.status;

        ['high', 'medium', 'low'].forEach(v => {
            const cb = document.querySelector(`.selector-checks input[value='${v}']`);
            if (cb) cb.checked = !!(state.importance && state.importance[v]);
        });

        document.querySelectorAll("input[name='class_type_selector']").forEach(cb => {
            const idSuffix = cb.id.replace('class_type_selector_', '');
            cb.checked = (state.classTypes || DEFAULT.classTypes).includes(idSuffix);
        });
    }

    async function loadPersonalPrefs() {
        try {
            const res = await fetch('/api/preferences/classes');
            if (!res.ok) return;
            const data = await res.json();
            if (data) {
                personalPrefs = {
                    sortBy: data.sort_by,
                    status: data.status_filter,
                    importance: data.filter_importance,
                    classTypes: data.filter_class_types || []
                };
                setControlsFromState(personalPrefs);
                // apply immediately on page load
                apply();
            }
        } catch (e) {
            console.error('Failed to load class preferences', e);
        }
    }

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
        // Restore selects to page initial state (system defaults captured at load time)
        setControlsFromState(DEFAULT);
        // Do NOT auto-apply; wait for the user to click Apply
    };

    // initial application (show current state)
    apply();

    // load personal preferences (if any)
    loadPersonalPrefs();

    // Apply button only applies filters
    applyBtn?.addEventListener("click", apply);

    // Reset System filters: set to defaults and apply immediately
    document.getElementById('resetSystemClassFilters')?.addEventListener('click', () => {
        setControlsFromState(DEFAULT);
        apply();
    });

    // Reset Personal filters: restore from DB (if available) and apply immediately
    document.getElementById('resetPersonalClassFilters')?.addEventListener('click', async () => {
        if (!personalPrefs) {
            // try loading again
            await loadPersonalPrefs();
        }
        if (personalPrefs) {
            setControlsFromState(personalPrefs);
            apply();
        }
    });

    // Save preferences on pagehide / beforeunload (keepalive)
    const saveClassPrefs = async () => {
        const state = getClassSelectorState();
        const payload = {
            sort_by: state.sortBy,
            status_filter: state.status,
            filter_importance: state.importance,
            filter_class_types: state.classTypes
        };
        try {
            await fetch('/api/preferences/classes', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                 },
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch (e) {
            console.error('Failed to save class prefs', e);
        }
    };

    window.addEventListener('pagehide', saveClassPrefs);
    window.addEventListener('beforeunload', saveClassPrefs);

    // NOTE: no automatic application on control change — user must click Apply to apply filters

}
