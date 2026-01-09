// static/js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const sideNav = document.getElementById('dashboardSideNav');
  const navButtons = sideNav?.querySelectorAll('.side-nav-btn') || [];
  const sections = Array.from(document.querySelectorAll('.dashboard-section'));

  // Initialize flip card functionality
  const { reapplyFlipStates } = initFlipCards();

  // Navigation: click buttons to scroll to section
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.dataset.target;
      const section = document.getElementById(target);
      if (!section) return;
      
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Function to update active nav button based on scroll position
  function updateActiveSection() {
    let currentSection = null;
    
    // Find which section is most visible in the viewport
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      // Check if section is in the viewport (top 40% of screen)
      if (rect.top <= window.innerHeight * 0.4 && rect.bottom >= 0) {
        currentSection = section;
      }
    });
    
    // If we found a current section, update nav buttons
    if (currentSection) {
      const sectionId = currentSection.id;
      navButtons.forEach(btn => {
        if (btn.dataset.target === sectionId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  // Listen to scroll events for real-time nav highlighting
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveSection, 50);
  });

  // Initial update on page load
  updateActiveSection();

  // Active state on scroll using IntersectionObserver for flip state management
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Reapply flip states when section comes into view
        reapplyFlipStates(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  });

  sections.forEach(section => observer.observe(section));
});