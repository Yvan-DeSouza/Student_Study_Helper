import { getClassSelectorState } from "../core/state_classes.js";
import { fetchFilteredClassIds } from "../core/filter_classes.js";
import { applyClassOrdering } from "./apply.js";

const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    ?.getAttribute("content");

export async function initClassSelector() {
    const container = document.querySelector(".classes-grid");
    if (!container) return;

    let allItems = [...container.querySelectorAll(".class-card")];
    let personalPrefs = null;

    // -------------------------
    // APPLY PREFS → UI
    // -------------------------
    function applyPreferencesToUI(prefs) {
        document.querySelector("#sortSelect").value =
            prefs.sort_by ?? "name_asc";
        document.querySelector("#statusFilter").value =
            prefs.status_filter ?? "all";

        // ---------- IMPORTANCE ----------
        const importanceSet = new Set(
            prefs.filter_importance ?? ["high", "medium", "low", "none"]
        );

        document
            .querySelectorAll(".selector-group input[type='checkbox'][value]")
            .forEach(cb => {
                cb.checked = importanceSet.has(cb.value);
            });

        // ---------- CLASS TYPES ----------
        const noneCheckbox = document.querySelector("#class_type_none");

        // Restore "None / Unset" independently
        noneCheckbox.checked = prefs.filter_class_types === null;

        // Restore individual class type checkboxes
        const typeSet = new Set(prefs.filter_class_types ?? []);

        document
            .querySelectorAll("input[name='class_type_selector']")
            .forEach(cb => {
                if (cb.id === "class_type_none") return;

                const type = cb.id.replace("class_type_selector_", "");
                cb.checked = typeSet.has(type);
            });

    }

    // -------------------------
    // APPLY FILTERS
    // -------------------------
    async function apply() {
        const state = getClassSelectorState();
        const orderedIds = await fetchFilteredClassIds(state);
        applyClassOrdering(container, allItems, orderedIds, state.sortBy);
    }

    // -------------------------
    // SAVE PREFS (SAFE)
    // -------------------------
    async function savePrefs() {
        const state = getClassSelectorState();

        await fetch("/api/preferences/classes?page=classes", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                page_name: "classes",
                sort_by: state.sortBy,
                status_filter: state.status,
                filter_importance: state.importance,
                filter_class_types: state.classTypes
            })
        });
    }

    // -------------------------
    // LOAD PREFS
    // -------------------------
    async function loadPersonalPrefs() {
        const res = await fetch("/api/preferences/classes?page=classes");
        if (!res.ok) return;

        const prefs = await res.json();
        personalPrefs = prefs;
        applyPreferencesToUI(prefs);
        await apply();
    }

    // -------------------------
    // BUTTONS
    // -------------------------
    document
        .getElementById("applyClassFilters")
        ?.addEventListener("click", async () => {
            await apply();
            await savePrefs();
        });

    document
        .getElementById("resetSystemClassFilters")
        ?.addEventListener("click", async () => {
            applyPreferencesToUI({
                sort_by: "name_asc",
                status_filter: "all",
                filter_importance: ["high", "medium", "low", "none"],
                filter_class_types: [
                    ...document.querySelectorAll(
                        "input[name='class_type_selector']"
                    )
                ].map(cb => cb.id.replace("class_type_selector_", ""))
            });
            await apply();
            await savePrefs();
        });

    document
        .getElementById("resetPersonalClassFilters")
        ?.addEventListener("click", async () => {
            if (!personalPrefs) await loadPersonalPrefs();
            if (personalPrefs) {
                applyPreferencesToUI(personalPrefs);
                await apply();
                await savePrefs();
            }
        });

    // -------------------------
    // LIVE REFRESH
    // -------------------------
    document.addEventListener("classes:updated", async () => {
        allItems = [...container.querySelectorAll(".class-card")];
        await apply();
    });

    // -------------------------
    // INIT
    // -------------------------
    await loadPersonalPrefs();
}
