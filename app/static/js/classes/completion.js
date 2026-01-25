// static/js/classes/completion.js
import { showModal, closeModal } from '../core/modalManager.js';
import { forceCloseInlineEdit } from './inlineEditing.js';
import { emitRefresh } from '../core/refreshBus.js';
import { getClassSelectorState } from '../selector/selector_state.js';
import { filterAndSortClasses } from '../selector/selector_filter.js';
import { applyVisibilityAndOrder } from '../selector/selector_apply.js';

let pendingClassCard = null;
let pendingFinishCheckbox = null;

export function initCompletion() {
    document.querySelectorAll(".finish-checkbox").forEach(cb => {
        cb.addEventListener("change", e => {
            e.preventDefault();
            e.stopPropagation();

            const card = cb.closest(".class-card");
            const wasFinished = card.dataset.finished === "finished";
            const wantsFinished = cb.checked;

            cb.checked = wasFinished;

            pendingClassCard = card;
            pendingFinishCheckbox = cb;

            const className = card.querySelector("h3").innerText;

            if (!wasFinished && wantsFinished) {
                openCompleteClassModal(className);
            }

            if (wasFinished && !wantsFinished) {
                openUncompleteClassModal(className);
            }
        });
    });

    document.querySelectorAll('input[name="completion_time"]').forEach(radio => {
        radio.addEventListener("change", e => {
            document
                .getElementById("pickedCompletionDate")
                .classList.toggle("hidden", e.target.value !== "pick");
        });
    });

    document.getElementById("confirmComplete")?.addEventListener("click", handleComplete);
    document.getElementById("confirmUncomplete")?.addEventListener("click", handleUncomplete);
}

function openCompleteClassModal(className) {
    document.getElementById("completeMessage").innerText =
        `You have marked your "${className}" class as finished. Please indicate the date/time of completion.`;

    document.querySelector('input[name="completion_time"][value="now"]').checked = true;
    document.getElementById("pickedCompletionDate").classList.add("hidden");
    document.getElementById("pickedCompletionDate").value = "";

    showModal("completeAssignmentModal");
}

function openUncompleteClassModal(className) {
    document.getElementById("uncompleteMessage").innerText =
        `Are you sure you want to mark your "${className}" class as unfinished? This will remove the finish date.`;

    showModal("uncompleteConfirmModal");
}

async function handleComplete() {
    if (!pendingClassCard || !pendingFinishCheckbox) return;

    const option = document.querySelector('input[name="completion_time"]:checked').value;
    let finishedAt = null;

    if (option === "now") {
        finishedAt = new Date().toISOString();
    }

    if (option === "pick") {
        const picked = document.getElementById("pickedCompletionDate").value;
        if (!picked) return;

        const pickedDate = new Date(picked);
        if (pickedDate > new Date()) {
            showModal("futureFinishDateModal");
            return;
        }

        finishedAt = pickedDate.toISOString();
    }

    const classId = pendingClassCard.dataset.classId;
    await sendClassFinishedUpdate(classId, true, finishedAt);

    pendingFinishCheckbox.checked = true;
    pendingClassCard.dataset.finished = "finished";

    updateClassFinishedUI(pendingClassCard, true);

    closeModal("completeAssignmentModal");

    // Emit refresh events - completion affects both card and charts
    await emitRefresh(
        { key: "classes:card", payload: { classId } },
        "classes:charts"
    );

    pendingClassCard = null;
    pendingFinishCheckbox = null;
}

async function handleUncomplete() {
    if (!pendingClassCard || !pendingFinishCheckbox) return;

    const classId = pendingClassCard.dataset.classId;
    await sendClassFinishedUpdate(classId, false, null);

    pendingFinishCheckbox.checked = false;
    pendingClassCard.dataset.finished = "in_progress";

    updateClassFinishedUI(pendingClassCard, false);

    closeModal("uncompleteConfirmModal");

    // Emit refresh events
    await emitRefresh(
        { key: "classes:card", payload: { classId } },
        "classes:charts"
    );

    pendingClassCard = null;
    pendingFinishCheckbox = null;
}

async function sendClassFinishedUpdate(classId, isFinished, finishedAt) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    try {
        await fetch(`/classes/${classId}/completion`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                is_finished: isFinished,
                finished_at: finishedAt
            })
        });
    } catch (error) {
        console.error("Error updating class completion:", error);
    }
}



function updateClassFinishedUI(card, isFinished) {
    const statusEl = card.querySelector(".status");
    const inlineEditBtn = card.querySelector(".edit-inline-btn");
    const hint = card.querySelector(".hint-icon");

    if (isFinished) {
        statusEl.textContent = "Finished ✓";
        statusEl.className = "status finished";
        inlineEditBtn.disabled = true;
        inlineEditBtn.style.opacity = "0.5";
        hint.style.display = "inline-flex";
        forceCloseInlineEdit(card, { disable: true });
    } else {
        statusEl.textContent = "In Progress";
        statusEl.className = "status in-progress";
        inlineEditBtn.disabled = false;
        inlineEditBtn.style.opacity = "1";
        hint.style.display = "none";
        forceCloseInlineEdit(card, { disable: false });
    }

    // --- Handle filter visibility ---
    const container = document.querySelector('.classes-grid');
    const allItems = [...container.querySelectorAll('.class-card')];
    const state = getClassSelectorState();
    const filteredAndSorted = filterAndSortClasses(allItems, state);

    applyVisibilityAndOrder(container, allItems, filteredAndSorted, state.sortBy);
}









