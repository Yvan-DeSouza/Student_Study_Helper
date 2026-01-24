import { showModal } from '../../core/modalManager.js';
import { default_class_colors } from '../utils.js';
import { saveAllInlineEditsSilently } from '../inlineEditing.js';
import { submitClassForm } from "../refresh/index.js";

export function initEditClassModal() {
    const editModal = document.getElementById("editClassModal");
    if (!editModal) return;



    const classForm = document.getElementById("editClassForm");
    const typeSelect = document.getElementById("edit-classTypeSelect");
    const colorInput = document.getElementById("edit-classColor");
    const advancedToggle = editModal.querySelector(".advanced-toggle");
    const advancedOptions = editModal.querySelector(".advanced-options");


    classForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitClassForm(classForm, {
            refresh: ["classes", "charts"]
        });
    });

    // Event listener removed, now handled by controller



    typeSelect.addEventListener("change", () => {
        const newType = typeSelect.value;
        if (!newType || !default_class_colors[newType]) return;

        if (colorInput.value.toUpperCase() === default_class_colors[typeSelect.dataset.previous]?.toUpperCase()) {
            colorInput.value = default_class_colors[newType];
        }

        typeSelect.dataset.previous = newType;
    });


}
    export async function openEditClassModal(btn) {
        await saveAllInlineEditsSilently();

        // Fill inputs from button data attributes
        document.getElementById("edit-class-name").value = btn.dataset.name;
        document.getElementById("edit-class-code").value = btn.dataset.code;
        typeSelect.value = btn.dataset.type;
        typeSelect.dataset.previous = btn.dataset.type;
        document.getElementById("edit-importance").value = btn.dataset.importance || "";
        colorInput.value = btn.dataset.color || "#4f46e5";
        document.getElementById("edit-difficulty").value = btn.dataset.difficulty || "";
        document.getElementById("edit-pass_grade").value = btn.dataset.passGrade || "";
        document.getElementById("edit-teacher_name").value = btn.dataset.teacherName || "";

        // Collapse advanced options by default
        advancedOptions.classList.add("hidden");
        advancedToggle.setAttribute("aria-expanded", "false");

        // Set correct PATCH URL
        classForm.action = `/classes/${btn.dataset.classId}`;
        classForm.method = "POST"; // HTML form uses POST + _method override
        document.getElementById("editClassFormMethod").value = "PATCH";

        showModal("editClassModal");
    }