// selector/assignments/init.js
// Assignment page orchestration

import { getAssignmentSelectorState } from "../core/state_assignments.js";
import { getClassSelectorState } from "../core/state_classes.js";
import { fetchFilteredAssignments } from "../core/filter_assignments.js";
import { fetchFilteredClassIds } from "../core/filter_classes.js";
import { applyAssignmentOrdering } from "./apply.js";

const SORT_VALUE_TO_CATEGORY = {
    // name
    name_asc: 'name',
    name_desc: 'name',

    // academic
    grade_high_low: 'academic',
    grade_low_high: 'academic',
    ponderation_high_low: 'academic',
    ponderation_low_high: 'academic',

    // dates
    due_date_soonest: 'dates',
    due_date_latest: 'dates',
    created_newest: 'dates',
    created_oldest: 'dates',

    // time
    difficulty_high_low: 'time',
    difficulty_low_high: 'time',
    estimated_minutes_high_low: 'time',
    estimated_minutes_low_high: 'time',
    study_minutes_high_low: 'time',
    study_minutes_low_high: 'time'
};

const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    ?.getAttribute("content");

export async function initAssignmentSelector() {
    const container = document.querySelector(".assignments-table-wrapper");
    if (!container) return;

    let allItems = [];
    let currentLayout = "single";
    let personalPrefs = null;

    // Get all items based on current layout
    function updateAllItems() {
        if (currentLayout === "single") {
            // Single table: get all table rows
            const tbody = container.querySelector('[data-table-mode="single"] tbody');
            allItems = tbody ? [...tbody.querySelectorAll("tr")] : [];
        } else {
            // Per-class: get all per-class cards
            allItems = [...container.querySelectorAll(".per-class-card")];
        }
    }

    // ------------------------- TABLE LAYOUT CHANGE -------------------------
    function handleLayoutChange(newLayout) {
        const singleCard = container.querySelector('[data-table-mode="single"]');
        const perClassWrapper = container.querySelector('[data-table-mode="per_class"]');
        
        if (newLayout === 'single') {
            singleCard?.classList.remove('hidden');
            perClassWrapper?.classList.add('hidden');
        } else {
            singleCard?.classList.add('hidden');
            perClassWrapper?.classList.remove('hidden');
        }
        
        currentLayout = newLayout;
        updateAllItems();
    }

    // Listen for layout changes
    document.getElementById("tableLayout")?.addEventListener("change", async (e) => {
        handleLayoutChange(e.target.value);
        await apply();
    });

    // ------------------------- APPLY PREFS → UI -------------------------
    function applyPreferencesToUI(classPrefs, assignmentPrefs) {
        // Apply class preferences
        if (classPrefs) {
            document.querySelector("#classSortBy").value =
                classPrefs.sort_by ?? "name_asc";
            document.querySelector("#classStatusFilter").value =
                classPrefs.status_filter ?? "all";

            // Importance
            const importanceSet = new Set(
                classPrefs.filter_importance ?? ["high", "medium", "low", "none"]
            );
            document
                .querySelectorAll("input[name='importance_check'][value]")
                .forEach(cb => {
                    cb.checked = importanceSet.has(cb.value);
                });

            // Class types
            const noneCheckbox = document.querySelector("#class_type_none");
            if (noneCheckbox) {
                noneCheckbox.checked = classPrefs.filter_class_types === null;
            }

            const typeSet = new Set(classPrefs.filter_class_types ?? []);
            document
                .querySelectorAll("input[name='class_type_selector']")
                .forEach(cb => {
                    if (cb.id === "class_type_none") return;
                    const type = cb.id.replace("class_type_selector_", "");
                    cb.checked = typeSet.has(type);
                });
        }

        // Apply assignment preferences
        if (assignmentPrefs) {
            const tableLayoutSelect = document.querySelector("#tableLayout");
            if (tableLayoutSelect) {
                tableLayoutSelect.value = assignmentPrefs.table_layout ?? "single";
            }
            
            document.querySelector("#dueStatusFilter").value =
                assignmentPrefs.due_status_filter ?? "all";
            document.querySelector("#completionFilter").value =
                assignmentPrefs.completion_filter ?? "all";
            document.querySelector("#gradedFilter").value =
                assignmentPrefs.graded_filter ?? "all";
            document.querySelector("#createdFilter").value =
                assignmentPrefs.created_filter ?? "all";

            // Assignment types
            const assignmentTypes = assignmentPrefs.filter_assignment_types ?? [];
            const typeSet = new Set(Array.isArray(assignmentTypes) ? assignmentTypes : []);
            
            document
                .querySelectorAll("input[name='assignment_type_selector']")
                .forEach(cb => {
                    // If no specific types saved, check all
                    cb.checked = typeSet.size === 0 || typeSet.has(cb.value);
                });

            // Sort category and sort by
            if (assignmentPrefs.sort_by) {
                const sortBy = assignmentPrefs.sort_by;
                const category = SORT_VALUE_TO_CATEGORY[sortBy] ?? 'name';

                const categoryRadio = document.querySelector(`input[name='sortCategory'][value='${category}']`);
                if (categoryRadio) {
                    categoryRadio.checked = true;
                    
                    // Update visible options
                    document.querySelectorAll("#assignmentSortBy option").forEach(opt => {
                        opt.hidden = opt.dataset.cat !== category;
                    });
                }
                
                document.querySelector("#assignmentSortBy").value = sortBy;
            }

            // Update layout after setting preferences
            handleLayoutChange(assignmentPrefs.table_layout ?? "single");
        }
    }

    // ------------------------- APPLY FILTERS -------------------------
    async function apply() {
        const assignmentState = getAssignmentSelectorState();
        const classState = getClassSelectorState();

        // Get filtered class IDs (for per-class mode filtering)
        const filteredClassIds = await fetchFilteredClassIds(classState, 'assignments');
        
        // Fetch filtered assignments
        const data = await fetchFilteredAssignments(assignmentState);

        if (assignmentState.tableLayout === 'per_class') {
            // For per-class layout, filter out classes that don't match class filters
            const filteredData = {
                layout: 'per_class',
                classes: data.classes.filter(cls => 
                    filteredClassIds.includes(String(cls.class_id))
                )
            };
            
            applyAssignmentOrdering(container, allItems, filteredData, assignmentState.tableLayout);
        } else {
            // For single layout, filter assignments to only those in filtered classes
            const filteredData = {
                layout: 'single',
                assignments: data.assignments.filter(a =>
                    filteredClassIds.includes(String(a.class_id))
                )
            };
            
            applyAssignmentOrdering(container, allItems, filteredData, assignmentState.tableLayout);
        }
    }

    // ------------------------- SAVE PREFS (SAFE) -------------------------
    async function savePrefs() {
        const assignmentState = getAssignmentSelectorState();
        const classState = getClassSelectorState();

        // Save class preferences
        await fetch("/api/preferences/classes?page=assignments", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                page_name: "assignments",
                sort_by: classState.sortBy,
                status_filter: classState.status,
                filter_importance: classState.importance,
                filter_class_types: classState.classTypes
            })
        });

        // Save assignment preferences
        await fetch("/api/preferences/assignments", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                table_layout: assignmentState.tableLayout,
                due_status_filter: assignmentState.dueStatus,
                completion_filter: assignmentState.completion,
                graded_filter: assignmentState.graded,
                created_filter: assignmentState.created,
                filter_assignment_types: assignmentState.assignmentTypes,
                sort_by: assignmentState.sortBy
            })
        });
    }

    // ------------------------- LOAD PREFS -------------------------
    async function loadPersonalPrefs() {
        // Load class preferences
        const classRes = await fetch("/api/preferences/classes?page=assignments");
        let classPrefs = null;
        if (classRes.ok) {
            classPrefs = await classRes.json();
        }

        // Load assignment preferences
        const assignmentRes = await fetch("/api/preferences/assignments");
        let assignmentPrefs = null;
        if (assignmentRes.ok) {
            assignmentPrefs = await assignmentRes.json();
        }

        personalPrefs = { classPrefs, assignmentPrefs };
        applyPreferencesToUI(classPrefs, assignmentPrefs);
        await apply();
    }

    // ------------------------- BUTTONS -------------------------
    document
        .getElementById("applyClassFilters")
        ?.addEventListener("click", async () => {
            await apply();
            await savePrefs();
        });

    document
        .getElementById("applyAssignmentFilters")
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
                    "math", "science", "language", "social_science",
                    "art", "engineering", "technology", "finance", "other"
                ]
            }, personalPrefs?.assignmentPrefs);
            await apply();
            await savePrefs();
        });

    document
        .getElementById("resetPersonalClassFilters")
        ?.addEventListener("click", async () => {
            if (!personalPrefs) await loadPersonalPrefs();
            if (personalPrefs?.classPrefs) {
                applyPreferencesToUI(personalPrefs.classPrefs, personalPrefs.assignmentPrefs);
                await apply();
                await savePrefs();
            }
        });

    document
        .getElementById("resetSystemAssignmentFilters")
        ?.addEventListener("click", async () => {
            applyPreferencesToUI(personalPrefs?.classPrefs, {
                table_layout: "single",
                due_status_filter: "all",
                completion_filter: "all",
                graded_filter: "all",
                created_filter: "all",
                filter_assignment_types: [],
                sort_by: "name_asc"
            });
            await apply();
            await savePrefs();
        });

    document
        .getElementById("resetPersonalAssignmentFilters")
        ?.addEventListener("click", async () => {
            if (!personalPrefs) await loadPersonalPrefs();
            if (personalPrefs?.assignmentPrefs) {
                applyPreferencesToUI(personalPrefs.classPrefs, personalPrefs.assignmentPrefs);
                await apply();
                await savePrefs();
            }
        });

    // ------------------------- SORT CATEGORY CHANGE -------------------------
    document.querySelectorAll("input[name='sortCategory']").forEach(radio => {
        radio.addEventListener("change", () => {
            const category = radio.value;
            
            // Update sort options visibility based on category
            document.querySelectorAll("#assignmentSortBy option").forEach(opt => {
                opt.hidden = opt.dataset.cat !== category;
            });

            // Select first visible option
            const firstVisible = [...document.querySelectorAll("#assignmentSortBy option")]
                .find(o => !o.hidden);
            if (firstVisible) {
                document.querySelector("#assignmentSortBy").value = firstVisible.value;
            }
        });
    });

    // ------------------------- LIVE REFRESH -------------------------
    document.addEventListener("assignment:changed", async () => {
        updateAllItems();
        await apply();
    });

    document.addEventListener("assignment:grade:changed", async () => {
        updateAllItems();
        await apply();
    });

    document.addEventListener("assignment:completion:changed", async () => {
        updateAllItems();
        await apply();
    });

    // ------------------------- INIT -------------------------
    // Initialize current layout from DOM
    const initialLayout = document.querySelector("#tableLayout")?.value ?? "single";
    handleLayoutChange(initialLayout);
    
    await loadPersonalPrefs();
}