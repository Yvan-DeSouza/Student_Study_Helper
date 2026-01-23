// static/js/assignments/editAssignment.js
import { showModal, closeModal } from './modals.js';

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

export function initEditAssignment() {
    populateEditModalOptions();

    // Attach listeners to editable rows
    document.querySelectorAll(".assignments-table-card").forEach(card => {
        const editBtn = card.querySelector(".table-edit-btn");
        const rows = card.querySelectorAll(".assignments-table tbody tr");

        if (!editBtn) return;

        rows.forEach(row => {
            row.addEventListener("click", e => {
                if (card.dataset.editing !== "true") return;
                if (e.target.closest("input, select, button, label")) return;
                openEditModal(row);
            });
        });
    });
    editIsGraded.addEventListener("change", e => toggleGradedFields(e.target.checked));
editForm.addEventListener("submit", handleEditSubmit);
}
function populateEditModalOptions() {
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

editClass.innerHTML = "";
document.querySelectorAll("#assignment-class option").forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.textContent;
    editClass.appendChild(option);
});
}
function toggleGradedFields(enabled) {
editGradedOnly.classList.toggle("hidden", !enabled);
}
function openEditModal(row) {
editId.value = row.dataset.assignmentId;
editTitle.value = row.children[0].innerText;
editClass.value = row.dataset.classId;
editType.value = row.dataset.assignmentType;
editDueAt.value = row.dataset.dueAt !== "null" ? row.dataset.dueAt : "";
editFinishedAt.value = row.dataset.finishedAt || "";
const isGraded = String(row.dataset.graded).toLowerCase() === "true";
editIsGraded.checked = isGraded;
toggleGradedFields(isGraded);

editExpectedGrade.value = row.dataset.expectedGrade || "";
editPassGrade.value = row.dataset.passGrade || "";
editPonderation.value = row.dataset.ponderation || "";
editDifficulty.value = row.dataset.difficulty || "";
editEstimatedMinutes.value = row.dataset.estimatedMinutes || "";

editModal.classList.add("visible");
}
async function handleEditSubmit(e) {
e.preventDefault();
const finishedAtVal = editFinishedAt.value;
if (finishedAtVal) {
    const finishedDate = new Date(finishedAtVal);
    const now = new Date();

    if (finishedDate > now) {
        showModal("futureFinishDateModal");

        document
            .querySelector("#futureFinishDateModal [data-close-modal]")
            .addEventListener("click", () => {
                editFinishedAt.focus();
            });

        return;
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
}