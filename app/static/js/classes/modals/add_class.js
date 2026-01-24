// static/js/classes/modals/add_class.js
import { showModal, closeModal } from '../../core/modalManager.js';
import { default_class_colors } from '../utils.js';
import { saveAllInlineEditsSilently } from '../inlineEditing.js';
import { runRefreshes } from "../../core/refreshBus.js";

export function initAddClassModal() {
    const addModal = document.getElementById("addClassModal");
    if (!addModal) return;

    const classForm = document.getElementById("addClassForm");
    const typeSelect = document.getElementById("classTypeSelect");
    const colorInput = document.getElementById("classColor");

    // Form submission
    classForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitAddClass(classForm);
    });

    // Auto-update color when type changes
    typeSelect.addEventListener("change", () => {
        const newType = typeSelect.value;
        if (newType && default_class_colors[newType]) {
            colorInput.value = default_class_colors[newType];
        }
    });
}




async function submitAddClass(form) {
    try {
        const csrf = document.querySelector("meta[name='csrf-token']").content;

        const response = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
            headers: {
                "Accept": "application/json",
            }
        });
        console.log(response)

        if (!response.ok) {
            let err = {};
            try {
                err = await response.json();
            } catch {
                err.error = "Server error (non-JSON response)";
            }

            if (err.error === "duplicate_name") {
                document.getElementById("invalidNameMessage").textContent = err.message;
                showModal("invalidNameModal");
                return;
            }

            if (err.error === "duplicate_code") {
                document.getElementById("invalidCodeMessage").textContent = err.message;
                showModal("invalidCodeModal");
                return;
            }

            throw new Error(err.error || "Failed to create class");
        }

        // ✅ Safe success handling
        await response.json();

        closeModal("addClassModal");

        document.dispatchEvent(new CustomEvent("class:changed"));

        document.dispatchEvent(new CustomEvent("class:changed"));

    } catch (error) {
        console.error("Error creating class:", error);
        alert("Failed to create class. Please try again.");
    }
}


function resetClassModal() {
    const addModal = document.getElementById("addClassModal");
    if (!addModal) return;

    const classForm = document.getElementById("addClassForm");
    const colorInput = document.getElementById("classColor");
    const advancedToggle = addModal.querySelector(".advanced-toggle");
    const advancedOptions = addModal.querySelector(".advanced-options");

    // Reset form
    classForm.reset();
    colorInput.value = "#4f46e5";

    // Collapse advanced options
    if (advancedOptions && advancedToggle) {
        advancedOptions.classList.add("hidden");
        advancedToggle.setAttribute("aria-expanded", "false");
        advancedToggle.textContent = "▸ Advanced options";
    }
}

export async function openAddClassModal() {
    await saveAllInlineEditsSilently();
    resetClassModal();
    showModal("addClassModal");
}