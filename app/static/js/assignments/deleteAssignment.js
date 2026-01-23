// static/js/assignments/deleteAssignment.js
import { showModal, closeModal } from './modals.js';

let deleteAssignmentState = {
    step: 1,
    assignmentId: null,
    title: "",
    studySessions: 0,
    studyMinutes: 0
};

export function initDeleteAssignment() {
    // Attach click listeners to rows in delete mode
    document.querySelectorAll(".assignments-table-card").forEach(card => {
        const rows = card.querySelectorAll(".assignments-table tbody tr");

        rows.forEach(row => {
            row.addEventListener("click", e => {
                if (card.dataset.deleteMode !== "true") return;

                e.stopPropagation();
                e.preventDefault();

                openDeleteAssignmentModal(row);
            });
        });
    });

    document.getElementById("deleteAssignmentNextBtn")
        .addEventListener("click", () => {
            deleteAssignmentState.step++;
            updateDeleteAssignmentStep();
        });

    document.getElementById("deleteAssignmentBackBtn")
        .addEventListener("click", () => {
            deleteAssignmentState.step--;
            updateDeleteAssignmentStep();
        });

    const confirmInput = document.getElementById("deleteAssignmentConfirmInput");
    const confirmBtn = document.getElementById("deleteAssignmentConfirmBtn");

    confirmInput.addEventListener("input", () => {
        const matches =
            confirmInput.value.trim() === deleteAssignmentState.title;

        confirmBtn.disabled = !matches;
    });

    document
        .getElementById("deleteAssignmentConfirmBtn")
        .addEventListener("click", handleDeleteConfirm);
}

async function openDeleteAssignmentModal(row) {
    deleteAssignmentState = {
        step: 1,
        assignmentId: row.dataset.assignmentId,
        title: row.dataset.title,
        studySessions: 0,
        studyMinutes: 0
    };

    document.getElementById("deleteAssignmentConfirmName").innerText =
        `"${deleteAssignmentState.title}"`;

    try {
        const res = await fetch(
            `/assignments/${deleteAssignmentState.assignmentId}/summary`
        );

        if (!res.ok) throw new Error("Failed to fetch delete summary");

        const data = await res.json();

        deleteAssignmentState.studySessions = data.study_session_count;
        deleteAssignmentState.studyMinutes = data.study_minutes;

    } catch (err) {
        console.error(err);
        deleteAssignmentState.studySessions = "—";
        deleteAssignmentState.studyMinutes = "—";
    }

    updateDeleteAssignmentStep();
    showModal("deleteAssignmentModal");
}

function updateDeleteAssignmentStep() {
    const stepText = document.getElementById("deleteAssignmentStepText");
    const impactBox = document.getElementById("deleteAssignmentImpactBox");
    const inputBox = document.getElementById("deleteAssignmentInputBox");

    const backBtn = document.getElementById("deleteAssignmentBackBtn");
    const nextBtn = document.getElementById("deleteAssignmentNextBtn");
    const confirmBtn = document.getElementById("deleteAssignmentConfirmBtn");

    impactBox.classList.add("hidden");
    inputBox.classList.add("hidden");
    backBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");
    confirmBtn.classList.add("hidden");

    if (deleteAssignmentState.step === 1) {
        stepText.innerText =
            `You are about to permanently delete "${deleteAssignmentState.title}".`;
    }

    if (deleteAssignmentState.step === 2) {
        backBtn.classList.remove("hidden");
        impactBox.classList.remove("hidden");

        document.getElementById("deleteAssignmentSessionCount").innerText =
            deleteAssignmentState.studySessions;

        document.getElementById("deleteAssignmentStudyMinutes").innerText =
            deleteAssignmentState.studyMinutes;

        stepText.innerText =
            "This assignment has the following impact:";
    }

    if (deleteAssignmentState.step === 3) {
        backBtn.classList.remove("hidden");
        inputBox.classList.remove("hidden");

        nextBtn.classList.add("hidden");
        confirmBtn.classList.remove("hidden");

        stepText.innerText =
            "This action cannot be undone.";
    }
}

async function handleDeleteConfirm() {
    const csrf = document
        .querySelector("meta[name='csrf-token']")
        .content;

    const res = await fetch(
        `/assignments/${deleteAssignmentState.assignmentId}`,
        {
            method: "DELETE",
            headers: {
                "X-CSRFToken": csrf
            }
        }
    );

    if (!res.ok) {
        alert("Failed to delete assignment");
        return;
    }

    location.reload();
}