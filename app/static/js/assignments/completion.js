
import { showModal, closeModal } from './modals.js';
import { emitRefresh } from '../core/refreshBus.js';

let pendingRow = null;
let pendingCheckbox = null;

export function initCompletion() {
    // EVENT DELEGATION: Listen on document for dynamically created checkboxes
    document.addEventListener("change", handleCheckboxChange);

    document.querySelectorAll("input[name='completion_time']").forEach(radio => {
        radio.addEventListener("change", e => {
            document
                .getElementById("pickedCompletionDate")
                .classList.toggle("hidden", e.target.value !== "pick");
        });
    });

    // Remove old listeners if they exist
    const uncompleteBtn = document.getElementById("confirmUncomplete");
    const completeBtn = document.getElementById("confirmComplete");
    
    if (uncompleteBtn) {
        const newUncompleteBtn = uncompleteBtn.cloneNode(true);
        uncompleteBtn.parentNode.replaceChild(newUncompleteBtn, uncompleteBtn);
        newUncompleteBtn.addEventListener("click", handleUncomplete);
    }
    
    if (completeBtn) {
        const newCompleteBtn = completeBtn.cloneNode(true);
        completeBtn.parentNode.replaceChild(newCompleteBtn, completeBtn);
        newCompleteBtn.addEventListener("click", handleComplete);
    }
}

function handleCheckboxChange(e) {
    if (!e.target.matches(".completion-checkbox")) return;

    e.stopPropagation();
    e.preventDefault();

    pendingCheckbox = e.target;
    pendingRow = e.target.closest("tr");

    if (!pendingRow) return;

    const title = pendingRow.dataset.title;
    const dueAt = pendingRow.dataset.dueAt;

    const wasCompleted = pendingRow.dataset.completed === "true";
    const wantsCompleted = e.target.checked;

    e.target.checked = wasCompleted;

    if (wantsCompleted && !wasCompleted) {
        openCompleteModal(title, dueAt);
    } else if (!wantsCompleted && wasCompleted) {
        openUncompleteModal(title);
    }
}

function openUncompleteModal(title) {
    document.getElementById("uncompleteMessage").innerText =
        `Are you sure you want to mark "${title}" as uncompleted? This will remove the finish date.`;

    showModal("uncompleteConfirmModal");
}

function openCompleteModal(title, dueAt) {
    document.getElementById("completeMessage").innerText =
        `You have marked "${title}" as completed. Please indicate the date/time of completion.`;

    const dueOption = document.getElementById("dueDateOption");
    dueOption.classList.toggle("hidden", !dueAt);

    showModal("completeAssignmentModal");
}

async function handleUncomplete() {
    if (!pendingCheckbox || !pendingRow) return;

    const assignmentId = pendingRow.dataset.assignmentId;
    await sendCompletionUpdate(false, null);

    closeModal("uncompleteConfirmModal");
    
    // Emit refresh event
    await emitRefresh({ key: "assignments:row", payload: { assignmentId: parseInt(assignmentId) } });
    
    pendingRow = null;
    pendingCheckbox = null;
}

async function handleComplete() {
    const mode = document.querySelector("input[name='completion_time']:checked").value;
    const now = new Date();
    let finishedAt = null;

    if (mode === "now") {
        finishedAt = now.toISOString();
    }

    if (mode === "pick") {
        const val = document.getElementById("pickedCompletionDate").value;
        if (!val || new Date(val) > now) {
            showModal("futureFinishDateModal");
            return;
        }
        finishedAt = val;
    }

    if (mode === "due") {
        finishedAt = pendingRow.dataset.dueAt;
    }

    const assignmentId = pendingRow.dataset.assignmentId;
    await sendCompletionUpdate(true, finishedAt);
    
    closeModal("completeAssignmentModal");
    
    // Emit refresh event
    await emitRefresh({ key: "assignments:row", payload: { assignmentId: parseInt(assignmentId) } });
    
    pendingRow = null;
    pendingCheckbox = null;
}

async function sendCompletionUpdate(isCompleted, finishedAt) {
    const id = pendingRow.dataset.assignmentId;
    
    const res = await fetch(`/assignments/${id}/update`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector("meta[name='csrf-token']").content
        },
        body: JSON.stringify({
            is_graded: pendingRow.dataset.graded === "true",
            finished_at: isCompleted ? finishedAt : null
        })
    });

    if (!res.ok) {
        alert("Failed to update completion status");
    }
}