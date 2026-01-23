const ASSIGNMENT_TYPES = [
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

export function initEditAssignmentModal() {
  const editType = document.getElementById("edit-type");
  const editClass = document.getElementById("edit-class");

  if (!editType || !editClass) return;

  // ---- Populate type ----
  editType.innerHTML = "";
  ASSIGNMENT_TYPES.forEach(type => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type
      .replace("_", " ")
      .replace(/\b\w/g, c => c.toUpperCase());
    editType.appendChild(opt);
  });

  // ---- Populate class (clone from main selector) ----
  editClass.innerHTML = "";
  document
    .querySelectorAll("#assignment-class option")
    .forEach(opt => {
      editClass.appendChild(opt.cloneNode(true));
    });
}
