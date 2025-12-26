document.addEventListener("DOMContentLoaded", () => {

  const sessionBar = document.getElementById("active-session-bar");
  const endBtn = document.getElementById("end-session-btn");
  const timerEl = document.getElementById("session-timer");
  const modal = document.getElementById("end-session-modal");
  const confirmBtn = document.getElementById("confirm-end-session");
  const cancelBtn = document.getElementById("cancel-end-session");

  // If no session bar exists, we can poll for future sessions later
  if (!sessionBar) return;

  const startedAtISO = sessionBar.dataset.startedAt;
  const sessionId = sessionBar.dataset.sessionId;

  if (!startedAtISO || !sessionId) return;

  const startedAt = new Date(startedAtISO);

  // Only start the timer if the session has actually started
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

  // Only start interval if the session has started
  function startTimerInterval() {
    updateTimer();
    return setInterval(updateTimer, 1000);
  }

  let timerInterval = startTimerInterval();

  // Modal logic
  function openModal() { modal.classList.remove("hidden"); modal.classList.add("active"); }
  function closeModal() { modal.classList.remove("active"); modal.classList.add("hidden"); }

  endBtn.addEventListener("click", openModal);
  cancelBtn.addEventListener("click", closeModal);

  confirmBtn.addEventListener("click", async () => {
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

});
