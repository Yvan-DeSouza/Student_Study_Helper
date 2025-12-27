document.addEventListener("DOMContentLoaded", () => {
  // ================= ACTIVE SESSION BAR =================
  const sessionBar = document.getElementById("active-session-bar");
  const endBtn = document.getElementById("end-session-btn");
  const timerEl = document.getElementById("session-timer");
  const endModal = document.getElementById("end-session-modal");
  const confirmEndBtn = document.getElementById("confirm-end-session");
  const cancelEndBtn = document.getElementById("cancel-end-session");

  if (sessionBar) {
    const startedAtISO = sessionBar.dataset.startedAt;
    const sessionId = sessionBar.dataset.sessionId;
    if (startedAtISO && sessionId) {
      const startedAt = new Date(startedAtISO);

      // Timer
      function updateTimer() {
        const now = new Date();
        const diffMs = now - startedAt;
        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        timerEl.textContent =
          `${String(hours).padStart(2, "0")}:` +
          `${String(minutes).padStart(2, "0")}:` +
          `${String(seconds).padStart(2, "0")}`;
      }

      const timerInterval = setInterval(updateTimer, 1000);
      updateTimer();

      // End session modal
      function openModal() { endModal.classList.remove("hidden"); endModal.classList.add("active"); }
      function closeModal() { endModal.classList.remove("active"); endModal.classList.add("hidden"); }

      endBtn.addEventListener("click", openModal);
      cancelEndBtn.addEventListener("click", closeModal);

      confirmEndBtn.addEventListener("click", async () => {
        closeModal();
        endBtn.disabled = true;
        endBtn.textContent = "Ending...";
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
          const response = await fetch(`/study/${sessionId}/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
            body: JSON.stringify({})
          });
          if (!response.ok) throw new Error("Request failed");
          const data = await response.json();
          if (!data.success) throw new Error("Server rejected session");
          clearInterval(timerInterval);
          window.location.reload();
        } catch (err) {
          console.error(err);
          endBtn.disabled = false;
          endBtn.textContent = "End Session";
          alert("Failed to end session. Please try again.");
        }
      });
    }
  }

  // ================= RESCHEDULE MODAL =================
  const rescheduleModal = document.getElementById("reschedule-modal");
  const rescheduleInput = document.getElementById("reschedule-datetime");
  const confirmRescheduleBtn = document.getElementById("confirm-reschedule");
  const cancelRescheduleBtn = document.getElementById("cancel-reschedule");
  const errorModal = document.getElementById("reschedule-error-modal");
  const closeErrorBtn = document.getElementById("close-reschedule-error");
  let currentRescheduleSessionId = null; // dynamic session id for reschedule

  function openRescheduleModal(sessionId) {
    currentRescheduleSessionId = sessionId;
    rescheduleInput.value = "";
    rescheduleModal.classList.remove("hidden");
    rescheduleModal.classList.add("active");
  }

  function closeRescheduleModal() {
    rescheduleModal.classList.remove("active");
    rescheduleModal.classList.add("hidden");
  }

  function openErrorModal() {
    errorModal.classList.remove("hidden");
    errorModal.classList.add("active");
  }

  function closeErrorModal() {
    errorModal.classList.remove("active");
    errorModal.classList.add("hidden");
    openRescheduleModal(currentRescheduleSessionId);
  }

  confirmRescheduleBtn.addEventListener("click", async () => {
    if (!currentRescheduleSessionId) return;
    const newTime = rescheduleInput.value;
    if (!newTime) return;

    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
    try {
      const response = await fetch(`/study/${currentRescheduleSessionId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify({ expected_started_at: newTime })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        closeRescheduleModal();
        openErrorModal();
        return;
      }
      closeRescheduleModal();
      window.location.reload();
    } catch (err) {
      console.error(err);
      closeRescheduleModal();
      openErrorModal();
    }
  });

  cancelRescheduleBtn.addEventListener("click", () => closeRescheduleModal());
  closeErrorBtn.addEventListener("click", closeErrorModal);

  // ================= SESSION COLLISION HANDLER =================
  const collisionModal = document.getElementById("collision-modal");
  const collisionDataEl = document.getElementById("session-collision-data");
  const session_collision = collisionDataEl ? JSON.parse(collisionDataEl.dataset.collision) : null;
  window.session_collision = session_collision;

  if (collisionModal && session_collision) {
    const startNowBtn = document.getElementById("collision-start-now");
    const cancelBtn = document.getElementById("collision-cancel");
    const rescheduleBtn = document.getElementById("collision-reschedule");

    function openCollisionModal() {
      collisionModal.classList.remove("hidden");
      collisionModal.classList.add("active");
    }
    function closeCollisionModal() {
      collisionModal.classList.remove("active");
      collisionModal.classList.add("hidden");
    }

    openCollisionModal();

    startNowBtn.addEventListener("click", async () => {
      closeCollisionModal();
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
      const { active_session_id, scheduled_session_id } = window.session_collision;
      try {
        await fetch(`/study/${active_session_id}/end`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }, body: JSON.stringify({}) });
        const startResp = await fetch(`/study/${scheduled_session_id}/start`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }, body: JSON.stringify({}) });
        const data = await startResp.json();
        if (!startResp.ok || !data.success) throw new Error(data.error || "Failed to start session");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to switch sessions. Please try again.");
      }
    });

    cancelBtn.addEventListener("click", async () => {
      closeCollisionModal();
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
      const { scheduled_session_id } = window.session_collision;
      try {
        const resp = await fetch(`/study/${scheduled_session_id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken } });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error("Failed to cancel session");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to cancel scheduled session. Please try again.");
      }
    });

    rescheduleBtn.addEventListener("click", () => {
      closeCollisionModal();
      openRescheduleModal(session_collision.scheduled_session_id);
    });
  }

  // ================= DUE SESSION MODAL =================
  const dueModal = document.getElementById("due-session-modal");
  if (dueModal) {
    const startBtn = document.getElementById("start-now-btn");
    const cancelBtn = document.getElementById("cancel-session-btn");
    const rescheduleBtn = document.getElementById("reschedule-btn");

    function closeDueModal() {
      dueModal.classList.remove("active");
      dueModal.classList.add("hidden");
    }

    cancelBtn.addEventListener("click", async () => {
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
      try {
        const response = await fetch(`/study/${dueModal.dataset.sessionId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken } });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("Server rejected cancellation");
        closeDueModal();
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to cancel session. Please try again.");
      }
    });

    startBtn.addEventListener("click", async () => {
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
      try {
        const response = await fetch(`/study/${dueModal.dataset.sessionId}/start`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken }, body: JSON.stringify({}) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("Server rejected session");
        closeDueModal();
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to start session. Please try again.");
      }
    });

    rescheduleBtn.addEventListener("click", () => {
      closeDueModal();
      openRescheduleModal(dueModal.dataset.sessionId);
    });
  }
});
