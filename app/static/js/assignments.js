document.addEventListener("DOMContentLoaded", () => {

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
                if (e.target.matches("input, select, button, label")) return;
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



    // Close modal on cancel
    editModal.querySelectorAll("[data-close-modal]").forEach(btn => {
        btn.addEventListener("click", () => editModal.classList.remove("visible"));
    });

    // Submit edit form
    editForm.addEventListener("submit", async e => {
        e.preventDefault();

        const finishedAtVal = editFinishedAt.value;
        if (finishedAtVal) {
            const finishedDate = new Date(finishedAtVal);
            const now = new Date();
            if (finishedDate > now) {
                if (!confirm("Finish date is in the future. Are you sure?")) {
                    return;
                }
            }
        }




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
});
