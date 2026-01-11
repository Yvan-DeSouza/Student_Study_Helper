import { gateChart } from './chart_gatekeeper.js';
document.addEventListener('DOMContentLoaded', async () => {


  function renderPerformanceFront(progress, representative) {
    return `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        ${representative
          ? `<p><em>Currently showing: ${representative.class_name}</em></p>`
          : ""
        }
        <ul>
          <li>
            Minimum classes:
            ${progress.classes.current}/${progress.classes.required}
            ${progress.classes.current >= progress.classes.required ? "✅" : "❌"}
          </li>
          <li>
            Graded assignments per class:
            ${progress.graded_assignments.current}/${progress.graded_assignments.required}
            ${progress.graded_assignments.current >= progress.graded_assignments.required ? "✅" : "❌"}
          </li>
          <li>
            Time since first graded assignment:
            ${progress.weeks_since_first_grade.current}/${progress.weeks_since_first_grade.required} weeks
            ${progress.weeks_since_first_grade.current >= progress.weeks_since_first_grade.required ? "✅" : "❌"}
          </li>
        </ul>
      </div>
    `;
  }


  function renderPerformanceBack(ineligibleClasses) {
    return `
      <p><strong>Why some classes are hidden:</strong></p>
      <ul>
        ${ineligibleClasses.map(c =>
          `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`
        ).join("")}
      </ul>
    `;
  }


  
  // Get theme colors
  function getThemeColor(lightColor, darkColor) {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? darkColor : lightColor;
  }
  
  // =================== GRAPH 1: Rolling Grade Trend ===================
  const rollingCanvas = document.getElementById('perf-1-canvas');
  const rollingCtx = rollingCanvas.getContext('2d');
  
  const rollingRes = await fetch('/charts/dashboard/rolling_grade_trend');
  const rollingData = await rollingRes.json();
  const rollingCard = rollingCanvas.closest('.graph-card');

  if (gateChart(rollingCard, rollingData, renderPerformanceFront, renderPerformanceBack)) {
    new Chart(rollingCtx, {
      type: 'line',
      data: {
        datasets: rollingData.datasets.map(ds => ({
          ...ds,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
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
              min: rollingData.y_bounds.min,
              max: rollingData.y_bounds.max,
              title: { display: true, text: 'Rolling Average Grade (%)' },
              grid: { color: getThemeColor('#e5e7eb', '#374151') }
          }

        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}%`;
              }
            }
          }
        }
      }
    });
  }
    
    
  // =================== GRAPH 2: Performance Stability Index ===================
  const psiCanvas = document.getElementById('perf-3-canvas');
  const psiCard = psiCanvas.closest('.graph-card')
  const psiCtx = psiCanvas.getContext('2d');
  const psiRes = await fetch('/charts/dashboard/performance_stability_index');
  const psiData = await psiRes.json();
  const psiFront = (progress) => `
    <div class="chart-empty">
      <p><strong>Not enough data yet</strong></p>
      <ul>
        <li>
          Time since first graded assignment:
          ${progress.weeks_since_first_grade.current}/${progress.weeks_since_first_grade.required} weeks
          ${progress.weeks_since_first_grade.current >= progress.weeks_since_first_grade.required ? "✅" : "❌"}
        </li>
        <li>
          Number of graded assignments:
          ${progress.graded_assignments.current}/${progress.graded_assignments.required}
          ${progress.graded_assignments.current >= progress.graded_assignments.required ? "✅" : "❌"}
        </li>
        <li>
          Number of finished study sessions:
          ${progress.study_sessions.current}/${progress.study_sessions.required}
          ${progress.study_sessions.current >= progress.study_sessions.required ? "✅" : "❌"}
        </li>
      </ul>
    </div>
  `;

  if (gateChart(psiCard, psiData, psiFront, null)){
    new Chart(psiCtx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Stability Index',
          data: psiData.data,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutCubic' },
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
            min: 0,
            max: 100,
            title: { display: true, text: 'Stability Index (0-100)' },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `PSI: ${context.parsed.y}`;
              }
            }
          }
        }
      }
    });
  }


  
  // =================== GRAPH 3: Effort → Outcome Timeline ===================
  const effortCanvas = document.getElementById('perf-2-canvas');
  const effortCtx = effortCanvas.getContext('2d');
  const effortCard = effortCanvas.closest('.graph-card');
  const effortRes = await fetch('/charts/dashboard/effort_outcome_timeline');
  const effortData = await effortRes.json();

  const effortFront = (progress) => `
    <div class="chart-empty">
      <p><strong>Not enough data yet</strong></p>
      <ul>
        <li>
          Time since first graded assignment:
          ${progress.weeks_since_first_grade.current}/${progress.weeks_since_first_grade.required} weeks
          ${progress.weeks_since_first_grade.current >= progress.weeks_since_first_grade.required ? "✅" : "❌"}
        </li>
        <li>
          Number of graded assignments:
          ${progress.graded_assignments.current}/${progress.graded_assignments.required}
          ${progress.graded_assignments.current >= progress.graded_assignments.required ? "✅" : "❌"}
        </li>
        <li>
          Number of finished study sessions:
          ${progress.study_sessions.current}/${progress.study_sessions.required}
          ${progress.study_sessions.current >= progress.study_sessions.required ? "✅" : "❌"}
        </li>
      </ul>
    </div>
  `;


  if (gateChart(effortCard, effortData, effortFront, null)){
      
    new Chart(effortCtx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Study Time (min)',
            data: effortData.effort_data,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yAxisID: 'y',
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Grade (%)',
            data: effortData.grade_data,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            yAxisID: 'y1',
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
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
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Study Time (minutes)' },
            grid: { color: getThemeColor('#e5e7eb', '#374151') }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 100,
            title: { display: true, text: 'Grade (%)' },
            grid: { drawOnChartArea: false }
          }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label;
                const value = context.parsed.y;
                return value !== null ? `${label}: ${value}` : null;
              }
            }
          }
        }
      }
    });
  }

  
    const heatmapCanvas = document.getElementById('perf-4-canvas');
    const heatmapCtx = heatmapCanvas.getContext('2d');
    const heatmapCard = heatmapCanvas.closest('.graph-card');
    const heatmapRes = await fetch('/charts/dashboard/lag_correlation_heatmap');
    const heatmapData = await heatmapRes.json();

    const heatmapFront = (progress, representative) => `
      <div class="chart-empty">
        <p><strong>Not enough data yet</strong></p>
        ${representative
          ? `<p><em>Currently showing: ${representative.class_name}</em></p>`
          : ""
        }
        <ul>
          <li>
            Minimum classes:
            ${progress.classes.current}/${progress.classes.required}
            ${progress.classes.current >= progress.classes.required ? "✅" : "❌"}
          </li>
          <li>
            Graded assignments per class:
            ${progress.graded_assignments_per_class.current}/${progress.graded_assignments_per_class.required}
            ${progress.graded_assignments_per_class.current >= progress.graded_assignments_per_class.required ? "✅" : "❌"}
          </li>
          <li>
            Study sessions per class:
            ${progress.study_sessions_per_class.current}/${progress.study_sessions_per_class.required}
            ${progress.study_sessions_per_class.current >= progress.study_sessions_per_class.required ? "✅" : "❌"}
          </li>
          <li>
            Time since first graded assignment:
            ${progress.weeks_since_first_grade.current}/${progress.weeks_since_first_grade.required} weeks
            ${progress.weeks_since_first_grade.current >= progress.weeks_since_first_grade.required ? "✅" : "❌"}
          </li>
        </ul>
      </div>
    `;




    const heatmapBack = (ineligibleClasses) => `
      <p><strong>Why some classes are hidden:</strong></p>
      <ul>
        ${ineligibleClasses.map(c =>
          `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`
        ).join("")}
      </ul>
    `;

    if (gateChart(heatmapCard, heatmapData, heatmapFront, heatmapBack)) {

      const matrixData = [];
      heatmapData.data.forEach((row, classIdx) => {
        row.forEach((value, lagIdx) => {
          if (value !== null) {
            matrixData.push({
              x: heatmapData.lag_labels[lagIdx],
              y: heatmapData.class_labels[classIdx],
              v: value
            });
          }
        });
      });
      
      // Color function: blue (weak) to red (strong)
      function getColor(value) {
        if (value === null) return '#d1d5db';
        const intensity = Math.min(1, Math.abs(value));
        const hue = value >= 0 ? 0 : 240; // Red for positive, blue for negative
        const lightness = 90 - (intensity * 40); // Darker = stronger
        return `hsl(${hue}, 70%, ${lightness}%)`;
      }
      
      new Chart(heatmapCtx, {
        type: 'bar',
        data: {
          labels: heatmapData.lag_labels,
          datasets: heatmapData.class_labels.map((className, idx) => ({
            label: className,
            data: heatmapData.data[idx].map((val, lagIdx) => ({
              x: lagIdx,
              y: val !== null ? Math.abs(val) * 100 : 0,
              correlation: val
            })),
            backgroundColor: heatmapData.data[idx].map(val => 
              val !== null ? getColor(val) : '#d1d5db'
            )
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 600, easing: 'easeOutCubic' },
          indexAxis: 'x',
          scales: {
            x: {
              title: { display: true, text: 'Time Lag (weeks)' },
              grid: { display: false }
            },
            y: {
              min: 0,
              max: 100,
              title: { display: true, text: '|Correlation| (magnitude)' },
              grid: { color: getThemeColor('#e5e7eb', '#374151') }
            }
          },
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                title: function(context) {
                  return `${context[0].dataset.label} - ${context[0].label}`;
                },
                label: function(context) {
                  const corr = context.raw.correlation;
                  if (corr === null) return 'Insufficient data';
                  return `Correlation: ${corr.toFixed(3)}`;
                }
              }
            }
          }
        }
      });
    }

});