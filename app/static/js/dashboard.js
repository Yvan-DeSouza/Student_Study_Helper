document.addEventListener("DOMContentLoaded", () => {
  // Side nav behavior and section navigation
  const side = document.getElementById('dashboardSideNav');
  const icons = side?.querySelectorAll('.side-nav-icon') || [];
  const sections = Array.from(document.querySelectorAll('.dashboard-section'));

  // Flip state map (persist only while on dashboard)
  const flipState = new Map();

  // Initialize flip buttons
  document.querySelectorAll('.flip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.graph-card');
      if (!card) return;
      const id = card.id;
      const flipped = card.classList.toggle('flipped');
      flipState.set(id, flipped);
    });
  });

  // On load, ensure flip states match map (initially all false)
  // Navigation: click icons to scroll to section
  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const target = icon.dataset.target;
      const sect = document.getElementById(target);
      if (!sect) return;
      sect.scrollIntoView({behavior:'smooth', block: 'start'});
      // set active class
      icons.forEach(i => i.classList.remove('active'));
      icon.classList.add('active');
    });
  });

  // Active state on scroll using IntersectionObserver
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        icons.forEach(i => {
          if (i.dataset.target === id) i.classList.add('active'); else i.classList.remove('active');
        });
        // Reapply flip state to cards within the visible section
        const cards = entry.target.querySelectorAll('.graph-card');
        cards.forEach(c => {
          const shouldFlip = flipState.get(c.id);
          if (shouldFlip) c.classList.add('flipped'); else c.classList.remove('flipped');
        });
      }
    });
  }, { root: null, rootMargin: '0px 0px -60% 0px', threshold: 0.2 });

  sections.forEach(s => io.observe(s));

  // Reset flip states when leaving the dashboard page
  window.addEventListener('beforeunload', () => {
    flipState.clear();
  });

  // Expose helper to reset flips programmatically
  window.resetDashboardFlips = function() {
    document.querySelectorAll('.graph-card.flipped').forEach(c => c.classList.remove('flipped'));
    flipState.clear();
  };

  // If page visibility changes (navigating away in single-page flows), reset flips
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') window.resetDashboardFlips();
  });
});
