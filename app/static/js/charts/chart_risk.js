document.addEventListener('DOMContentLoaded', async () => {
  
  // Helper functions
  function showEmptyMessage(wrapper, message) {
    const existing = wrapper.querySelector('.chart-empty');
    if (existing) existing.remove();
    
    const empty = document.createElement('div');
    empty.className = 'chart-empty';
    empty.textContent = message;
    wrapper.appendChild(empty);
    
    const canvas = wrapper.querySelector('canvas');
    if (canvas) canvas.style.visibility = 'hidden';
  }
  
  function clearEmptyMessage(wrapper) {
    const empty = wrapper.querySelector('.chart-empty');
    if (empty) empty.remove();
    
    const canvas = wrapper.querySelector('canvas');
    if (canvas) canvas.style.visibility = 'visible';
  }
  
  function getThemeColor(lightColor, darkColor) {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? darkColor : lightColor;
  }
  
  // =================== GRAPH 1: Deadline Proximity Distribution ===================
  const deadlineCanvas = document.getElementById('risk-1-canvas');
  const deadlineWrapper = deadlineCanvas.parentElement;
  const deadlineCtx = deadlineCanvas.getContext('2d');
  
  try {
    const deadlineRes = await fetch('/charts/dashboard/deadline_proximity_distribution');
    const deadlineData = await deadlineRes.json();
    
    if (deadlineData.empty) {
      showEmptyMessage(deadlineWrapper, deadlineData.message || 'No upcoming deadlines');
    } else {
      clearEmptyMessage(deadlineWrapper);
      
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
  } catch (error) {
    showEmptyMessage(deadlineWrapper, 'Error loading data');
    console.error('Deadline Proximity error:', error);
  }
  
  // =================== GRAPH 2: Assignment Risk Breakdown ===================
  const breakdownCanvas = document.getElementById('risk-2-canvas');
  const breakdownWrapper = breakdownCanvas.parentElement;
  const breakdownCtx = breakdownCanvas.getContext('2d');
  
  try {
    const breakdownRes = await fetch('/charts/dashboard/assignment_risk_breakdown?mode=riskiest&limit=8');
    const breakdownData = await breakdownRes.json();
    
    if (breakdownData.empty) {
      showEmptyMessage(breakdownWrapper, breakdownData.message || 'No assignments to analyze');
    } else {
      clearEmptyMessage(breakdownWrapper);
      
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
    }
  } catch (error) {
    showEmptyMessage(breakdownWrapper, 'Error loading data');
    console.error('Assignment Risk Breakdown error:', error);
  }
  
  // =================== GRAPH 3: Risk Composition Evolution ===================
  const compositionCanvas = document.getElementById('risk-3-canvas');
  const compositionWrapper = compositionCanvas.parentElement;
  const compositionCtx = compositionCanvas.getContext('2d');
  
  try {
    const compositionRes = await fetch('/charts/dashboard/risk_composition_evolution');
    const compositionData = await compositionRes.json();
    
    if (compositionData.empty) {
      showEmptyMessage(compositionWrapper, compositionData.message || 'Insufficient data');
    } else {
      clearEmptyMessage(compositionWrapper);
      
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
  } catch (error) {
    showEmptyMessage(compositionWrapper, 'Error loading data');
    console.error('Risk Composition error:', error);
  }
  
    // =================== GRAPH 4: Urgency vs Risk Matrix ===================
    const matrixCanvas = document.getElementById('risk-4-canvas');
    const matrixWrapper = matrixCanvas.parentElement;
    const matrixCtx = matrixCanvas.getContext('2d');
    let matrixData;

    try {
    const matrixRes = await fetch('/charts/dashboard/urgency_risk_matrix');
    matrixData = await matrixRes.json();
    } catch (error) {
    showEmptyMessage(matrixWrapper, 'Error loading data');
    console.error('Urgency vs Risk Matrix error:', error);
    return;
    }


if (matrixData.empty) {
  showEmptyMessage(matrixWrapper, matrixData.message || 'No assignments');
} else {
  clearEmptyMessage(matrixWrapper);

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