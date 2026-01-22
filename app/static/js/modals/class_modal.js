// static/js/modals/class_modal.js

function initClassModal() {

  const addModal = document.getElementById("addClassModal");

  if (!addModal) return;

  const classForm = document.getElementById("classForm");
  const methodInput = document.getElementById("classFormMethod");
  const classModalTitle = document.getElementById("classModalTitle");
  const classModalSubmit = document.getElementById("classModalSubmit");

  const nameInput = document.getElementById("class-name");
  const codeInput = document.getElementById("class-code");
  const typeSelect = document.getElementById("classTypeSelect");
  const importanceSelect = document.getElementById("importance");
  const colorInput = document.getElementById("classColor");
  const difficultyInput = document.getElementById("difficulty");
  const passGradeInput = document.getElementById("pass_grade");
  const teacherNameInput = document.getElementById("teacher_name");

  function resetClassModal() {
    classModalTitle.textContent = "Add Class";
    classModalSubmit.textContent = "Create Class";
    classForm.action = "/classes";
    classForm.method = "POST";
    methodInput.value = "POST";
    classForm.reset();
    colorInput.value = "#4f46e5";
  }

  function openEditClassModal(btn) {
    classModalTitle.textContent = "Edit Class";
    classModalSubmit.textContent = "Save Changes";

    nameInput.value = btn.dataset.name;
    codeInput.value = btn.dataset.code;
    typeSelect.value = btn.dataset.type;
    importanceSelect.value = btn.dataset.importance || "";
    colorInput.value = btn.dataset.color || "#4f46e5";
    difficultyInput.value = btn.dataset.difficulty || "";
    passGradeInput.value = btn.dataset.passGrade || "";
    teacherNameInput.value = btn.dataset.teacherName || "";

    classForm.action = `/classes/${btn.dataset.classId}`;
    methodInput.value = "PATCH";

    addModal.classList.remove("hidden");
    addModal.classList.add("active");
  }

    // OPEN MODAL (Add) - listen for when modal.js opens it
    document.addEventListener("click", e => {
        const btn = e.target.closest("[data-open-modal='addClassModal']");

        if (!btn) return;


        setTimeout(() => {
            resetClassModal();
        }, 0);
    });




  // EDIT
  document.addEventListener("click", e => {
    const btn = e.target.closest(".edit-btn");
    if (!btn) return;

    openEditClassModal(btn);
  });



    }

// 🔑 Run immediately (safe even if DOM is already loaded)
initClassModal();
