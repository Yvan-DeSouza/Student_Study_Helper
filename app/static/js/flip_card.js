// static/js/flip_card.js
// Card flip functionality for dashboard graph cards

export function initFlipCards() {
  // Flip state map (persist only while on dashboard)
  const flipState = new Map();

  // Initialize flip buttons
  document.querySelectorAll('.flip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.graph-card');
      if (!card) return;
      
      const cardId = card.dataset.cardId;
      const isFlipped = card.classList.toggle('flipped');
      
      // Update title
      const title = card.querySelector('.card-title');
      if (title) {
        if (isFlipped) {
          title.dataset.originalTitle = title.textContent;
          title.textContent = `Description ${title.textContent}`;
        } else {
          title.textContent = title.dataset.originalTitle || title.textContent.replace('Description ', '');
        }
      }
      
      // Store flip state
      flipState.set(cardId, isFlipped);
    });
  });

  // Reapply flip states when sections come into view
  function reapplyFlipStates(section) {
    const cards = section.querySelectorAll('.graph-card');
    cards.forEach(card => {
      const cardId = card.dataset.cardId;
      const shouldFlip = flipState.get(cardId);
      
      if (shouldFlip) {
        card.classList.add('flipped');
        const title = card.querySelector('.card-title');
        if (title && !title.dataset.originalTitle) {
          title.dataset.originalTitle = title.textContent;
          title.textContent = `Description ${title.textContent}`;
        }
      } else {
        card.classList.remove('flipped');
        const title = card.querySelector('.card-title');
        if (title && title.dataset.originalTitle) {
          title.textContent = title.dataset.originalTitle;
        }
      }
    });
  }

  // Reset flip states
  function resetFlipStates() {
    document.querySelectorAll('.graph-card.flipped').forEach(card => {
      card.classList.remove('flipped');
      const title = card.querySelector('.card-title');
      if (title && title.dataset.originalTitle) {
        title.textContent = title.dataset.originalTitle;
        delete title.dataset.originalTitle;
      }
    });
    flipState.clear();
  }

  // Reset on page leave
  window.addEventListener('beforeunload', () => {
    flipState.clear();
  });

  // Reset on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      resetFlipStates();
    }
  });

  // Expose helper to reset flips
  window.resetDashboardFlips = resetFlipStates;

  // Return reapply function for use by observer
  return { reapplyFlipStates };
}