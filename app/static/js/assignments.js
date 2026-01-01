document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("tr[data-completed]").forEach(row => {
        const raw = row.dataset.completed;
        row.dataset.completed =
            raw === "true" || raw === "True" || raw === "1"
                ? "true"
                : "false";
    });

    window.addEventListener("beforeunload", e => {
        if (!hasUnsavedInlineChanges || isSavingInlineChanges) return;

        e.preventDefault();
        e.returnValue = ""; 
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
    let hasUnsavedInlineChanges = false;
    let isSavingInlineChanges = false;
    let pendingNavigationUrl = null;

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
            exitDeleteMode();
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
                    input.addEventListener("input", () => {
                        hasUnsavedInlineChanges = true;
                    });

                }

            });
        });

        // Cancel button (visual reset only for now)
        cancelBtn.addEventListener("click", () => {
            exitDeleteMode();
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

            const assignments = collectInlineGradedAssignments(card);

            // All already have finish dates → save immediately
            const missingFinishDates = assignments.filter(a => !a.finished_at);

            if (missingFinishDates.length === 0) {
                saveInlineGrades(assignments);
            } else {
                openInlineFinishDatesModal(missingFinishDates);
            }

        });

        // Delete mode toggle
        card.dataset.deleteMode = "false";
        // Helper: exit delete mode
        function exitDeleteMode() {
            card.dataset.deleteMode = "false";
            deleteBtn.classList.remove("active");
            rows.forEach(r => r.classList.remove("delete-hover"));
        }
        deleteBtn.addEventListener("click", () => {
            const enabled = card.dataset.deleteMode === "true";

            // Always exit other modes
            card.dataset.editing = "false";
            card.dataset.inlineEditing = "false";

            editBtn?.classList.remove("active");
            rows.forEach(r => {
                r.classList.remove("editable", "inline-graded", "inline-not-graded");
            });

            // Toggle delete mode
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

                row.addEventListener("click", e => {
                    if (card.dataset.deleteMode !== "true") return;

                    // Prevent edit / checkbox / inline actions
                    e.stopPropagation();
                    e.preventDefault();

                    // (Later → open delete modal)
                    openDeleteAssignmentModal(row);
                });
            });

        });



        if (!editBtn) return;

        editBtn.addEventListener("click", () => {
            exitDeleteMode();
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


    function collectAllInlineAssignments() {
        const assignments = [];

        document.querySelectorAll(".assignments-table-card").forEach(card => {
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
        });

        return assignments;
    }




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

        // ✅ Update completion state
        pendingRow.dataset.completed = isCompleted.toString();
        pendingCheckbox.checked = isCompleted;

        // ✅ Update finished_at in dataset
        pendingRow.dataset.finishedAt = finishedAt || "";

        // ✅ Update table cell immediately
        const finishedAtCell = pendingRow.children[9];
        finishedAtCell.innerText = finishedAt
            ? new Date(finishedAt).toISOString().split("T")[0]
            : "—";
    }

    // Will be called to populate delete modal for a specific assignment.
    async function populateDeleteModal(assignmentId) {
        try {
            const res = await fetch(`/assignments/${assignmentId}/summary`);
            if (!res.ok) {
                throw new Error("Failed to fetch assignment summary");
            }

            const data = await res.json();

            // Assuming your modal has elements with these IDs to show the info
            document.getElementById("deleteAssignmentTitle").innerText = `Assignment ID: ${data.assignment_id}`;
            document.getElementById("deleteSessionCount").innerText = data.study_session_count;
            document.getElementById("deleteSessionMinutes").innerText = data.study_minutes;

        } catch (err) {
            console.error(err);
            // Optional: show error in modal
            document.getElementById("deleteSessionCount").innerText = "—";
            document.getElementById("deleteSessionMinutes").innerText = "—";
        }
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
        pendingRow = null;
        pendingCheckbox = null;
    });




    // Populate edit-type
    const assignment_types = [
        "homework",
        "project",
        "quiz",
        "writing",
        "test",
        "exam",
        "lab_report",
        "presentation",
        "reading",
        "other"
    ];

    editType.innerHTML = "";
    assignment_types.forEach(type => {
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
                isSavingInlineChanges = false;
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
                isSavingInlineChanges = false;
                alert("Failed to save grades");
                return;
            }
        }

        hasUnsavedInlineChanges = false;

        if (pendingNavigationUrl) {
            const url = pendingNavigationUrl;
            pendingNavigationUrl = null;
            window.location.href = url;
        } else {
            location.reload();
        }


    }


    document
    .getElementById("confirmInlineFinishDates")
    .addEventListener("click", () => {
        isSavingInlineChanges = true;
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
        if (pendingNavigationUrl) {
            const url = pendingNavigationUrl;
            pendingNavigationUrl = null;
            window.location.href = url;
        }

    });

// ================= UNSAVED CHANGES MODAL =================

document.getElementById("stayOnPage")
    .addEventListener("click", () => {
        closeModal("unsavedChangesModal");
        pendingNavigationUrl = null;
    });

