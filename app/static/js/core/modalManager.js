export function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  document.querySelectorAll(".modal-overlay")
    .forEach(m => m.classList.remove("modal-top"));

  modal.classList.remove("hidden");
  modal.classList.add("visible", "modal-top");
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove("visible", "modal-top");
  modal.classList.add("hidden");
}

export function initModalEvents() {
  document.addEventListener("click", e => {
    const closeBtn = e.target.closest("[data-close-modal]");
    if (!closeBtn) return;

    const modal = closeBtn.closest(".modal-overlay");
    if (!modal) return;

    modal.classList.remove("visible", "modal-top");
    modal.classList.add("hidden");
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target !== overlay) return;

      overlay.classList.remove("visible", "modal-top");
      overlay.classList.add("hidden");
    });
  });
}
