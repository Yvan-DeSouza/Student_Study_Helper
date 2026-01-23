// static/js/classes/modals/class_editor.js
import { showModal } from "../../core/modalManager.js";

export function initClassModals() {
    const addModal = document.getElementById("addClassModal");
    const editModal = document.getElementById("editClassModal");

    if (!addModal && !editModal) return;

    // Open Add Modal
    document.querySelectorAll("[data-open-modal='addClassModal']").forEach(btn => {
        btn.addEventListener("click", () => {
            resetAddClassModal();
            showModal("addClassModal");
        });
    });

    // Open Edit Modal
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openEditClassModal(btn.dataset);
            showModal("editClassModal");
        });
    });
}

function resetAddClassModal() {
    const form = document.getElementById("addClassForm");
    form.reset();
    document.getElementById("classColor").value = "#4f46e5";
}

function openEditClassModal(data) {
    document.getElementById("edit-class-name").value = data.name;
    document.getElementById("edit-class-code").value = data.code;
    document.getElementById("edit-classTypeSelect").value = data.type;
    document.getElementById("edit-importance").value = data.importance || "";
    document.getElementById("edit-classColor").value = data.color || "#4f46e5";
    document.getElementById("edit-difficulty").value = data.difficulty || "";
    document.getElementById("edit-pass_grade").value = data.passGrade || "";

    const form = document.getElementById("editClassForm");
    form.action = `/classes/${data.classId}`;
}
