document.addEventListener("DOMContentLoaded", () => {
    /* ================= ADD CLASS MODAL ================= */
    const addModal = document.getElementById("addClassModal");

    document.querySelectorAll(
        "#openAddClassModal, #openAddClassModalEmpty"
    ).forEach(btn => {
        if (btn) {
            btn.addEventListener("click", () => {
                addModal.classList.add("active");
            });
        }
    });

    document
        .getElementById("closeAddClassModal")
        ?.addEventListener("click", () => {
            addModal.classList.remove("active");
        });

    /* ================= MULTI-STEP DELETE ================= */
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
                `Deleting this class will permanently remove:`;
            impactBox.classList.remove("hidden");
        }

        if (currentStep === 3) {
            deleteText.textContent =
                `To confirm deletion of "${className}", type the class name below.`;
            inputBox.classList.remove("hidden");
        } 
        confirmBtn.textContent =
            currentStep < 3 ? "Next" : "Delete";

    }

    confirmInput.addEventListener("input", () => {
        confirmBtn.disabled = confirmInput.value !== className;
    });

    confirmBtn.addEventListener("click", (e) => {
        if (currentStep < 3) {
            e.preventDefault();
            currentStep++;
            renderDeleteStep();
        }
    });

    backBtn.addEventListener("click", () => {
        if (currentStep > 1) {
            currentStep--;
            renderDeleteStep();
        }
    });

    cancelBtn.addEventListener("click", () => {
        deleteModal.classList.remove("active");
    });



    /* ================= EDIT CLASS ================= */
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            addModal.classList.add("active");

            document.getElementById("class-name").value = btn.dataset.name;
            document.getElementById("class-code").value = btn.dataset.code;
            document.getElementById("classTypeSelect").value = btn.dataset.type;
            document.getElementById("importance").value = btn.dataset.importance;
            document.getElementById("classColor").value =
                btn.dataset.color || "#4f46e5";

            const form = addModal.querySelector("form");
            form.action = `/classes/${btn.dataset.classId}/edit`;
        });
    });

});
