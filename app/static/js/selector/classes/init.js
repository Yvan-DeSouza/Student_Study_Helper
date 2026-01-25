import { getClassSelectorState } from "../core/state_classes.js";
import { fetchFilteredClassIds } from "../core/filter_classes.js";
import { applyClassOrdering } from "./apply.js";

const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    ?.getAttribute("content");

export function initClassSelector() {
    const container = document.querySelector(".classes-grid");
    if (!container) return;

    let allItems = [...container.querySelectorAll(".class-card")];
    let personalPrefs = null;

    const DEFAULT = {
        sortBy: "name_asc",
        status: "all",
        importance: { high: true, medium: true, low: true },
        classTypes: [...document.querySelectorAll(
            "input[name='class_type_selector']"
        )].map(cb => cb.id.replace("class_type_selector_", ""))
    };

    function setControlsFromState(state) {
        document.querySelector("#sortSelect").value = state.sortBy;
        document.querySelector("#statusFilter").value = state.status;

        ["high", "medium", "low"].forEach(v => {
            const cb = document.querySelector(`input[value='${v}']`);
            if (cb) cb.checked = !!state.importance[v];
        });

        document.querySelectorAll("input[name='class_type_selector']").forEach(cb => {
            const key = cb.id.replace("class_type_selector_", "");
            cb.checked = state.classTypes.includes(key);
        });
    }

    async function apply() {
        const state = getClassSelectorState();
        const orderedIds = await fetchFilteredClassIds(state);
        applyClassOrdering(container, allItems, orderedIds, state.sortBy);
    }

    async function loadPersonalPrefs() {
        const res = await fetch("/api/preferences/classes?page=classes");
        if (!res.ok) return;

        const data = await res.json();
        if (!data) return;

        personalPrefs = {
            sortBy: data.sort_by,
            status: data.status_filter,
            importance: data.filter_importance,
            classTypes: data.filter_class_types ?? []
        };

        setControlsFromState(personalPrefs);
        await apply();
    }

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
            }),
            keepalive: true
        });
    }

    document.getElementById("applyClassFilters")
        ?.addEventListener("click", apply);

    document.getElementById("resetSystemClassFilters")
        ?.addEventListener("click", async () => {
            setControlsFromState(DEFAULT);
            await apply();
        });

    document.getElementById("resetPersonalClassFilters")
        ?.addEventListener("click", async () => {
            if (!personalPrefs) await loadPersonalPrefs();
            if (personalPrefs) {
                setControlsFromState(personalPrefs);
                await apply();
            }
        });

    window.addEventListener("pagehide", savePrefs);
    window.addEventListener("beforeunload", savePrefs);

    document.addEventListener("classes:updated", async () => {
        allItems = [...container.querySelectorAll(".class-card")];
        await apply();
    });

    apply();
    loadPersonalPrefs();
}
