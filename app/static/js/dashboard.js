document.addEventListener("DOMContentLoaded", () => {
  const sideNav = document.getElementById('dashboardSideNav');
  const navButtons = sideNav?.querySelectorAll('.side-nav-btn') || [];
  const sections = Array.from(document.querySelectorAll('.dashboard-section'));

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

  // Navigation: click buttons to scroll to section
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.dataset.target;
      const section = document.getElementById(target);
      if (!section) return;
      
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Update active state
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Active state on scroll using IntersectionObserver
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        
        // Update active nav button
        navButtons.forEach(btn => {
          if (btn.dataset.target === sectionId) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
        
        // Reapply flip states
        const cards = entry.target.querySelectorAll('.graph-card');
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
    });
  }, {
    root: null,
    rootMargin: '0px 0px -60% 0px',
    threshold: 0.2
  });

  sections.forEach(section => observer.observe(section));

  // Reset flip states when leaving the dashboard
  window.addEventListener('beforeunload', () => {
    flipState.clear();
  });

  // Expose helper to reset flips
  window.resetDashboardFlips = function() {
    document.querySelectorAll('.graph-card.flipped').forEach(card => {
      card.classList.remove('flipped');
      const title = card.querySelector('.card-title');
      if (title && title.dataset.originalTitle) {
        title.textContent = title.dataset.originalTitle;
        delete title.dataset.originalTitle;
      }
    });
    flipState.clear();
  };

  // Reset on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      window.resetDashboardFlips();
    }
  });
});