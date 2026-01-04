document.addEventListener('DOMContentLoaded', async () => {
    const charts = {};



  
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
    
    // =================== GRAPH 1: Time Spent vs Expected Time ===================
    const spentCanvas = document.getElementById('eff-1-canvas');
    const spentWrapper = spentCanvas.parentElement;
    const spentCtx = spentCanvas.getContext('2d');
    
    try {
        const spentRes = await fetch('/charts/dashboard/spent_vs_expected_time');
        const spentData = await spentRes.json();
        
        if (spentData.empty) {
            showEmptyMessage(spentWrapper, spentData.message || 'Insufficient data');
        } else {
            clearEmptyMessage(spentWrapper);
        
            if (charts.spent) charts.spent.destroy();
            charts.spent = new Chart(spentCtx, {
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
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    scales: {
                        x: {
                        grid: { display: false }
                        },
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
                                label: function(context) {
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
    } catch (error) {
        showEmptyMessage(spentWrapper, 'Error loading data');
        console.error('Spent vs Expected error:', error);
    }
    
    // =================== GRAPH 2: Marginal Returns Curve ===================
    const marginalCanvas = document.getElementById('eff-2-canvas');
    const marginalWrapper = marginalCanvas.parentElement;
    const marginalCtx = marginalCanvas.getContext('2d');
    
    try {
        const marginalRes = await fetch('/charts/dashboard/marginal_returns_curve');
        const marginalData = await marginalRes.json();
        
        if (marginalData.empty) {
        showEmptyMessage(marginalWrapper, marginalData.message || 'Insufficient data');
        } else {
            clearEmptyMessage(marginalWrapper);

            if (charts.marginal) charts.marginal.destroy();
            charts.marginal = new Chart(marginalCtx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Grade Performance',
                        data: marginalData.points.map(p => ({ x: p.effort, y: p.outcome })),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#10b981'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
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
                                label: function(context) {
                                    const effort = context.parsed.x;
                                    const outcome = context.parsed.y;
                                    const hours = (effort / 60).toFixed(1);
                                    return [
                                        `Study Time: ${effort} min (~${hours}h)`,
                                        `Grade: ${outcome}%`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        showEmptyMessage(marginalWrapper, 'Error loading data');
        console.error('Marginal Returns error:', error);
    }
  
  // =================== GRAPH 3: Effort Allocation ===================
    const allocationCanvas = document.getElementById('eff-3-canvas');
    const allocationWrapper = allocationCanvas.parentElement;
    const allocationCtx = allocationCanvas.getContext('2d');
    
    try {
        const allocationRes = await fetch('/charts/dashboard/effort_allocation');
        const allocationData = await allocationRes.json();
    
        if (allocationData.empty) {
            showEmptyMessage(allocationWrapper, allocationData.message || 'Insufficient data');
        } else {
            clearEmptyMessage(allocationWrapper);
            if (charts.allocation) charts.allocation.destroy();
            charts.allocation = new Chart(allocationCtx, {
                type: 'doughnut',
                data: {
                    labels: allocationData.labels,
                    datasets: [{
                        data: allocationData.values.map(v => Math.round(v * 1000) / 10),
                        backgroundColor: allocationData.colors,
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12, padding: 8 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label;
                                    const value = context.parsed;
                                    return `${label}: ${value}%`;
                                }
                            }
                        }
                    }
                }
            });
        } 
    } catch (error) {
        showEmptyMessage(allocationWrapper, 'Error loading data');
        console.error('Effort Allocation error:', error);
    }


    // =================== GRAPH 4: Outcome Contribution ===================
    const outcomeCanvas = document.getElementById('eff-4-canvas');
    const outcomeWrapper = outcomeCanvas.parentElement;
    const outcomeCtx = outcomeCanvas.getContext('2d');
    try {
        const outcomeRes = await fetch('/charts/dashboard/outcome_contribution');
        const outcomeData = await outcomeRes.json();
        if (outcomeData.empty) {
            showEmptyMessage(outcomeWrapper, outcomeData.message || 'Insufficient data');
        } else {
            clearEmptyMessage(outcomeWrapper);
            
            if (charts.outcome) charts.outcome.destroy();
            charts.outcome = new Chart(outcomeCtx, {
                type: 'doughnut',
                data: {
                labels: outcomeData.labels,
                datasets: [{
                    data: outcomeData.values.map(v => (v * 100).toFixed(1)),
                    backgroundColor: outcomeData.colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12, padding: 8 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label;
                                    const value = context.parsed;
                                    return `${label}: ${value}%`;
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
    showEmptyMessage(outcomeWrapper, 'Error loading data');
    console.error('Outcome Contribution error:', error);
    }

});
