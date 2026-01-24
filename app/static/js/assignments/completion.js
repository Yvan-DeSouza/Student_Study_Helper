// static/js/assignments/completion.js
import { showModal, closeModal } from './modals.js';

let pendingRow = null;
let pendingCheckbox = null;

export function initCompletion() {
    document.querySelectorAll(".completion-checkbox").forEach(cb => {
        cb.addEventListener("change", e => {
            e.stopPropagation();
            e.preventDefault();

            pendingCheckbox = cb;
            pendingRow = cb.closest("tr");

            const title = pendingRow.dataset.title;
            const dueAt = pendingRow.dataset.dueAt;

            const wasCompleted = pendingRow.dataset.completed === "true";
            const wantsCompleted = cb.checked;

            cb.checked = wasCompleted;

            if (wantsCompleted && !wasCompleted) {
                openCompleteModal(title, dueAt);
            } else if (!wantsCompleted && wasCompleted) {
                openUncompleteModal(title);
            }
        });
    });

    document.querySelectorAll("input[name='completion_time']").forEach(radio => {
        radio.addEventListener("change", e => {
            document
                .getElementById("pickedCompletionDate")
                .classList.toggle("hidden", e.target.value !== "pick");
        });
    });

    document.getElementById("confirmUncomplete").addEventListener("click", handleUncomplete);
    document.getElementById("confirmComplete").addEventListener("click", handleComplete);
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

    await sendCompletionUpdate(false, null);

    pendingCheckbox.checked = false;
    pendingRow.dataset.completed = "false";

    // Emit refresh event
    document.dispatchEvent(new CustomEvent("assignment:completion:changed"));

    closeModal("uncompleteConfirmModal");
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

    await sendCompletionUpdate(true, finishedAt);
    
    // Emit refresh event
    document.dispatchEvent(new CustomEvent("assignment:completion:changed"));
    
    closeModal("completeAssignmentModal");
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
        return;
    }

    pendingRow.dataset.completed = isCompleted.toString();
    pendingCheckbox.checked = isCompleted;

    pendingRow.dataset.finishedAt = finishedAt || "";

    const finishedAtCell = pendingRow.children[9];
    finishedAtCell.innerText = finishedAt
        ? new Date(finishedAt).toISOString().split("T")[0]
        : "—";
}