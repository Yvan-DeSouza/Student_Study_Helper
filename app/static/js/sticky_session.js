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
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken
            },
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
          const response = await fetch(`/study/${dueModal.dataset.sessionId}/cancel`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "X-CSRFToken": csrfToken
              }
          });
          if (!response.ok) throw new Error("Request failed");
          const data = await response.json();
          if (!data.success) throw new Error("Server rejected cancellation");

          closeDueModal();
          window.location.reload(); // refresh to remove the modal
      } catch (err) {
          console.error(err);
          alert("Failed to cancel session. Please try again.");
      }
    });


    startBtn.addEventListener("click", async () => {
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
      try {
        const response = await fetch(`/study/${dueModal.dataset.sessionId}/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
          },
          body: JSON.stringify({})
        });

        if (!response.ok) throw new Error("Request failed");
        const data = await response.json();
        if (!data.success) throw new Error("Server rejected session");

        closeDueModal();
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to start session. Please try again.");
      }
    });

    rescheduleBtn.addEventListener("click", async () => {
      // ================= RESCHEDULE =================
      const rescheduleModal = document.getElementById("reschedule-modal");
      const rescheduleInput = document.getElementById("reschedule-datetime");
      const confirmRescheduleBtn = document.getElementById("confirm-reschedule");
      const cancelRescheduleBtn = document.getElementById("cancel-reschedule");

      const errorModal = document.getElementById("reschedule-error-modal");
      const closeErrorBtn = document.getElementById("close-reschedule-error");

      function openRescheduleModal() {
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
        openRescheduleModal(); // return user to form
      }

      rescheduleBtn.addEventListener("click", () => {
        closeDueModal();
        openRescheduleModal();
      });

      cancelRescheduleBtn.addEventListener("click", () => {
        closeRescheduleModal();
        dueModal.classList.remove("hidden");
        dueModal.classList.add("active");
      });

      closeErrorBtn.addEventListener("click", closeErrorModal);

      confirmRescheduleBtn.addEventListener("click", async () => {
        const newTime = rescheduleInput.value;
        if (!newTime) return;

        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");

        try {
          const response = await fetch(`/study/${dueModal.dataset.sessionId}/reschedule`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({ expected_started_at: newTime })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            closeRescheduleModal();
            openErrorModal(); // 👈 clean UX
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
      
    });
  }
});
