export function gateChart(cardEl, response, renderFront, renderBack) {
  const frontEl = cardEl.querySelector('.card-front');
  const backEl = cardEl.querySelector('.min_requirements');

  // ---- Normalize backend payload (temporary safety layer) ----
  const data = response.eligibility ?? response;

  const {
    eligible,
    progress,
    ineligible_classes = []
  } = data;

  // ---- Front (not eligible) ----
  if (!eligible) {
    frontEl.innerHTML = renderFront(progress);
    return false;
  }

  // ---- Back (eligible but partial data hidden) ----
  if (ineligible_classes.length > 0 && renderBack) {
    backEl.innerHTML = renderBack(ineligible_classes);
  }

  return true;
}
