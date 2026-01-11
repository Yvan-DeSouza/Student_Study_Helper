import { gateChart } from './chart_gatekeeper.js';
document.addEventListener('DOMContentLoaded', async () => {
  
  
  function getThemeColor(lightColor, darkColor) {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? darkColor : lightColor;
  }
  
  // =================== GRAPH 1: Deadline Proximity Distribution ===================
  const deadlineCanvas = document.getElementById('risk-1-canvas');
  const deadlineCtx = deadlineCanvas.getContext('2d');
  const deadlineRes = await fetch('/charts/dashboard/deadline_proximity_distribution');
  const deadlineData = await deadlineRes.json();
  const deadlineCard = deadlineCanvas.closest('.graph-card');
  console.log(deadlineData.front_message)
  if (gateChart(deadlineCard, deadlineData, deadlineData.front_message, deadlineData.back_message)) {
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
  new Chart(breakdownCtx, {
    type: 'bar',
    data: {
      labels: breakdownData.labels,
      datasets: breakdownData.datasets
    },
    options: {
      indexAxis: 'y',  // Horizontal bars
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

  
  // =================== GRAPH 3: Risk Composition Evolution ===================
  const compositionCanvas = document.getElementById('risk-3-canvas');
  const compositionWrapper = compositionCanvas.parentElement;
  const compositionCtx = compositionCanvas.getContext('2d');
  const compositionCard = compositionCanvas.closest('.graph-card');
  const compositionRes = await fetch('/charts/dashboard/risk_composition_evolution');
  const compositionData = await compositionRes.json();
    

      
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

  
    // =================== GRAPH 4: Urgency vs Risk Matrix ===================
    const matrixCanvas = document.getElementById('risk-4-canvas');
    const matrixWrapper = matrixCanvas.parentElement;
    const matrixCtx = matrixCanvas.getContext('2d');
    const matrixCard = matrixCanvas.closest('.graph-card')

    const matrixRes = await fetch('/charts/dashboard/urgency_risk_matrix');
    const matrixData = await matrixRes.json();

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


});