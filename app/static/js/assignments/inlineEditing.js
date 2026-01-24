// static/js/assignments/inlineEditing.js
import { showModal, closeModal, getPendingNavigation } from './modals.js';
import { validateInlineGrades, clearInvalidGradeHighlights, collectInlineGradedAssignments } from './utils.js';

let hasUnsavedInlineChanges = false;
let isSavingInlineChanges = false;
let finishModalState = {
    assignments: [],
    lastSelectAllDate: null
};

export function hasUnsavedChanges() {
    return hasUnsavedInlineChanges;
}

export function clearUnsavedFlag() {
    hasUnsavedInlineChanges = false;
}

export { validateInlineGrades, clearInvalidGradeHighlights };

export function initInlineEditing() {
    document.querySelectorAll(".assignments-table-card").forEach(card => {
        const editInlineBtn = card.querySelector(".table-edit-inline-btn");
        const editBtn = card.querySelector(".table-edit-btn");
        const deleteBtn = card.querySelector(".table-delete-btn");
        const saveBtn = card.querySelector(".table-save-inline-btn");
        const cancelBtn = card.querySelector(".table-cancel-inline-btn");

        const rows = card.querySelectorAll(".assignments-table tbody tr");

        if (!editInlineBtn) return;

        // Edit inline button
        editInlineBtn.addEventListener("click", () => {
            exitDeleteMode(card);
            card.dataset.editing = "false";
            editBtn?.classList.remove("active");
            rows.forEach(r => r.classList.remove("editable"));

            card.dataset.inlineEditing = "true";

            editInlineBtn.classList.add("hidden");
            editBtn.classList.add("hidden");
            deleteBtn.classList.add("hidden");

            saveBtn.classList.remove("hidden");
            cancelBtn.classList.remove("hidden");

            rows.forEach(row => {
                const isGraded = String(row.dataset.graded).toLowerCase() === "true";
                const gradeCell = row.children[5];

                row.classList.add(isGraded ? "inline-graded" : "inline-not-graded");

                if (isGraded) {
                    const currentGrade = gradeCell.innerText.trim();
                    gradeCell.innerHTML = `
                        <input
                            type="number"
                            class="inline-grade-input"
                            min="0"
                            max="100"
                            value="${currentGrade !== "—" ? currentGrade : ""}"
                        >
                    `;

                    const input = gradeCell.querySelector("input");
                    input.disabled = false;
                    input.addEventListener("input", () => {
                        hasUnsavedInlineChanges = true;
                    });
                }
            });
        });

        // Cancel button
        cancelBtn.addEventListener("click", () => {
            exitDeleteMode(card);
            card.dataset.inlineEditing = "false";

            editInlineBtn.classList.remove("hidden");
            editBtn.classList.remove("hidden");
            deleteBtn.classList.remove("hidden");

            saveBtn.classList.add("hidden");
            cancelBtn.classList.add("hidden");

            rows.forEach(row => {
                row.classList.remove("inline-graded", "inline-not-graded");

                const gradeCell = row.children[5];
                const original = row.dataset.grade || "—";
                gradeCell.innerText = original;
            });
            hasUnsavedInlineChanges = false;
        });

        // Save button
        saveBtn.addEventListener("click", () => {
            clearInvalidGradeHighlights(card);

            const isValid = validateInlineGrades(card);

            if (!isValid) {
                showModal("invalidGradeModal");
                return;
            }

            const assignments = collectInlineGradedAssignments(card);
            const missingFinishDates = assignments.filter(a => !a.finished_at);

            if (missingFinishDates.length === 0) {
                saveInlineGrades(assignments);
            } else {
                openInlineFinishDatesModal(missingFinishDates);
            }
        });

        // Delete mode (delegated to deleteAssignment.js, but keep UI toggle here)
        card.dataset.deleteMode = "false";
        deleteBtn.addEventListener("click", () => {
            const enabled = card.dataset.deleteMode === "true";

            card.dataset.editing = "false";
            card.dataset.inlineEditing = "false";

            editBtn?.classList.remove("active");
            rows.forEach(r => {
                r.classList.remove("editable", "inline-graded", "inline-not-graded");
            });

            card.dataset.deleteMode = (!enabled).toString();
            deleteBtn.classList.toggle("active", !enabled);

            rows.forEach(row => {
                row.addEventListener("mouseenter", () => {
                    if (card.dataset.deleteMode === "true") {
                        row.classList.add("delete-hover");
                    }
                });

                row.addEventListener("mouseleave", () => {
                    row.classList.remove("delete-hover");
                });
            });
        });

        // Regular edit mode
        if (!editBtn) return;

        editBtn.addEventListener("click", () => {
            exitDeleteMode(card);
            const enabled = card.dataset.editing === "true";
            card.dataset.editing = (!enabled).toString();
            editBtn.classList.toggle("active", !enabled);

            rows.forEach(row => {
                row.classList.toggle("editable", !enabled);
            });
        });
    });
}

function exitDeleteMode(card) {
    card.dataset.deleteMode = "false";
    const deleteBtn = card.querySelector(".table-delete-btn");
    deleteBtn?.classList.remove("active");
    card.querySelectorAll("tr").forEach(r => r.classList.remove("delete-hover"));
}

