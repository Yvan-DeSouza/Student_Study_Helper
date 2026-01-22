export function gateChart(cardEl, response, renderFront, renderBack) {
  const frontEl = cardEl.querySelector('.card-front');
  const backEl = cardEl.querySelector('.min_requirements');

  // ---- Normalize backend payload ----
  const data = response.eligibility ?? response;

  const {
    eligible,
    progress,
    ineligible_classes = [],
    ineligible_assignments = [],
    representative = null
  } = data;

  // ---- Front (not eligible) ----
  if (!eligible) {
    frontEl.innerHTML = renderFront(progress, representative);
    const wrapper = frontEl.querySelector('.chart-wrapper');
    if (wrapper) wrapper.style.height = '220px';
    return false;
  }

  // ---- Back (eligible but partial data hidden) ----
  if ((ineligible_classes.length > 0 || ineligible_assignments.length > 0) && renderBack) {
    backEl.innerHTML = renderBack(ineligible_classes, ineligible_assignments);
  }

  return true;
}