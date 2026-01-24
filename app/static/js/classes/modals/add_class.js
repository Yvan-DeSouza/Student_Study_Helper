import { showModal } from '../../core/modalManager.js';
import { default_class_colors } from '../utils.js';
import { saveAllInlineEditsSilently } from '../inlineEditing.js';
import { submitClassForm } from "../refresh/index.js";

export function initAddClassModal() {
    const addModal = document.getElementById("addClassModal");
    if (!addModal) return;


    const classForm = document.getElementById("addClassForm");
    const typeSelect = document.getElementById("classTypeSelect");
    const colorInput = document.getElementById("classColor");
    const advancedToggle = addModal.querySelector(".advanced-toggle");
    const advancedOptions = addModal.querySelector(".advanced-options");


    classForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitClassForm(classForm, {
            refresh: ["home:charts", "home:assignments", "home:sessions"]
        });

    });

    // Event listener removed, now handled by controller



    typeSelect.addEventListener("change", () => {
        const newType = typeSelect.value;
        if (newType && default_class_colors[newType]) {
            colorInput.value = default_class_colors[newType];
        }
    });


}
function resetClassModal() {
    const addModal = document.getElementById("addClassModal");
    if (!addModal) return;
    const classForm = document.getElementById("addClassForm");
    const colorInput = document.getElementById("classColor");
    const advancedToggle = addModal.querySelector(".advanced-toggle");
    const advancedOptions = addModal.querySelector(".advanced-options");


    document.getElementById("classModalTitle").textContent = "Add Class";
    document.getElementById("classModalSubmit").textContent = "Create Class";
    classForm.action = "/classes";
    classForm.method = "POST";
    document.getElementById("classFormMethod").value = "POST";
    classForm.reset();
    colorInput.value = "#4f46e5";

    // Collapse advanced options by default
    advancedOptions.classList.add("hidden");
    advancedToggle.setAttribute("aria-expanded", "false");
}
export async function openAddClassModal() {
    await saveAllInlineEditsSilently();
    resetClassModal();
    showModal("addClassModal");
}