export async function saveInlineGrades(assignments, navUrl = null) {
    isSavingInlineChanges = true;
    const csrf = document.querySelector("meta[name='csrf-token']").content;
    const now = new Date();

    for (const a of assignments) {
        if (!a.finished_at) continue;

        if (new Date(a.finished_at) > now) {
            isSavingInlineChanges = false;
            showModal("futureFinishDateModal");
            return;
        }

        const payload = {
            grade: a.grade,
            finished_at: a.finished_at
        };

        const res = await fetch(`/assignments/${a.id}/update`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrf
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            isSavingInlineChanges = false;
            alert("Failed to save grades");
            return;
        }
    }

    hasUnsavedInlineChanges = false;
    isSavingInlineChanges = false;

    // Emit refresh event instead of reloading
    document.dispatchEvent(new CustomEvent("assignment:changed"));

    const pendingUrl = navUrl || getPendingNavigation();
    if (pendingUrl) {
        window.location.href = pendingUrl;
    }
}

export function saveAllInlineGrades(assignments, navUrl = null) {
    saveInlineGrades(assignments, navUrl);
}

export function openInlineFinishDatesModal(assignments, navUrl = null) {
    finishModalState.assignments = assignments;
    finishModalState.lastSelectAllDate = null;

    const container = document.getElementById("finishAssignmentsContainer");
    const selectAll = document.getElementById("finishSelectAll");
    const allDueOption = document.getElementById("finishAllDueOption");

    container.innerHTML = "";

    selectAll.classList.toggle("hidden", assignments.length < 2);

    allDueOption.classList.toggle(
        "hidden",
        !assignments.some(a => a.due_at)
    );

    assignments.forEach(a => {
        const section = document.createElement("div");
        section.className = "finish-assignment-section";
        section.dataset.assignmentId = a.id;

        section.innerHTML = `
        <h4>${a.title}</h4>

        <fieldset class="radio-group">
            <label>
            <input type="radio" name="finish_${a.id}" value="now">
            Now
            </label>

            <label>
            <input type="radio" name="finish_${a.id}" value="pick">
            Pick a date
            </label>

            <input
            type="datetime-local"
            class="input-field hidden assignment-picked-date"
            >

            ${
            a.due_at
                ? `
                <label>
                <input type="radio" name="finish_${a.id}" value="due">
                Due date
                </label>
                `
                : ""
            }
        </fieldset>
        `;

        container.appendChild(section);
    });

    initFinishDatesModalListeners(navUrl);
    showModal("inlineFinishDatesModal");
}

function initFinishDatesModalListeners(navUrl) {
    // Select all logic
    document.querySelectorAll("input[name='finish_all']").forEach(radio => {
        radio.addEventListener("change", e => {
            const mode = e.target.value;
            const allDateInput = document.getElementById("finishAllPickedDate");

            allDateInput.classList.toggle("hidden", mode !== "pick");

            document
                .querySelectorAll("#finishAssignmentsContainer .finish-assignment-section")
                .forEach(section => {
                    const radios = section.querySelectorAll("input[type='radio']");
                    const pickInput = section.querySelector(".assignment-picked-date");

                    radios.forEach(r => {
                        if (r.value === mode) r.checked = true;
                    });

                    pickInput.classList.toggle("hidden", mode !== "pick");

                    if (mode === "pick" && finishModalState.lastSelectAllDate) {
                        pickInput.value = finishModalState.lastSelectAllDate;
                    }
                });
        });
    });

    document
        .getElementById("finishAllPickedDate")
        .addEventListener("change", e => {
            finishModalState.lastSelectAllDate = e.target.value;

            document
                .querySelectorAll(".assignment-picked-date")
                .forEach(input => {
                    input.value = e.target.value;
                });
        });

    document.addEventListener("change", e => {
        if (!e.target.name.startsWith("finish_")) return;

        const section = e.target.closest(".finish-assignment-section");
        const pickInput = section.querySelector(".assignment-picked-date");

        pickInput.classList.toggle("hidden", e.target.value !== "pick");
    });

    document
        .getElementById("confirmInlineFinishDates")
        .addEventListener("click", () => {
            const now = new Date();
            const assignments = [];

            document
                .querySelectorAll(".finish-assignment-section")
                .forEach(section => {
                    const id = section.dataset.assignmentId;
                    const mode = section.querySelector("input[type='radio']:checked")?.value;
                    let finishedAt = null;

                    if (mode === "now") {
                        finishedAt = now.toISOString();
                    }

                    if (mode === "pick") {
                        const val = section.querySelector(".assignment-picked-date").value;
                        if (!val || new Date(val) > now) {
                            showModal("futureFinishDateModal");
                            return;
                        }
                        finishedAt = val;
                    }

                    if (mode === "due") {
                        finishedAt = finishModalState.assignments
                            .find(a => a.id == id).due_at;
                    }

                    assignments.push({
                        id,
                        finished_at: finishedAt
                    });
                });

            finishModalState.assignments.forEach(a => {
                const found = assignments.find(x => x.id == a.id);
                a.finished_at = found.finished_at;
            });

            closeModal("inlineFinishDatesModal");
            saveInlineGrades(finishModalState.assignments, navUrl);
        });
}