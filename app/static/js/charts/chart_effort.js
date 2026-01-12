import { gateChart } from './chart_gatekeeper.js';

document.addEventListener('DOMContentLoaded', async () => {

  function getThemeColor(lightColor, darkColor) {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? darkColor : lightColor;
  }

  // =================== RENDER FUNCTIONS ===================

  function renderTimeSpentFront(progress, representative) {
    const hasNoClasses = progress.eligible_classes.current === 0;

    if (hasNoClasses) {
      return `
        <div class="chart-empty">
          <p><strong>Not enough data yet</strong></p>
          <p><em>Per-class requirements:</em></p>
          <ul>
            <li>≥ 2 completed study sessions per class</li>
            <li>≥ 2 completed assignments per class, with at least 1 linked to a study session</li>
          </ul>
        </div>
      `;
    }

    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        ${representative ? `<p><em>Currently showing: ${representative.class_name}</em></p>` : ''}
        <ul>
        ${representative ? `
            <p><strong>Best available class so far:</strong></p>
            <ul>
                <li>${representative.completed_sessions}/2 completed study sessions</li>
                <li>${representative.completed_assignments}/2 completed assignments</li>
                <li>${representative.assignments_with_sessions}/2 assignments with linked study sessions</li>
            </ul>
            ` : ''}
 
          <li>
            Eligible classes:
            ${progress.eligible_classes.current}/${progress.eligible_classes.required}
            ${progress.eligible_classes.current >= progress.eligible_classes.required ? "✅" : "❌"}
          </li>
          <li>
            Total completed study sessions:
            ${progress.completed_study_sessions_total.current}/${progress.completed_study_sessions_total.required}
            ${progress.completed_study_sessions_total.current >= progress.completed_study_sessions_total.required ? "✅" : "❌"}
          </li>
          <li>
            Total completed assignments:
            ${progress.completed_assignments_total.current}/${progress.completed_assignments_total.required}
            ${progress.completed_assignments_total.current >= progress.completed_assignments_total.required ? "✅" : "❌"}
          </li>
        </ul>
      </div>
    `;
  }

  function renderTimeSpentBack(ineligibleClasses) {
    return `
      <p><strong>Why some classes are hidden:</strong></p>
      <ul>
        ${ineligibleClasses
          .map(c => `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`)
          .join("")}
      </ul>
    `;
  }

  function renderMarginalReturnsFront(progress) {
    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        <ul>
          <li>
            Days since earliest study session:
            ${progress.days_since_earliest_study_session.current}/${progress.days_since_earliest_study_session.required} days
            ${progress.days_since_earliest_study_session.current >= progress.days_since_earliest_study_session.required ? "✅" : "❌"}
          </li>
          <li>
            Days since earliest graded assignment:
            ${progress.days_since_earliest_graded_assignment.current}/${progress.days_since_earliest_graded_assignment.required} days
            ${progress.days_since_earliest_graded_assignment.current >= progress.days_since_earliest_graded_assignment.required ? "✅" : "❌"}
          </li>
          <li>
            Total study time:
            ${progress.total_study_hours.current}/${progress.total_study_hours.required} hours
            ${progress.total_study_hours.current >= progress.total_study_hours.required ? "✅" : "❌"}
          </li>
          <li>
            Graded assignments with at least one study session:
            ${progress.graded_assignments_with_sessions.current}/${progress.graded_assignments_with_sessions.required}
            ${progress.graded_assignments_with_sessions.current >= progress.graded_assignments_with_sessions.required ? "✅" : "❌"}
          </li>
        </ul>

        <p><strong>Current assignment stats:</strong></p>
        <ul>
          <li>${progress.graded_assignments.current}/${progress.graded_assignments_with_sessions.required} graded assignments</li>
          <li>${progress.assignments_with_sessions.current}/${progress.graded_assignments_with_sessions.required} assignments with at least one study session</li>
        </ul>
      </div>
    `;
  }

  function renderEffortAllocationFront(progress, representative) {
    const hasNoClasses = progress.classes.current === 0;

    if (hasNoClasses) {
      return `
        <div class="chart-empty">
          <p><strong>Not enough data yet</strong></p>
          <p><em>Per-class requirements:</em></p>
          <ul>
            <li>≥ 2 completed study sessions per class</li>
          </ul>
        </div>
      `;
    }

    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        ${representative ? `<p><em>Currently showing: ${representative.class_name}</em></p>` : ''}
        <ul>
        ${representative ? `
        <p><strong>Best available class so far:</strong></p>
        <ul>
            <li>${representative.completed_sessions}/2 completed study sessions</li>
        </ul>
        ` : ''}

          <li>
            Total classes:
            ${progress.classes.current}/${progress.classes.required}
            ${progress.classes.current >= progress.classes.required ? "✅" : "❌"}
          </li>
          <li>
            Total completed study sessions:
            ${progress.completed_study_sessions_total.current}/${progress.completed_study_sessions_total.required}
            ${progress.completed_study_sessions_total.current >= progress.completed_study_sessions_total.required ? "✅" : "❌"}
          </li>
          <li>
            Total study time:
            ${progress.total_study_hours.current}/${progress.total_study_hours.required} hours
            ${progress.total_study_hours.current >= progress.total_study_hours.required ? "✅" : "❌"}
          </li>
        </ul>
      </div>
    `;
  }

  function renderEffortAllocationBack(ineligibleClasses) {
    return `
      <p><strong>Why some classes are missing:</strong></p>
      <ul>
        ${ineligibleClasses
          .map(c => `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`)
          .join("")}
      </ul>
    `;
  }

  function renderOutcomeContributionFront(progress, representative) {
    const hasNoClasses = progress.classes_with_grades.current === 0;

    if (hasNoClasses) {
      return `
        <div class="chart-empty">
          <p><strong>Not enough data yet</strong></p>
          <p><em>Per-class requirements:</em></p>      
          <ul>
            <li>≥ 2 graded assignments per class</li>
          </ul>
        </div>
      `;
    }

    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        ${representative ? `<p><em>Currently showing: ${representative.class_name}</em></p>` : ''}
        ${representative ? `
        <p><strong>Best available class so far:</strong></p>
        <ul>
            <li>${representative.graded_count}/2 graded assignments</li>
        </ul>
        ` : ''}

        <ul>
          <li>
            Classes with graded assignments:
            ${progress.classes_with_grades.current}/${progress.classes_with_grades.required}
            ${progress.classes_with_grades.current >= progress.classes_with_grades.required ? "✅" : "❌"}
          </li>
          <li>
            Total graded assignments:
            ${progress.graded_assignments_total.current}/${progress.graded_assignments_total.required}
            ${progress.graded_assignments_total.current >= progress.graded_assignments_total.required ? "✅" : "❌"}
          </li>
        </ul>
      </div>
    `;
  }

  function renderOutcomeContributionBack(ineligibleClasses) {
    return `
      <p><strong>Why some classes are missing:</strong></p>
      <ul>
        ${ineligibleClasses
          .map(c => `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`)
          .join("")}
      </ul>
    `;
  }

  // =================== GRAPH 1: Time Spent vs Expected Time ===================

  const spentCanvas = document.getElementById('eff-1-canvas');
  const spentCtx = spentCanvas.getContext('2d');
  const spentCard = spentCanvas.closest('.graph-card');

  const spentRes = await fetch('/charts/dashboard/spent_vs_expected_time');
  const spentData = await spentRes.json();

  if (gateChart(spentCard, spentData, renderTimeSpentFront, renderTimeSpentBack)) {
    new Chart(spentCtx, {
      type: 'bar',
      data: {
        labels: spentData.labels,
        datasets: [
          {
            label: 'Actual Time',
            data: spentData.actual,
            backgroundColor: getThemeColor('#3b82f6', '#60a5fa'),
            borderColor: '#2563eb',
            borderWidth: 1
          },
          {
            label: 'Expected Time',
            data: spentData.expected,
            backgroundColor: '#f59e0b',
            borderColor: '#d97706',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutCubic'
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Time (minutes)' },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label(context) {
                const label = context.dataset.label;
                const value = context.parsed.y;
                const hours = (value / 60).toFixed(1);
                return `${label}: ${value} min (~${hours}h)`;
              }
            }
          }
        }
      }
    });
  }

  // =================== GRAPH 2: Marginal Returns Curve ===================

  const marginalCanvas = document.getElementById('eff-2-canvas');
  const marginalCtx = marginalCanvas.getContext('2d');
  const marginalCard = marginalCanvas.closest('.graph-card');

  const marginalRes = await fetch('/charts/dashboard/marginal_returns_curve');
  const marginalData = await marginalRes.json();

  if (gateChart(marginalCard, marginalData, renderMarginalReturnsFront, null)) {
    new Chart(marginalCtx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Grade Performance',
            data: marginalData.points.map(p => ({ x: p.effort, y: p.outcome })),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#10b981'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutCubic'
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Cumulative Study Time (minutes)' },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          },
          y: {
            min: 0,
            max: 100,
            title: { display: true, text: 'Grade (%)' },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const effort = context.parsed.x;
                const outcome = context.parsed.y;
                const hours = (effort / 60).toFixed(1);
                return `Study Time: ${effort} min (~${hours}h), Grade: ${outcome}%`;
              }
            }
          }
        }
      }
    });
  }

  // =================== GRAPH 3: Effort Allocation ===================

  const allocationCanvas = document.getElementById('eff-3-canvas');
  const allocationCtx = allocationCanvas.getContext('2d');
  const allocationCard = allocationCanvas.closest('.graph-card');

  const allocationRes = await fetch('/charts/dashboard/effort_allocation');
  const allocationData = await allocationRes.json();

  if (gateChart(allocationCard, allocationData, renderEffortAllocationFront, renderEffortAllocationBack)) {
    new Chart(allocationCtx, {
      type: 'doughnut',
      data: {
        labels: allocationData.labels,
        datasets: [
          {
            data: allocationData.values.map(v => Math.round(v * 1000) / 10),
            backgroundColor: allocationData.colors,
            borderWidth: 2,
            borderColor: '#fff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutCubic'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 8 }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${context.parsed}%`;
              }
            }
          }
        }
      }
    });
  }

  // =================== GRAPH 4: Outcome Contribution ===================

  const outcomeCanvas = document.getElementById('eff-4-canvas');
  const outcomeCtx = outcomeCanvas.getContext('2d');
  const outcomeCard = outcomeCanvas.closest('.graph-card');

  const outcomeRes = await fetch('/charts/dashboard/outcome_contribution');
  const outcomeData = await outcomeRes.json();

  if (gateChart(outcomeCard, outcomeData, renderOutcomeContributionFront, renderOutcomeContributionBack)) {
    new Chart(outcomeCtx, {
      type: 'doughnut',
      data: {
        labels: outcomeData.labels,
        datasets: [
          {
            data: outcomeData.values.map(v => (v * 100).toFixed(1)),
            backgroundColor: outcomeData.colors,
            borderWidth: 2,
            borderColor: '#fff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutCubic'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 8 }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${context.parsed}%`;
              }
            }
          }
        }
      }
    });
  }

});
