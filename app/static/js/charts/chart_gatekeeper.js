export function gateChart(cardEl, response) {
  const front = cardEl.querySelector('.card-front');
  const back = cardEl.querySelector('.card-back');

  if (!response.eligible) {
    front.innerHTML = `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        <ul>
          <li>At least 1 class</li>
          <li>3 graded assignments per class</li>
          <li>Class must be 3 weeks old</li>
        </ul>
      </div>
    `;
    return false;
  }

  if (response.eligibility.ineligible_classes.length > 0) {
    back.innerHTML = `
      <p><strong>Why some classes are hidden:</strong></p>
      <ul>
        ${response.eligibility.ineligible_classes.map(c =>
          `<li>${c.class_name}: ${c.reasons.join(", ")}</li>`
        ).join("")}
      </ul>
    `;
  }

  return true;
}
