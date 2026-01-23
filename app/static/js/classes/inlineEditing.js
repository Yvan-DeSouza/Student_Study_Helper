import { showModal } from '../core/modalManager.js';
import { getGradeColor, validateGradeInput } from './utils.js';


let hasUnsavedInlineChanges = false;
const inlineEdits = new Map();


export function hasUnsavedChanges() {
    return hasUnsavedInlineChanges;
}


export function clearUnsavedFlag() {
    hasUnsavedInlineChanges = false;
    inlineEdits.clear();
}


export function markDirty() {
    hasUnsavedInlineChanges = true;
}


export function initInlineEditing() {
    // Disable inline edit for finished classes on load
    document.querySelectorAll(".class-card").forEach(card => {
        const isFinished = card.dataset.finished === "finished" || card.dataset.finished === "true";
        if (isFinished) {
            forceCloseInlineEdit(card, { disable: true });
            const hint = card.querySelector(".hint-icon");
            if (hint) hint.style.display = "inline-flex";
        }
    });


    // Edit inline button
    document.querySelectorAll(".edit-inline-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".class-card");
            const isFinished = card.dataset.finished === "finished" || card.dataset.finished === "true";
            if (isFinished) return;


            const classId = card.dataset.classId;
            const display = card.querySelector(".grade-display");
            const input = card.querySelector(".inline-grade-input");
            const saveBtn = card.querySelector(".save-inline-btn");
            const cancelBtn = card.querySelector(".cancel-inline-btn");


            if (!input || !display) return;


            inlineEdits.set(classId, {
                original: display.dataset.grade ? parseFloat(display.dataset.grade) : null
            });


            display.style.display = "none";
            input.style.display = "inline-block";
            input.disabled = false;
            input.focus();


            btn.style.display = "none";
            saveBtn.style.display = "inline-block";
            cancelBtn.style.display = "inline-block";
        });
    });


    // Track input changes
    document.querySelectorAll(".inline-grade-input").forEach(input => {
        input.addEventListener("input", () => {
            markDirty();
        });
    });


    // Save single grade
    document.querySelectorAll(".save-inline-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const card = btn.closest(".class-card");
            await saveSingleGrade(card);
        });
    });


    // Cancel single edit
    document.querySelectorAll(".cancel-inline-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".class-card");
            cancelSingleEdit(card);
        });
    });
}


export async function saveSingleGrade(card) {
    const classId = card.dataset.classId;
    const input = card.querySelector(".inline-grade-input");
    const display = card.querySelector(".grade-display");


    const value = parseFloat(input.value);
   
    if (!validateGradeInput(value)) {
        showModal("invalidGradeModal");
        return;
    }


    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");


    await fetch(`/classes/${classId}/grade`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": csrfToken
        },
        body: `grade=${encodeURIComponent(value)}`
    });


    display.textContent = value.toFixed(1);
    display.dataset.grade = value;
   
    const dot = card.querySelector(".grade-dot");
    const passGrade = parseFloat(display.dataset.passGrade);
    dot.style.backgroundColor = getGradeColor(value, passGrade);


    resetInlineUI(card);
    inlineEdits.delete(classId);


    if (inlineEdits.size === 0) {
        clearUnsavedFlag();
    }
}


export function cancelSingleEdit(card) {
    const classId = card.dataset.classId;
    const input = card.querySelector(".inline-grade-input");
    const edit = inlineEdits.get(classId);
   
    input.value = edit?.original ?? "";


    resetInlineUI(card);
    inlineEdits.delete(classId);


    if (inlineEdits.size === 0) {
        clearUnsavedFlag();
    }
}


export async function saveAllInlineEditsSilently() {
    if (!hasUnsavedInlineChanges || inlineEdits.size === 0) return;




    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
    const requests = [];




    inlineEdits.forEach((_, classId) => {
        const card = document.querySelector(`.class-card[data-class-id="${classId}"]`);
        const input = card.querySelector(".inline-grade-input");
        const value = parseFloat(input.value);
       
        if (!validateGradeInput(value)) return;




        requests.push(
            fetch(`/classes/${classId}/grade`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-CSRFToken": csrfToken
                },
                body: `grade=${encodeURIComponent(value)}`
            })
        );
    });




    await Promise.all(requests);
    clearUnsavedFlag();
}




export async function saveAllInlineGrades() {
    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        .getAttribute("content");

    // 1️⃣ Validate everything first
    for (const [classId] of inlineEdits) {
        const card = document.querySelector(
            `.class-card[data-class-id="${classId}"]`
        );
        const input = card.querySelector(".inline-grade-input");
        const value = parseFloat(input.value);

        if (!validateGradeInput(value)) {
            showModal("invalidGradeModal");
            return false; // ❌ explicit failure
        }
    }

    // 2️⃣ All valid → send requests
    const requests = [];

    inlineEdits.forEach((_, classId) => {
        const card = document.querySelector(
            `.class-card[data-class-id="${classId}"]`
        );
        const input = card.querySelector(".inline-grade-input");

        requests.push(
            fetch(`/classes/${classId}/grade`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-CSRFToken": csrfToken
                },
                body: `grade=${encodeURIComponent(input.value)}`
            })
        );
    });

    await Promise.all(requests);
    clearUnsavedFlag();

    return true; // ✅ explicit success
}



function resetInlineUI(card) {
    card.querySelector(".inline-grade-input").style.display = "none";
    card.querySelector(".inline-grade-input").disabled = true;
    card.querySelector(".grade-display").style.display = "inline";


    card.querySelector(".edit-inline-btn").style.display = "inline-block";
    card.querySelector(".save-inline-btn").style.display = "none";
    card.querySelector(".cancel-inline-btn").style.display = "none";
}


export function forceCloseInlineEdit(card, { disable = false } = {}) {
    const inlineEditBtn = card.querySelector(".edit-inline-btn");
    const saveBtn = card.querySelector(".save-inline-btn");
    const cancelBtn = card.querySelector(".cancel-inline-btn");
    const input = card.querySelector(".inline-grade-input");
    const display = card.querySelector(".grade-display");


    if (input && display) {
        input.style.display = "none";
        input.disabled = disable;
        display.style.display = "inline";
    }


    if (saveBtn) saveBtn.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "none";


    if (inlineEditBtn) {
        inlineEditBtn.style.display = "inline-block";
        inlineEditBtn.disabled = disable;
        inlineEditBtn.style.opacity = disable ? "0.5" : "1";
        inlineEditBtn.title = disable
            ? "Cannot edit the grade of a class that is already finished"
            : "";
    }
}
