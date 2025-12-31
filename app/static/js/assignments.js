document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("tr[data-completed]").forEach(row => {
        const raw = row.dataset.completed;
        row.dataset.completed =
            raw === "true" || raw === "True" || raw === "1"
                ? "true"
                : "false";
    });

    
    function showModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;

        // Remove top status from all modals
        document.querySelectorAll(".modal-overlay")
            .forEach(m => m.classList.remove("modal-top"));

        // Bring this modal to front
        modal.classList.add("modal-top");

        modal.classList.remove("hidden");
        modal.classList.add("visible");
    }


    function closeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove("visible");
        modal.classList.add("hidden");
    }

    // Edit modal elements
    const editModal = document.getElementById("editAssignmentModal");
    const editForm = document.getElementById("editAssignmentForm");
    const editId = document.getElementById("edit-assignment-id");
    const editTitle = document.getElementById("edit-title");
    const editClass = document.getElementById("edit-class");

    const editType = document.getElementById("edit-type");
    const editDueAt = document.getElementById("edit-due-at");
    const editFinishedAt = document.getElementById("edit-finished-at");
    const editIsGraded = document.getElementById("edit-is-graded");
    const editExpectedGrade = document.getElementById("edit-expected-grade");
    const editPassGrade = document.getElementById("edit-pass-grade");
    const editPonderation = document.getElementById("edit-ponderation");
    const editDifficulty = document.getElementById("edit-difficulty");
    const editEstimatedMinutes = document.getElementById("edit-estimated-minutes");
    const editGradedOnly = document.getElementById("edit-graded-only");

    const modeSelect = document.getElementById("tableMode");
    function clearInvalidGradeHighlights(card) {
        card.querySelectorAll(".inline-grade-input.invalid")
            .forEach(input => input.classList.remove("invalid"));
    }

    function validateInlineGrades(card) {
        let hasInvalid = false;

        card.querySelectorAll(".inline-grade-input").forEach(input => {
            const raw = input.value.trim();

            // Allow empty (null)
            if (raw === "") return;

            const num = Number(raw);

            const isValid =
                Number.isFinite(num) &&
                num >= 0 &&
                num <= 100;

            if (!isValid) {
                input.classList.add("invalid");
                hasInvalid = true;
            }
        });

        return !hasInvalid;
    }





    let pendingRow = null;
    let pendingCheckbox = null;
    document.querySelectorAll(".completion-checkbox").forEach(cb => {
        cb.addEventListener("change", e => {
            e.stopPropagation()
            e.preventDefault();

            pendingCheckbox = cb;
            pendingRow = cb.closest("tr");

            const title = pendingRow.dataset.title;
            const dueAt = pendingRow.dataset.dueAt;

            const wasCompleted = pendingRow.dataset.completed === "true";
            const wantsCompleted = cb.checked;

            // Always revert until confirmed
            cb.checked = wasCompleted;

            if (wantsCompleted && !wasCompleted) {
                // user is marking as completed
                openCompleteModal(title, dueAt);
            } else if (!wantsCompleted && wasCompleted) {
                // user is uncompleting
                openUncompleteModal(title);
            }

        });
    });
    function openUncompleteModal(title) {
        document.getElementById("uncompleteMessage").innerText =
            `Are you sure you want to mark "${title}" as uncompleted? This will remove the finish date.`;

        showModal("uncompleteConfirmModal");
    }

    document.getElementById("confirmUncomplete").addEventListener("click", async () => {
        if (!pendingCheckbox || !pendingRow) return;

        await sendCompletionUpdate(false, null);

        // Update the UI manually
        pendingCheckbox.checked = false;
        pendingRow.dataset.completed = "false";

        closeModal("uncompleteConfirmModal");
        pendingRow = null;
        pendingCheckbox = null;
    });

    function openCompleteModal(title, dueAt) {
        document.getElementById("completeMessage").innerText =
            `You have marked "${title}" as completed. Please indicate the date/time of completion.`;

        const dueOption = document.getElementById("dueDateOption");
        dueOption.classList.toggle("hidden", !dueAt);

        showModal("completeAssignmentModal");
    }


    document.querySelectorAll("input[name='completion_time']").forEach(radio => {
        radio.addEventListener("change", e => {
            document
                .getElementById("pickedCompletionDate")
                .classList.toggle("hidden", e.target.value !== "pick");
        });
    });
 

    document.querySelectorAll(".assignments-table-card").forEach(card => {
        const editInlineBtn = card.querySelector(".table-edit-inline-btn");
        const editBtn = card.querySelector(".table-edit-btn");
        const deleteBtn = card.querySelector(".table-delete-btn");
        const saveBtn = card.querySelector(".table-save-inline-btn");
        const cancelBtn = card.querySelector(".table-cancel-inline-btn");

        const rows = card.querySelectorAll(".assignments-table tbody tr");

        if (!editInlineBtn) return;

        editInlineBtn.addEventListener("click", () => {
            // Exit normal edit mode if active
            card.dataset.editing = "false";
            editBtn?.classList.remove("active");
            rows.forEach(r => r.classList.remove("editable"));

            // Enter inline edit mode
            card.dataset.inlineEditing = "true";

            // Button swap
            editInlineBtn.classList.add("hidden");
            editBtn.classList.add("hidden");
            deleteBtn.classList.add("hidden");

            saveBtn.classList.remove("hidden");
            cancelBtn.classList.remove("hidden");

            rows.forEach(row => {
                if (!("graded" in row.dataset)) {
                    console.warn("Row missing data-graded attribute", row);
                }

                const isGraded = String(row.dataset.graded).toLowerCase() === "true";
                const gradeCell = row.children[5]; // Grade column index

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
                }

            });
        });

    // Cancel button (visual reset only for now)
    cancelBtn.addEventListener("click", () => {
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
    });

    function collectInlineGradedAssignments(card) {
        const assignments = [];

        card.querySelectorAll("tbody tr").forEach(row => {
            const input = row.querySelector(".inline-grade-input");
            if (!input) return;

            const value = input.value.trim();
            if (value === "") return;

            assignments.push({
                id: row.dataset.assignmentId,
                title: row.dataset.title,
                due_at: row.dataset.dueAt !== "null" ? row.dataset.dueAt : null,
                grade: Number(value),
                finished_at: row.dataset.finishedAt || null
            });
        });

        return assignments;
    }




    saveBtn.addEventListener("click", () => {
        // Remove old highlights first
        clearInvalidGradeHighlights(card);

        const isValid = validateInlineGrades(card);

        if (!isValid) {
            showModal("invalidGradeModal");
            return; // HARD STOP — nothing saved
        }

        // TEMP: fake assignments to show modal
        const assignments = collectInlineGradedAssignments(card);

        // All already have finish dates → save immediately
        const missingFinishDates = assignments.filter(a => !a.finished_at);

        if (missingFinishDates.length === 0) {
            saveInlineGrades(assignments);
        } else {
            openInlineFinishDatesModal(missingFinishDates);
        }

    });




});




    async function sendCompletionUpdate(isCompleted, finishedAt) {
        const id = pendingRow.dataset.assignmentId;

        const res = await fetch(`/assignments/${id}/completion`, {
            method: "PATCH",
            headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector("meta[name='csrf-token']").content
            },
            body: JSON.stringify({
            is_completed: isCompleted,
            finished_at: finishedAt
            })
        });

        if (!res.ok) {
            alert("Failed to update completion status");
            return;
        }

        pendingRow.dataset.completed = isCompleted.toString();
        pendingCheckbox.checked = isCompleted;
    }



    document.getElementById("confirmComplete").addEventListener("click", async () => {
        const mode = document.querySelector("input[name='completion_time']:checked").value;
        const now = new Date();
        let finishedAt = null;

        if (mode === "now") {
            finishedAt = now.toISOString();
        }

        if (mode === "pick") {
            const val = document.getElementById("pickedCompletionDate").value;
            if (!val || new Date(val) > now) {
            showModal("futureFinishDateModal");
            return;
            }
            finishedAt = val;
        }

        if (mode === "due") {
            finishedAt = pendingRow.dataset.dueAt;
        }

        await sendCompletionUpdate(true, finishedAt);
        closeModal("completeAssignmentModal");
        pendingCheckbox.checked = true;
        pendingRow.dataset.completed = "true";
    });




    // Populate edit-type
    const ASSIGNMENT_TYPES = [
        "homework",
        "project",
        "quiz",
        "essay",
        "test",
        "exam",
        "lab_report",
        "other"
    ];

    editType.innerHTML = "";
    ASSIGNMENT_TYPES.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
        editType.appendChild(option);
    });

    // Populate edit-class (reuse Add Assignment modal options)
    editClass.innerHTML = "";
    document.querySelectorAll("#assignment-class option").forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.textContent;
        editClass.appendChild(option);
    });


    document.querySelectorAll(".assignments-table-card").forEach(card => {
        const editBtn = card.querySelector(".table-edit-btn");
        const rows = card.querySelectorAll(".assignments-table tbody tr");

        if (!editBtn) return;

        editBtn.addEventListener("click", () => {
            const enabled = card.dataset.editing === "true";
            card.dataset.editing = (!enabled).toString();
            editBtn.classList.toggle("active", !enabled);

            rows.forEach(row => {
                row.classList.toggle("editable", !enabled);
            });
        });

        rows.forEach(row => {
            row.addEventListener("click", e => {
                if (card.dataset.editing !== "true") return;
                if (e.target.closest("input, select, button, label")) return;
                openEditModal(row);
            });
        });
    });



    if (modeSelect) {
        modeSelect.addEventListener("change", () => {
            document
                .querySelectorAll("[data-table-mode]")
                .forEach(el => el.classList.add("hidden"));

            const target = document.querySelector(
                `[data-table-mode="${modeSelect.value}"]`
            );
            if (target) target.classList.remove("hidden");
        });
    }



    function toggleGradedFields(enabled) {
        editGradedOnly.classList.toggle("hidden", !enabled);
    }

    // Attach only to graded checkbox
    editIsGraded.addEventListener("change", e => toggleGradedFields(e.target.checked));


    document.getElementById("edit-is-graded")
        .addEventListener("change", e => toggleGradedFields(e.target.checked));







    function openEditModal(row) {
        document.getElementById("edit-assignment-id").value = row.dataset.assignmentId;
        document.getElementById("edit-title").value = row.children[0].innerText;
        document.getElementById("edit-class").value = row.dataset.classId;
        document.getElementById("edit-type").value = row.dataset.assignmentType;
        document.getElementById("edit-due-at").value = row.dataset.dueAt !== "null" ? row.dataset.dueAt : "";
        document.getElementById("edit-finished-at").value = row.dataset.finishedAt || "";
        const isGraded = String(row.dataset.graded).toLowerCase() === "true";
        editIsGraded.checked = isGraded;
        toggleGradedFields(isGraded);


        document.getElementById("edit-expected-grade").value = row.dataset.expectedGrade || "";
        document.getElementById("edit-pass-grade").value = row.dataset.passGrade || "";
        document.getElementById("edit-ponderation").value = row.dataset.ponderation || "";
        document.getElementById("edit-difficulty").value = row.dataset.difficulty || "";
        document.getElementById("edit-estimated-minutes").value = row.dataset.estimatedMinutes || "";

        editModal.classList.add("visible");
    }



   document.addEventListener("click", e => {
        const btn = e.target.closest("[data-close-modal]");
        if (!btn) return;

        const modal = btn.closest(".modal-overlay");
        if (!modal) return;

        modal.classList.remove("visible");
        modal.classList.add("hidden");
    });



    // Submit edit form
    editForm.addEventListener("submit", async e => {
        e.preventDefault();

        const finishedAtVal = editFinishedAt.value;
        if (finishedAtVal) {
            const finishedDate = new Date(finishedAtVal);
            const now = new Date();

            if (finishedDate > now) {
                const modal = document.getElementById("futureFinishDateModal");

                modal.classList.remove("hidden");
                modal.classList.add("visible");
                

                return; // stop form submission
            }
        }
        document
            .querySelector("#futureFinishDateModal [data-close-modal]")
            .addEventListener("click", () => {
                document.getElementById("edit-finished-at").focus();
            });





        const assignmentId = editId.value;
        const payload = {
            title: editTitle.value,
            assignment_type: editType.value,
            due_at: editDueAt.value || null,
            finished_at: editFinishedAt.value || null,
            is_graded: editIsGraded.checked,
            class_id: editClass.value,
            expected_grade: editIsGraded.checked ? editExpectedGrade.value || null : null,
            pass_grade: editIsGraded.checked ? editPassGrade.value || null : null,
            ponderation: editIsGraded.checked ? editPonderation.value || null : null,
            difficulty: editDifficulty.value || null,
            estimated_minutes: editEstimatedMinutes.value || null
        };

        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        const res = await fetch(`/assignments/${assignmentId}/update`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            alert(errData.error || "Invalid data");
            return;
        }

        location.reload();
    });


    let finishModalState = {
        assignments: [], // populated dynamically
        lastSelectAllDate: null
    };

    function openInlineFinishDatesModal(assignments) {
        finishModalState.assignments = assignments;
        finishModalState.lastSelectAllDate = null;

        const container = document.getElementById("finishAssignmentsContainer");
        const selectAll = document.getElementById("finishSelectAll");
        const allDueOption = document.getElementById("finishAllDueOption");

        container.innerHTML = "";

        // Show Select All only if >= 2 assignments
        selectAll.classList.toggle("hidden", assignments.length < 2);

        // Show due-date option only if at least one assignment has due_at
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

        showModal("inlineFinishDatesModal");
    }


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



    async function saveInlineGrades(assignments) {
        const csrf = document.querySelector("meta[name='csrf-token']").content;
        const now = new Date();

        for (const a of assignments) {
            if (!a.finished_at) continue;

            if (new Date(a.finished_at) > now) {
                showModal("futureFinishDateModal");
                return;
            }

            const formData = new FormData();
            formData.append("grade", a.grade);
            formData.append("finished_at", a.finished_at);

            const res = await fetch(`/assignments/${a.id}/grade`, {
                method: "PATCH",
                headers: { "X-CSRFToken": csrf },
                body: formData
            });

            if (!res.ok) {
                alert("Failed to save grades");
                return;
            }
        }

        location.reload();
    }


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

        // Merge finish dates back into original data
        finishModalState.assignments.forEach(a => {
            const found = assignments.find(x => x.id == a.id);
            a.finished_at = found.finished_at;
        });

        closeModal("inlineFinishDatesModal");
        saveInlineGrades(finishModalState.assignments);
    });




});
