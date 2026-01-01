import { initClassSelector } from "./selector/selector_init.js";

document.addEventListener("DOMContentLoaded", () => {
    initClassSelector();



    document.querySelectorAll(".class-dot").forEach(dot => {
        const color = dot.dataset.color;
        if (color) {
            dot.style.backgroundColor = color;
        }
    });
    // Class type emoji injection
    document.querySelectorAll(".class-type").forEach(el => {
        const type = el.dataset.type;
        if (class_type_emojis[type]) {
            el.textContent = `${class_type_emojis[type]} ${el.textContent}`;
        }
    });


    // Importance dot coloring
    document.querySelectorAll(".importance-dot").forEach(dot => {
        const level = dot.dataset.importance;
        if (importance_colors[level]) {
            dot.style.backgroundColor = importance_colors[level];
        }
    });
    function getDifficultyColor(value) {
        if (value <= 3) return "#22c55e";   // green
        if (value <= 5) return "#facc15";   // yellow
        if (value <= 7) return "#fb923c";   // orange
        return "#ef4444";                   // red
    }


    document.querySelectorAll(".difficulty-value").forEach(el => {
        const difficulty = parseInt(el.dataset.difficulty, 10);
        if (isNaN(difficulty)) return;


        // Create bar container
        const bar = document.createElement("span");
        bar.className = "difficulty-bar";


        // Create bar fill
        const fill = document.createElement("span");
        fill.className = "difficulty-bar-fill";


        // Width = difficulty %
        fill.style.width = `${difficulty * 10}%`;
        fill.style.backgroundColor = getDifficultyColor(difficulty);


        bar.appendChild(fill);


        // Insert bar right after the number
        el.insertAdjacentElement("afterend", bar);
    });




    function getGradeColor(grade, passGrade) {
        if (grade === null || isNaN(grade)) {
            return "#9ca3af"; // neutral
        }


        grade = Math.max(0, Math.min(100, grade));


        // CASE 1: Grade + pass grade
        if (passGrade !== null && !isNaN(passGrade)) {
            if (grade >= passGrade) {
                return "#22c55e"; // green
            }


            const ratio = grade / passGrade;


            if (ratio < 0.4) return "#ef4444";   // red
            if (ratio < 0.7) return "#fb923c";   // orange
            return "#facc15";                    // yellow
        }


        // CASE 2: Grade only (0–100)
        if (grade < 50) return "#ef4444";        // red
        if (grade < 65) return "#fb923c";        // orange
        if (grade < 80) return "#facc15";        // yellow
        return "#22c55e";                        // green
    }


    document.querySelectorAll(".class-card").forEach(card => {
        const display = card.querySelector(".grade-display");
        const dot = card.querySelector(".grade-dot");


        if (!display || !dot) return;


        const gradeRaw = display.dataset.grade;
        const passRaw = display.dataset.passGrade;


        const grade = gradeRaw !== "" && gradeRaw !== null
            ? parseFloat(gradeRaw)
            : null;


        const passGrade = passRaw !== "" && passRaw !== null
            ? parseFloat(passRaw)
            : null;


        dot.style.backgroundColor = getGradeColor(grade, passGrade);
    });










    /* ======================================================
   INLINE GRADE EDITING + UNSAVED CHANGES (CLEAN REWRITE)
    ====================================================== */


    let hasUnsavedChanges = false;
    let pendingNavigation = null;
    // Track changes for all relevant inputs
    document.querySelectorAll(".inline-grade-input").forEach(input => {
        input.addEventListener("input", markDirty);
    });





    /* ---------- DOM REFERENCES ---------- */


    const unsavedModal = document.getElementById("unsavedChangesModal");
    if (!unsavedModal) {
        console.warn("Unsaved changes modal not found!");
    }
    const saveAllBtn = document.getElementById("saveAllInline");
    const leaveBtn = document.getElementById("leaveWithoutSaving");
    const stayBtn = document.getElementById("stayOnPage");


    /* ---------- MODAL HELPERS ---------- */


    function openUnsavedModal() {
        unsavedModal.classList.remove("hidden");
        unsavedModal.classList.add("active");
    }


    function closeUnsavedModal() {
        unsavedModal.classList.add("hidden");
        unsavedModal.classList.remove("active");
    }


    /* ---------- NAVIGATION INTERCEPTION ---------- */


    /**
     * Intercept ALL anchor navigation
     * (navbar + internal links)
     */
    document.addEventListener("click", (e) => {
        // Only intercept direct left-clicks on anchors
        if (e.defaultPrevented) return;
        if (e.button !== 0) return; // left click only
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const link = e.target.closest("a[href]");
        if (!link) return;

        // Ignore anchors that open modals or act as UI controls
        if (link.dataset.openModal) return;
        if (link.dataset.ignoreUnsaved === "true") return;

        // Ensure the anchor itself was clicked, not a nested button
        if (!link.contains(e.target)) return;

        if (!hasUnsavedChanges) return;

        e.preventDefault();

        pendingNavigation = () => {
            window.location.href = link.href;
        };

        openUnsavedModal();
    });




    /**
     * Browser-level page leave (refresh, close tab, back)
     */
    window.onbeforeunload = (e) => {
        if (!hasUnsavedChanges) return;
        e.preventDefault();
        e.returnValue = "";
    };



    /* ---------- INLINE EDIT STATE ---------- */


    const inlineEdits = new Map();


    function markDirty() {
        hasUnsavedChanges = true;
    }


    function clearDirty() {
        hasUnsavedChanges = false;
    }


    function forceCloseInlineEdit(card, { disable = false } = {}) {
        const inlineEditBtn = card.querySelector(".edit-inline-btn");
        const saveBtn = card.querySelector(".save-inline-btn");
        const cancelBtn = card.querySelector(".cancel-inline-btn");
        const input = card.querySelector(".inline-grade-input");
        const display = card.querySelector(".grade-display");

        if (input && display) {
            input.style.display = "none";
            input.disabled = disable;
            display.style.display = "inline";
        }

        if (saveBtn) saveBtn.style.display = "none";
        if (cancelBtn) cancelBtn.style.display = "none";

        if (inlineEditBtn) {
            inlineEditBtn.style.display = "inline-block";
            inlineEditBtn.disabled = disable;
            inlineEditBtn.style.opacity = disable ? "0.5" : "1";
            inlineEditBtn.title = disable
                ? "Cannot edit the grade of a class that is already finished"
                : "";
        }
    }









    /* ---------- EDIT INLINE ---------- */


    document.querySelectorAll(".edit-inline-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".class-card");

            if (card.dataset.finished === "true") {
                return;
            }

            const classId = card.dataset.classId;
            const display = card.querySelector(".grade-display");
            const input = card.querySelector(".inline-grade-input");
            const saveBtn = card.querySelector(".save-inline-btn");
            const cancelBtn = card.querySelector(".cancel-inline-btn");

            if (!input || !display) return;

            inlineEdits.set(classId, {
                original: display.dataset.grade ? parseFloat(display.dataset.grade) : null
            });


            display.style.display = "none";
            input.style.display = "inline-block";
            input.disabled = false;
            input.focus();


            btn.style.display = "none";
            saveBtn.style.display = "inline-block";
            cancelBtn.style.display = "inline-block";
        });
    });


    /* ---------- INPUT CHANGE TRACKING ---------- */


    document.querySelectorAll(".inline-grade-input").forEach(input => {
        input.addEventListener("input", () => {
            markDirty();
        });
    });


    /* ---------- SAVE SINGLE ---------- */


    document.querySelectorAll(".save-inline-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const card = btn.closest(".class-card");
            const classId = card.dataset.classId;


            const input = card.querySelector(".inline-grade-input");
            const display = card.querySelector(".grade-display");


            const value = parseFloat(input.value);
            if (isNaN(value) || value < 0 || value > 100) {
                document.getElementById("invalidGradeModal")
                    .classList.remove("hidden");
                return;
            }


            const csrfToken = document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content");


            await fetch(`/classes/${classId}/grade`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-CSRFToken": csrfToken
                },
                body: `grade=${encodeURIComponent(value)}`
            });


            display.textContent = value.toFixed(1);
            display.dataset.grade = value;
            const dot = card.querySelector(".grade-dot");
            const passGrade = parseFloat(display.dataset.passGrade);
            dot.style.backgroundColor = getGradeColor(value, passGrade);




            resetInlineUI(card);
            inlineEdits.delete(classId);


            if (inlineEdits.size === 0) {
                clearDirty();
            }
        });
    });


    /* ---------- CANCEL SINGLE ---------- */


    document.querySelectorAll(".cancel-inline-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".class-card");
            const classId = card.dataset.classId;


            const input = card.querySelector(".inline-grade-input");
            const display = card.querySelector(".grade-display");


            const edit = inlineEdits.get(classId);
            input.value = edit?.original ?? "";


            resetInlineUI(card);
            inlineEdits.delete(classId);


            if (inlineEdits.size === 0) {
                clearDirty();
            }
        });
    });


    /* ---------- SAVE ALL ---------- */


    saveAllBtn.addEventListener("click", async () => {
        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            .getAttribute("content");


        const requests = [];


        inlineEdits.forEach((_, classId) => {
            const card = document.querySelector(
                `.class-card[data-class-id="${classId}"]`
            );
            const input = card.querySelector(".inline-grade-input");


            requests.push(
                fetch(`/classes/${classId}/grade`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "X-CSRFToken": csrfToken
                    },
                    body: `grade=${encodeURIComponent(input.value)}`
                })
            );
        });


        await Promise.all(requests);


        inlineEdits.clear();
        clearDirty();
        closeUnsavedModal();


        if (pendingNavigation) pendingNavigation();
    });


    /* ---------- LEAVE WITHOUT SAVING ---------- */


    leaveBtn.addEventListener("click", () => {
        inlineEdits.clear();
        clearDirty();
        closeUnsavedModal();
        if (pendingNavigation) pendingNavigation();
    });


    /* ---------- STAY ---------- */


    stayBtn.addEventListener("click", () => {
        pendingNavigation = null;
        closeUnsavedModal();
    });


    /* ---------- UI RESET ---------- */


    function resetInlineUI(card) {
        card.querySelector(".inline-grade-input").style.display = "none";
        card.querySelector(".inline-grade-input").disabled = true;
        card.querySelector(".grade-display").style.display = "inline";


        card.querySelector(".edit-inline-btn").style.display = "inline-block";
        card.querySelector(".save-inline-btn").style.display = "none";
        card.querySelector(".cancel-inline-btn").style.display = "none";
    }
   


    let isEditMode = false;
    let previousClassType = null;




    async function saveAllInlineEditsSilently() {
        if (!hasUnsavedChanges || inlineEdits.size === 0) return;


        const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            .getAttribute("content");


        const requests = [];


        inlineEdits.forEach((_, classId) => {
            const card = document.querySelector(
            `.class-card[data-class-id="${classId}"]`
            );
            const input = card.querySelector(".inline-grade-input");


            const value = parseFloat(input.value);
            if (isNaN(value) || value < 0 || value > 100) return;


            requests.push(
            fetch(`/classes/${classId}/grade`, {
                method: "POST",
                headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": csrfToken
                },
                body: `grade=${encodeURIComponent(value)}`
            })
            );
        });


        await Promise.all(requests);


        inlineEdits.clear();
        clearDirty();
    }






    /* ======================================================
       ADD / EDIT CLASS MODAL (UI ONLY)
    ====================================================== */


    const addModal = document.getElementById("addClassModal");
    if (!addModal) return;


    const classModalTitle = document.getElementById("classModalTitle");
    const classModalSubmit = document.getElementById("classModalSubmit");
    const classForm = addModal.querySelector("form");
    const teacherNameInput = document.getElementById("teacher_name");
    const nameInput = document.getElementById("class-name");
    const codeInput = document.getElementById("class-code");
    const typeSelect = document.getElementById("classTypeSelect");
    const importanceSelect = document.getElementById("importance");
    const colorInput = document.getElementById("classColor");
    const difficultyInput = document.getElementById("difficulty");
    const passGradeInput = document.getElementById("pass_grade");




    function resetClassModal() {
        classModalTitle.textContent = "Add Class";
        classModalSubmit.textContent = "Create Class";
        classForm.action = "/classes/new";


        classForm.reset();
        colorInput.value = "#4f46e5";
        isEditMode = false;
        previousClassType = null;
    }






    function openEditClassModal(btn) {
        console.log(nameInput)
        isEditMode = true;


        classModalTitle.textContent = "Edit Class";
        classModalSubmit.textContent = "Save Changes";


        nameInput.value = btn.dataset.name;
        codeInput.value = btn.dataset.code;
        typeSelect.value = btn.dataset.type;
        importanceSelect.value = btn.dataset.importance || "";
        colorInput.value = btn.dataset.color || "#4f46e5";
        if (difficultyInput) {
            difficultyInput.value = btn.dataset.difficulty || "";
        }
        if (passGradeInput){
            passGradeInput.value = btn.dataset.passGrade || "";
        }


        if (teacherNameInput) {
            teacherNameInput.value = btn.dataset.teacherName || "";
        }


        classForm.action = `/classes/${btn.dataset.classId}/edit`;


        addModal.classList.remove("hidden");
        addModal.classList.add("active");


        previousClassType = btn.dataset.type;
    }




    // Open ADD modal
    document.querySelectorAll(
        "#openAddClassModal, #openAddClassModalEmpty"
    ).forEach(btn => {
        btn.addEventListener("click", async () => {
            await saveAllInlineEditsSilently();

            inlineEdits.clear();
            clearDirty();
            pendingNavigation = null;

            resetClassModal();
        });
    });




    // Close modal
    document.getElementById("closeAddClassModal")
        ?.addEventListener("click", resetClassModal);


    // Edit buttons
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await saveAllInlineEditsSilently();

            inlineEdits.clear();
            clearDirty();
            pendingNavigation = null;

            openEditClassModal(btn);
        });
    });




    // Color auto-update logic
    typeSelect.addEventListener("change", () => {
        const newType = typeSelect.value;
        if (!newType || !default_class_colors[newType]) return;


        if (!isEditMode) {
            colorInput.value = default_class_colors[newType];
            return;
        }


        const currentColor = colorInput.value.toUpperCase();
        const previousDefault = default_class_colors[previousClassType];


        if (previousDefault && currentColor === previousDefault.toUpperCase()) {
            colorInput.value = default_class_colors[newType];
        }


        previousClassType = newType;
    });








    document.querySelectorAll(".finish-checkbox").forEach(cb => {
        cb.addEventListener("change", async () => {
            const card = cb.closest(".class-card");
            const statusEl = card.querySelector(".status");
            const editBtn = card.querySelector(".edit-btn");
            const inlineEditBtn = card.querySelector(".edit-inline-btn"); // only the inline edit button


            const classId = cb.dataset.classId;
            const isFinished = cb.checked;


            // Update UI immediately
            if (isFinished) {
                statusEl.textContent = "Finished ✓";
                statusEl.classList.remove("in-progress");
                statusEl.classList.add("finished");


                // Main edit button stays normal
                if (editBtn) {
                    editBtn.disabled = false; // keep it usable
                    editBtn.style.opacity = "1";
                    editBtn.title = "";
                }


                // Inline edit button is blurred/disabled
                if (inlineEditBtn) {
                    inlineEditBtn.disabled = true;
                    inlineEditBtn.style.opacity = "0.5";
                    inlineEditBtn.title = "Cannot edit the grade of a class that is already finished";
                }

                const hint = card.querySelector(".hint-icon");
                if (hint){
                    hint.style.display = "inline-block"
                }

                // Also hide save/cancel if currently editing
                const saveBtn = card.querySelector(".save-inline-btn");
                const cancelBtn = card.querySelector(".cancel-inline-btn");
                if (saveBtn) saveBtn.style.display = "none";
                if (cancelBtn) cancelBtn.style.display = "none";


            } else {
                statusEl.textContent = "In Progress";
                statusEl.classList.remove("finished");
                statusEl.classList.add("in-progress");


                // Re-enable buttons
                if (editBtn) {
                    editBtn.disabled = false;
                    editBtn.style.opacity = "1";
                    editBtn.title = "";
                }


                if (inlineEditBtn) {
                    inlineEditBtn.disabled = false;
                    inlineEditBtn.style.opacity = "1";
                    inlineEditBtn.title = "";
                }

                const hint = card.querySelector(".hint-icon");
                if (hint) {
                    hint.style.display = "none"
                }
            }




            const input = card.querySelector(".inline-grade-input");
            const isEditing = input && input.style.display === "inline-block";




            if (isFinished && isEditing && input.value !== "") {
                const value = parseFloat(input.value);


                if (!isNaN(value) && value >= 0 && value <= 100) {
                    const csrfToken = document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content");


                    await fetch(`/classes/${classId}/grade`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "X-CSRFToken": csrfToken
                        },
                        body: `grade=${encodeURIComponent(value)}`
                    });


                    // Update UI immediately
                    const display = card.querySelector(".grade-display");
                    display.textContent = value.toFixed(1);
                    display.dataset.grade = value;
                }


                inlineEdits.delete(classId);
                clearDirty();
            }


            if (isFinished) {
                forceCloseInlineEdit(card, { disable: true });
            } else {
                forceCloseInlineEdit(card, { disable: false });
            }




            // Send request to server
            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
                await fetch(`/classes/${classId}/toggle-finished`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "X-CSRFToken": csrfToken
                    },
                    body: `is_finished=${isFinished ? "true" : "false"}`
                });
            } catch (err) {
                console.error("Failed to update finish status:", err);
            }
        });
    });




    /* ======================================================
       DELETE CLASS MODAL (MULTI-STEP)
    ====================================================== */




    const deleteModal = document.getElementById("deleteClassModal");
    const deleteText = document.getElementById("deleteStepText");
    const impactBox = document.getElementById("deleteImpactBox");
    const inputBox = document.getElementById("deleteInputBox");




    const assignmentCountEl = document.getElementById("assignmentCount");
    const sessionCountEl = document.getElementById("sessionCount");




    const confirmInput = document.getElementById("deleteConfirmInput");
    const confirmBtn = document.getElementById("confirmDelete");
    const cancelBtn = document.getElementById("cancelDelete");
    const backBtn = document.getElementById("deleteBackBtn");
    const deleteForm = document.getElementById("deleteClassForm");




    let currentStep = 1;
    let className = "";




    function renderDeleteStep() {
        confirmBtn.disabled = currentStep === 3;
        confirmInput.value = "";




        impactBox.classList.add("hidden");
        inputBox.classList.add("hidden");
        backBtn.style.display = currentStep === 1 ? "none" : "inline-block";




        if (currentStep === 1) {
            deleteText.textContent =
                `Are you sure you want to delete the "${className}" class?`;
        }




        if (currentStep === 2) {
            deleteText.textContent =
                "Deleting this class will permanently remove:";
            impactBox.classList.remove("hidden");
        }




        if (currentStep === 3) {
            deleteText.textContent =
                `To confirm deletion of "${className}", type the class name below.`;
            inputBox.classList.remove("hidden");
        }




        confirmBtn.textContent = currentStep < 3 ? "Next" : "Delete";
    }




    // Open DELETE modal
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            className = btn.dataset.className;




            assignmentCountEl.textContent = btn.dataset.assignments;
            sessionCountEl.textContent = btn.dataset.sessions;




            deleteForm.action = `/classes/${btn.dataset.classId}/delete`;




            currentStep = 1;
            renderDeleteStep();
            deleteModal.classList.remove("hidden");
            deleteModal.classList.add("active");
        });
    });




    // Enable delete only when name matches
    confirmInput.addEventListener("input", () => {
        confirmBtn.disabled = confirmInput.value !== className;
    });




    // Next / Delete logic
    confirmBtn.addEventListener("click", (e) => {
        if (currentStep < 3) {
            e.preventDefault();
            currentStep++;
            renderDeleteStep();
        } else {


        }
    });




    // Back button
    backBtn.addEventListener("click", () => {
        if (currentStep > 1) {
            currentStep--;
            renderDeleteStep();
        }
    });




    // Cancel delete
    cancelBtn.addEventListener("click", () => {
        deleteModal.classList.remove("active");
        deleteModal.classList.add("hidden")
    });




});