document.getElementById("leaveWithoutSaving")
    .addEventListener("click", () => {
        hasUnsavedInlineChanges = false;
        closeModal("unsavedChangesModal");

        if (pendingNavigationUrl) {
            window.location.href = pendingNavigationUrl;
        }
    });

    document.getElementById("saveAllInline")
        .addEventListener("click", () => {
            isSavingInlineChanges = true;

            document
                .querySelectorAll(".assignments-table-card")
                .forEach(clearInvalidGradeHighlights);

            let valid = true;
            document
                .querySelectorAll(".assignments-table-card")
                .forEach(card => {
                    if (!validateInlineGrades(card)) valid = false;
                });

            if (!valid) {
                closeModal("unsavedChangesModal");
                showModal("invalidGradeModal");
                return;
            }

            const assignments = collectAllInlineAssignments();
            const missingFinishDates = assignments.filter(a => !a.finished_at);

            closeModal("unsavedChangesModal");

            if (missingFinishDates.length === 0) {
                saveInlineGrades(assignments);
            } else {
                openInlineFinishDatesModal(missingFinishDates);
            }
        });





    let deleteAssignmentState = {
    step: 1,
    assignmentId: null,
    title: "",
    studySessions: 0,
    studyMinutes: 0
    };
    async function openDeleteAssignmentModal(row) {
        deleteAssignmentState = {
            step: 1,
            assignmentId: row.dataset.assignmentId,
            title: row.dataset.title,
            studySessions: 0,
            studyMinutes: 0
        };

        document.getElementById("deleteAssignmentConfirmName").innerText =
            `"${deleteAssignmentState.title}"`;

        // Fetch real impact data
        try {
            const res = await fetch(
                `/assignments/${deleteAssignmentState.assignmentId}/summary`
            );

            if (!res.ok) throw new Error("Failed to fetch delete summary");

            const data = await res.json();

            deleteAssignmentState.studySessions = data.study_session_count;
            deleteAssignmentState.studyMinutes = data.study_minutes;

        } catch (err) {
            console.error(err);
            deleteAssignmentState.studySessions = "—";
            deleteAssignmentState.studyMinutes = "—";
        }

        updateDeleteAssignmentStep();
        showModal("deleteAssignmentModal");
    }




    function updateDeleteAssignmentStep() {
        const stepText = document.getElementById("deleteAssignmentStepText");
        const impactBox = document.getElementById("deleteAssignmentImpactBox");
        const inputBox = document.getElementById("deleteAssignmentInputBox");

        const backBtn = document.getElementById("deleteAssignmentBackBtn");
        const nextBtn = document.getElementById("deleteAssignmentNextBtn");
        const confirmBtn = document.getElementById("deleteAssignmentConfirmBtn");

        // Reset visibility
        impactBox.classList.add("hidden");
        inputBox.classList.add("hidden");
        backBtn.classList.add("hidden");
        nextBtn.classList.remove("hidden");
        confirmBtn.classList.add("hidden");

        if (deleteAssignmentState.step === 1) {
            stepText.innerText =
            `You are about to permanently delete "${deleteAssignmentState.title}".`;
        }

        if (deleteAssignmentState.step === 2) {
            backBtn.classList.remove("hidden");
            impactBox.classList.remove("hidden");

            document.getElementById("deleteAssignmentSessionCount").innerText =
            deleteAssignmentState.studySessions;

            document.getElementById("deleteAssignmentStudyMinutes").innerText =
            deleteAssignmentState.studyMinutes;

            stepText.innerText =
            "This assignment has the following impact:";
        }

        if (deleteAssignmentState.step === 3) {
            backBtn.classList.remove("hidden");
            inputBox.classList.remove("hidden");

            nextBtn.classList.add("hidden");
            confirmBtn.classList.remove("hidden");

            stepText.innerText =
            "This action cannot be undone.";
        }
    }


    document.getElementById("deleteAssignmentNextBtn")
        .addEventListener("click", () => {
            deleteAssignmentState.step++;
            updateDeleteAssignmentStep();
    });

    document.getElementById("deleteAssignmentBackBtn")
        .addEventListener("click", () => {
            deleteAssignmentState.step--;
            updateDeleteAssignmentStep();
    });


    const confirmInput = document.getElementById("deleteAssignmentConfirmInput");
    const confirmBtn = document.getElementById("deleteAssignmentConfirmBtn");

    confirmInput.addEventListener("input", () => {
        const matches =
            confirmInput.value.trim() === deleteAssignmentState.title;

        confirmBtn.disabled = !matches;
    });

    document
        .getElementById("deleteAssignmentConfirmBtn")
        .addEventListener("click", async () => {

            const csrf = document
                .querySelector("meta[name='csrf-token']")
                .content;

            const res = await fetch(
                `/assignments/${deleteAssignmentState.assignmentId}`,
                {
                    method: "DELETE",
                    headers: {
                        "X-CSRFToken": csrf
                    }
                }
            );

            if (!res.ok) {
                alert("Failed to delete assignment");
                return;
            }

            // Option A (simple, safe)
            location.reload();

            // Option B (optional later):
            // remove row from DOM + close modal
        });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", e => {
            if (!hasUnsavedInlineChanges) return;

            e.preventDefault();
            pendingNavigationUrl = link.href;
            showModal("unsavedChangesModal");
        });
    });

       



     // ================= SORT CATEGORY LOGIC =================
    document.addEventListener("DOMContentLoaded", () => {
        const radios = document.querySelectorAll("input[name='sortCategory']");
        const sortSelect = document.getElementById("assignmentSortBy");

        function updateSortOptions(category) {
            [...sortSelect.options].forEach(opt => {
                opt.hidden = opt.dataset.cat !== category;
            });

            // Select first visible option
            const firstVisible = [...sortSelect.options].find(o => !o.hidden);
            if (firstVisible) sortSelect.value = firstVisible.value;
        }

        radios.forEach(radio => {
            radio.addEventListener("change", e => {
                updateSortOptions(e.target.value);
            });
        });

        // Init on load
        const checked = document.querySelector("input[name='sortCategory']:checked");
        if (checked) updateSortOptions(checked.value);
    });




});
