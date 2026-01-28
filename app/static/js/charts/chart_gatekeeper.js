export function gateChart(cardEl, response, renderFront, renderBack) {
  // Defensive check: if cardEl is null, log warning and return false
  if (!cardEl) {
    console.warn('[gateChart] Card element is null, cannot render chart');
    return false;
  }
  
  const frontEl = cardEl.querySelector('.card-front');
  const backEl = cardEl.querySelector('.min_requirements');

  const data = response.eligibility ?? response;

  const {
    eligible,
    progress,
    ineligible_classes = [],
    ineligible_assignments = [],
    representative = null
  } = data;

  // Clear back by default (important)
  if (backEl) backEl.innerHTML = "";

  if (!eligible) {
    frontEl.innerHTML = renderFront(progress, representative);

    // Ensure chart wrapper exists and is visible
    const wrapper = frontEl.querySelector('.chart-wrapper');
    if (wrapper) {
      wrapper.style.height = "220px";
      wrapper.style.display = "block";
    }

    return false;
  }

  // Eligible → front should be empty so canvas can render

  if (
    (ineligible_classes.length > 0 || ineligible_assignments.length > 0) &&
    renderBack
  ) {
    backEl.innerHTML = renderBack(
      ineligible_classes,
      ineligible_assignments
    );
  }

  return true;
}
