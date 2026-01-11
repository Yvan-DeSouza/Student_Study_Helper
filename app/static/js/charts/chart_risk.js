import { gateChart } from './chart_gatekeeper.js';
document.addEventListener('DOMContentLoaded', async () => {
 
  function getThemeColor(lightColor, darkColor) {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? darkColor : lightColor;
  }

  // =================== RENDER FUNCTIONS ===================
  
  function renderDeadlineProximityFront(progress) {
    const hasData = progress.incomplete_assignments_with_due.current >= progress.incomplete_assignments_with_due.required;
    const noIncomplete = progress.incomplete_assignments_with_due.current === 0;
    const hasWithoutDue = progress.incomplete_assignments_without_due.current > 0;
    
    if (noIncomplete && !hasWithoutDue) {
      return `
        <div class="chart-empty">
          <p><strong>🎉 You have no due assignments!</strong></p>
        </div>
      `;
    }
    
    if (noIncomplete && hasWithoutDue) {
      return `
        <div class="chart-empty">
          <p><strong>🎉 You have no due assignments!</strong></p>
          <p><em>⚠️ However, you have ${progress.incomplete_assignments_without_due.current} incomplete assignment(s) with no due date</em></p>
        </div>
      `;
    }
    
    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        <ul>
          <li>
            Incomplete assignments with due dates:
            ${progress.incomplete_assignments_with_due.current}/${progress.incomplete_assignments_with_due.required}
            ${progress.incomplete_assignments_with_due.current >= progress.incomplete_assignments_with_due.required ? "✅" : "❌"}
          </li>
        </ul>
        ${hasWithoutDue ? `<p><em>⚠️ Warning: You have ${progress.incomplete_assignments_without_due.current} incomplete assignment(s) with no due date</em></p>` : ''}
      </div>
    `;
  }

  function renderDeadlineProximityBack(progress) {
    if (progress.incomplete_assignments_without_due.current > 0) {
      return `
        <p><strong>Hidden assignments:</strong></p>
        <p>You have ${progress.incomplete_assignments_without_due.current} assignment(s) that are not shown because they do not have a due date.</p>
      `;
    }
    return null;
  }

  function renderRiskCompositionFront(progress) {
    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        <ul>
          <li>
            Total graded assignments:
            ${progress.graded_assignments.current}/${progress.graded_assignments.required}
            ${progress.graded_assignments.current >= progress.graded_assignments.required ? "✅" : "❌"}
          </li>

          <li>
            Days since earliest graded assignment:
            ${progress.days_since_earliest_graded.current}/${progress.days_since_earliest_graded.required} days
            ${progress.days_since_earliest_graded.current >= progress.days_since_earliest_graded.required ? "✅" : "❌"}
          </li>
        </ul>
      </div>
    `;
  }



  function renderRiskBreakdownFront(progress) {
    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        <ul>
          <li>
            Incomplete assignments with due dates:
            ${progress.incomplete_assignments_with_due.current}/${progress.incomplete_assignments_with_due.required}
            ${progress.incomplete_assignments_with_due.current >= progress.incomplete_assignments_with_due.required ? "✅" : "❌"}
          </li>
          <li>
            Graded assignments:
            ${progress.graded_assignments.current}/${progress.graded_assignments.required}
            ${progress.graded_assignments.current >= progress.graded_assignments.required ? "✅" : "❌"}
          </li>
        </ul>
      </div>
    `;
  }

function renderRiskBreakdownBack(progress) {
  const incompleteWithoutDue = progress.incomplete_assignments_without_due?.current || 0;
  if (incompleteWithoutDue > 0) {
    return `
      <p><strong>Hidden assignments:</strong></p>
      <p>You have ${incompleteWithoutDue} assignment(s) that are not shown because they do not have a due date.</p>
    `;
  }
  return null;
}


  function renderUrgencyMatrixFront(progress) {
    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        <ul>
          <li>
            Incomplete assignments with due dates:
            ${progress.incomplete_assignments_with_due.current}/${progress.incomplete_assignments_with_due.required}
            ${progress.incomplete_assignments_with_due.current >= progress.incomplete_assignments_with_due.required ? "✅" : "❌"}
          </li>
          <li>
            Different deadline dates:
            ${progress.different_deadline_dates.current}/${progress.different_deadline_dates.required}
            ${progress.different_deadline_dates.current >= progress.different_deadline_dates.required ? "✅" : "❌"}
          </li>
          <li>
            Graded assignments:
            ${progress.graded_assignments.current}/${progress.graded_assignments.required}
            ${progress.graded_assignments.current >= progress.graded_assignments.required ? "✅" : "❌"}
          </li>
        </ul>
      </div>
    `;
  }

  function renderUrgencyMatrixBack(progress) {
    const incompleteWithoutDue = progress.incomplete_assignments_without_due?.current || 0;
    if (incompleteWithoutDue > 0) {
      return `
        <p><strong>Hidden assignments:</strong></p>
        <p>You have ${progress.incomplete_assignments_without_due.current} assignment(s) that are not shown because they do not have a due date.</p>
      `;
    }
    return null;
  }
 
  // =================== GRAPH 1: Deadline Proximity Distribution ===================
  const deadlineCanvas = document.getElementById('risk-1-canvas');
  const deadlineCtx = deadlineCanvas.getContext('2d');
  const deadlineRes = await fetch('/charts/dashboard/deadline_proximity_distribution');
  const deadlineData = await deadlineRes.json();
  const deadlineCard = deadlineCanvas.closest('.graph-card');
  
  if (gateChart(deadlineCard, deadlineData, renderDeadlineProximityFront, renderDeadlineProximityBack)) {
    new Chart(deadlineCtx, {
      type: 'bar',
      data: {
        labels: deadlineData.labels,
        datasets: [{
          label: 'Assignment Count',
          data: deadlineData.counts,
          backgroundColor: [
            '#dc2626',  // Overdue - red
            '#f97316',  // 0-2 days - orange
            '#f59e0b',  // 3-5 days - amber
            '#3b82f6',  // 6-10 days - blue
            '#10b981'   // 10+ days - green
          ],
          borderWidth: 1,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutCubic' },
        scales: {
          x: {
            title: { display: true, text: 'Time Until Due' },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Number of Assignments' },
            ticks: { stepSize: 1 },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const count = context.parsed.y;
                const minutes = deadlineData.minutes[context.dataIndex];
                const hours = (minutes / 60).toFixed(1);
                return [
                  `${count} assignment${count !== 1 ? 's' : ''}`,
                  `~${hours} hours of work`
                ];
              }
            }
          }
        }
      }
    });
  }

  // =================== GRAPH 2: Assignment Risk Breakdown ===================
  const breakdownCanvas = document.getElementById('risk-2-canvas');
  const breakdownCtx = breakdownCanvas.getContext('2d');
  const breakdownCard = breakdownCanvas.closest('.graph-card');
  const breakdownRes = await fetch('/charts/dashboard/assignment_risk_breakdown?mode=riskiest&limit=8');
  const breakdownData = await breakdownRes.json();
  
  if (gateChart(breakdownCard, breakdownData, renderRiskBreakdownFront, renderRiskBreakdownBack)) {
    new Chart(breakdownCtx, {
      type: 'bar',
      data: {
        labels: breakdownData.labels,
        datasets: breakdownData.datasets
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutCubic' },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: 'Risk Score' },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          },
          y: {
            stacked: true,
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 8,
              font: { size: 10 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label;
                const value = context.parsed.x;
                return `${label}: ${value.toFixed(3)}`;
              }
            }
          }
        }
      }
    });
  }

  // =================== GRAPH 3: Risk Composition Evolution ===================
  const compositionCanvas = document.getElementById('risk-3-canvas');
  const compositionCtx = compositionCanvas.getContext('2d');
  const compositionCard = compositionCanvas.closest('.graph-card');
  const compositionRes = await fetch('/charts/dashboard/risk_composition_evolution');
  const compositionData = await compositionRes.json();
   
  if (gateChart(compositionCard, compositionData, renderRiskCompositionFront, null)) {
    new Chart(compositionCtx, {
      type: 'line',
      data: {
        datasets: compositionData.datasets.map(ds => ({
          ...ds,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutCubic' },
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'week',
              displayFormats: { week: 'MMM d' }
            },
            title: { display: true, text: 'Week' },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 1,
            title: { display: true, text: 'Risk Contribution' },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 8 }
          },
          tooltip: {
            mode: 'index',
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(3)}`;
              }
            }
          }
        }
      }
    });
  }

  // =================== GRAPH 4: Urgency vs Risk Matrix ===================
  const matrixCanvas = document.getElementById('risk-4-canvas');
  const matrixCtx = matrixCanvas.getContext('2d');
  const matrixCard = matrixCanvas.closest('.graph-card');
  const matrixRes = await fetch('/charts/dashboard/urgency_risk_matrix');
  const matrixData = await matrixRes.json();

  if (gateChart(matrixCard, matrixData, renderUrgencyMatrixFront, renderUrgencyMatrixBack)) {
    new Chart(matrixCtx, {
      type: 'bubble',
      data: {
        datasets: [{
          data: matrixData.data,
          backgroundColor: matrixData.data.map(d => d.backgroundColor)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutCubic' },
        scales: {
          x: {
            min: 0,
            max: 1,
            title: { display: true, text: 'Urgency (0 = distant, 1 = immediate)' }
          },
          y: {
            min: 0,
            max: 1,
            title: { display: true, text: 'Risk (0 = low, 1 = high)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => ctx[0]?.raw?.label || '',
              label: ctx => {
                const p = ctx.raw;
                return [
                  `Class: ${p.class_name}`,
                  `Urgency: ${(p.x * 100).toFixed(1)}%`,
                  `Risk: ${(p.y * 100).toFixed(1)}%`,
                  `Work: ${p.estimated_minutes} min`
                ];
              }
            }
          }
        }
      }
    });
  }
});