import { showModal, closeModal } from '../../core/modalManager.js';
import { default_class_colors } from '../utils.js';
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
        const response = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
            headers: {
                "Accept": "application/json",
            }
        });

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

        // Success
        const result = await response.json();
        resetClassModal();
        closeModal("addClassModal");
        
        // Determine which page we're on and trigger appropriate refreshes
        const currentPage = getCurrentPage();
        
        if (currentPage === 'home') {
            await runRefreshes([
                "home:sessions",      // Update study session form dropdown
                "home:assignments",   // Update assignment form dropdown
                "home:charts"         // Update charts (new class appears)
            ]);
        } else if (currentPage === 'classes') {
            await runRefreshes([
                "classes:cards",      // Refresh class cards
                "classes:charts"      // Refresh class charts
            ]);
        }

    } catch (error) {
        console.error("Error creating class:", error);
        alert("Failed to create class. Please try again.");
    }
}

function getCurrentPage() {
    // Determine current page from URL or active nav link
    const activeNav = document.querySelector('.nav-link.active');
    if (activeNav) {
        const href = activeNav.getAttribute('href');
        if (href.includes('/main')) return 'home';
        if (href.includes('/classes')) return 'classes';
        if (href.includes('/assignment')) return 'assignments';
    }
    return 'unknown';
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
    // Check if saveAllInlineEditsSilently exists (only on classes page)
    if (typeof window.saveAllInlineEditsSilently === 'function') {
        await window.saveAllInlineEditsSilently();
    }
    resetClassModal();
    showModal("addClassModal");
}