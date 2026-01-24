// static/js/classes/modals/edit_class.js
import { showModal, closeModal } from '../../core/modalManager.js';
import { default_class_colors } from '../utils.js';
import { saveAllInlineEditsSilently } from '../inlineEditing.js';
import { runRefreshes } from "../../core/refreshBus.js";

export function initEditClassModal() {
    const editModal = document.getElementById("editClassModal");
    if (!editModal) return;

    const classForm = document.getElementById("editClassForm");
    const typeSelect = document.getElementById("edit-classTypeSelect");
    const colorInput = document.getElementById("edit-classColor");

    // Form submission
    classForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitEditClass(classForm);
    });

    // Auto-update color when type changes (only if current color matches old default)
    typeSelect.addEventListener("change", () => {
        const newType = typeSelect.value;
        if (!newType || !default_class_colors[newType]) return;

        const previousType = typeSelect.dataset.previous;
        if (previousType && default_class_colors[previousType]) {
            const currentColor = colorInput.value.toUpperCase();
            const previousDefaultColor = default_class_colors[previousType].toUpperCase();

            if (currentColor === previousDefaultColor) {
                colorInput.value = default_class_colors[newType];
            }
        }

        typeSelect.dataset.previous = newType;
    });
}

async function submitEditClass(form) {
    try {
        const response = await fetch(form.action, {
            method: "PATCH", // HTML form uses POST with _method override
            body: new FormData(form),
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            let err = {};
            try {
                err = await response.json();
            } catch {
                // JSON parsing failed, maybe the response was empty
                err.error = "Server responded but not in JSON format";
            }
            throw new Error(err.error || "Failed to update class");
        }


        const result = await response.json();

        // Close modal
        closeModal("editClassModal");

        // Refresh appropriate page elements
        await runRefreshes(["classes", "charts"]);

        // Emit global event
        document.dispatchEvent(new CustomEvent("class:changed"));

    } catch (error) {
        console.error("Error updating class:", error);
        alert("Failed to update class. Please try again.");
    }
}

export async function openEditClassModal(btn) {
    await saveAllInlineEditsSilently();

    const editModal = document.getElementById("editClassModal");
    const classForm = document.getElementById("editClassForm");
    const typeSelect = document.getElementById("edit-classTypeSelect");
    const colorInput = document.getElementById("edit-classColor");
    const advancedToggle = editModal.querySelector(".advanced-toggle");
    const advancedOptions = editModal.querySelector(".advanced-options");

    // Fill inputs from button data attributes
    document.getElementById("edit-class-name").value = btn.dataset.name || "";
    document.getElementById("edit-class-code").value = btn.dataset.code || "";
    typeSelect.value = btn.dataset.type || "";
    typeSelect.dataset.previous = btn.dataset.type || "";
    document.getElementById("edit-importance").value = btn.dataset.importance || "";
    colorInput.value = btn.dataset.color || "#4f46e5";
    document.getElementById("edit-difficulty").value = btn.dataset.difficulty || "";
    document.getElementById("edit-pass_grade").value = btn.dataset.passGrade || "";
    document.getElementById("edit-teacher_name").value = btn.dataset.teacherName || "";

    // Collapse advanced options by default
    if (advancedOptions && advancedToggle) {
        advancedOptions.classList.add("hidden");
        advancedToggle.setAttribute("aria-expanded", "false");
        advancedToggle.textContent = "▸ Advanced options";
    }

    // Set correct PATCH URL
    classForm.action = `/classes/${btn.dataset.classId}`;
    classForm.method = "POST";
    document.getElementById("editClassFormMethod").value = "PATCH";

    showModal("editClassModal");
}