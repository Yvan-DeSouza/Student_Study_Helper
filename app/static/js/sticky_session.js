document.addEventListener("DOMContentLoaded", () => {
  const sessionBar = document.getElementById("active-session-bar");
  if (!sessionBar) return;

  const startedAtISO = sessionBar.dataset.startedAt;
  const sessionId = sessionBar.dataset.sessionId;
  const timerEl = document.getElementById("session-timer");

  if (!startedAtISO || !sessionId) return;

  const startedAt = new Date(startedAtISO);

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

  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);

  const endBtn = document.getElementById("end-session-btn");
  endBtn.addEventListener("click", async () => {
    endBtn.disabled = true;
    endBtn.textContent = "Ending...";

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

      const response = await fetch(`/study/${sessionId}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error("Failed to end session");

      await response.json();

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
