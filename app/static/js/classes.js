document.addEventListener("DOMContentLoaded", () => {

    /* ======================================================
       ADD / EDIT CLASS MODAL
    ====================================================== */

    const addModal = document.getElementById("addClassModal");
    const classModalTitle = document.getElementById("classModalTitle");
    const classModalSubmit = document.getElementById("classModalSubmit");
    const classForm = addModal.querySelector("form");
    const gradeInput = document.getElementById("classGrade");

    const nameInput = document.getElementById("class-name");
    const codeInput = document.getElementById("class-code");
    const typeSelect = document.getElementById("classTypeSelect");
    const importanceSelect = document.getElementById("importance");
    const colorInput = document.getElementById("classColor");

    function resetClassModal() {
        classModalTitle.textContent = "Add Class";
        classModalSubmit.textContent = "Create Class";
        classForm.action = "/classes/new";
        gradeInput.value = "";

        classForm.reset();
        colorInput.value = "#4f46e5";
        previousClassType = null;
    }

    function openEditClassModal(btn) {
        classModalTitle.textContent = "Edit Class";
        classModalSubmit.textContent = "Save Changes";

        nameInput.value = btn.dataset.name;
        codeInput.value = btn.dataset.code;
        typeSelect.value = btn.dataset.type;
        importanceSelect.value = btn.dataset.importance;
        colorInput.value = btn.dataset.color || "#4f46e5";
        gradeInput.value = btn.dataset.grade || "";

        classForm.action = `/classes/${btn.dataset.classId}/edit`;

        addModal.classList.add("active");
        previousClassType = btn.dataset.type;
    }

    // Open ADD modal
    document.querySelectorAll(
        "#openAddClassModal, #openAddClassModalEmpty"
    ).forEach(btn => {
        btn.addEventListener("click", () => {
            resetClassModal();
            addModal.classList.add("active");
        });
    });

    // Close ADD / EDIT modal
    document.getElementById("closeAddClassModal")
        ?.addEventListener("click", () => {
            resetClassModal();
            addModal.classList.remove("active");
        });

    // Edit buttons
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openEditClassModal(btn);
        });
    });
    let previousClassType = null;

    typeSelect.addEventListener("change", () => {
        const newType = typeSelect.value;
        const currentColor = colorInput.value.toUpperCase();

        // If opening edit modal, remember original type
        if (!previousClassType) {
            previousClassType = newType;
            return;
        }

        const previousDefault = DEFAULT_COLORS[previousClassType];
        const newDefault = DEFAULT_COLORS[newType];

        // Only auto-update color if user hasn't customized it
        if (previousDefault && currentColor === previousDefault.toUpperCase()) {
            colorInput.value = newDefault || colorInput.value;
        }

        previousClassType = newType;
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
    });

});
