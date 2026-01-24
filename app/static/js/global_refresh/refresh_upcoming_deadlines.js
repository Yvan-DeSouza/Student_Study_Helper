// This function works for ANY page - it's page-agnostic
export async function refreshUpcomingDeadlines(pageId) {
    console.log(`[Deadlines] Refreshing for page: ${pageId}`);
    
    const loading = document.getElementById(`deadlines-loading-${pageId}`);
    const content = document.getElementById(`deadlines-content-${pageId}`);
    
    if (!loading || !content) {
        console.warn("[Deadlines] Elements not found for page:", pageId);
        return;
    }
    
    // Show loading state
    loading.classList.remove('hidden');
    
    try {
        // Get current count preference
        const input = document.getElementById(`deadlines-count-input-${pageId}`);
        const count = input ? parseInt(input.value) : 3;
        
        // Fetch fresh data
        const url = `/api/upcoming-deadlines?count=${count}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch deadlines');
        }
        
        const data = await response.json();
        
        // Re-render
        renderDeadlines(data, pageId);
        
    } catch (error) {
        console.error('[Deadlines] Refresh error:', error);
        content.innerHTML = `<p class="error-message">Error loading deadlines</p>`;
    } finally {
        loading.classList.add('hidden');
    }
}

function renderDeadlines(data, pageId) {
    const content = document.getElementById(`deadlines-content-${pageId}`);
    if (!content) return;
    
    const { assignments, requested, total_uncompleted } = data;
    const assignmentTypeColors = data.assignment_type_colors || {};
    
    if (total_uncompleted === 0) {
        content.innerHTML = '<div class="deadlines-empty"><p class="congratulations">🎉 Congratulations, you have no assignments to finish!</p></div>';
        return;
    }
    
    if (assignments.length > 0) {
        const tableHTML = `
            <div class="deadlines-table-container">
                <table class="deadlines-table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Assignment</th>
                            <th>Type</th>
                            <th>Due Date</th>
                            <th>Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assignments.map(a => renderRow(a, assignmentTypeColors)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        content.innerHTML = tableHTML;
        
        if (requested > assignments.length) {
            content.innerHTML += `<p class="deadlines-warning">Unable to show the next ${requested} upcoming deadlines because you only have ${total_uncompleted} uncompleted assignment${total_uncompleted !== 1 ? 's' : ''}.</p>`;
        }
    } else {
        content.innerHTML = '<p class="deadlines-info">No deadlines to display.</p>';
    }
}

function renderRow(assignment, typeColors) {
    const statusClass = assignment.status;
    const dueDate = assignment.due_at ? formatDate(assignment.due_at) : 'No due date';
    const progress = assignment.study_minutes && assignment.estimated_minutes
        ? Math.round((assignment.study_minutes / assignment.estimated_minutes) * 100)
        : 0;
    const tooltipText = generateTooltip(assignment);
    const typeColor = typeColors[assignment.assignment_type] || '#4b8df2';
    
    return `
        <tr class="deadline-row ${statusClass}" data-assignment-id="${assignment.assignment_id}">
            <td>
                <span class="class-badge" style="background-color: ${assignment.class_color}20; color: black; border: 1px solid black;">
                    ${escapeHtml(assignment.class_name)}
                </span>
            </td>
            <td class="assignment-title">${escapeHtml(assignment.title)}</td>
            <td>
                <span class="type-badge" style="background-color: ${typeColor}20; color: black; border: 1px solid black;">
                    ${formatType(assignment.assignment_type)}
                </span>
            </td>
            <td class="due-date">${dueDate}</td>
            <td class="progress-cell" title="${tooltipText}">
                <div class="progress-info">
                    <span class="progress-text">${assignment.study_minutes} / ${assignment.estimated_minutes} min</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <span class="progress-percentage">${progress}%</span>
                </div>
            </td>
        </tr>
    `;
}

function generateTooltip(assignment) {
    const sessionText = assignment.study_session_count === 1 ? 'session' : 'sessions';
    const estimateSource = assignment.is_user_estimate ? 'according to you' : 'according to us';
    const completionPercentage = assignment.estimated_minutes > 0
        ? Math.round((assignment.study_minutes / assignment.estimated_minutes) * 100)
        : 0;
    
    return `Study sessions for this assignment: ${assignment.study_session_count}
Total study time: ${assignment.study_minutes} minutes
Estimated required time to finish (${estimateSource}): ${assignment.estimated_minutes} minutes
Estimated completion percentage: ${completionPercentage}%`;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const formatted = date.toLocaleDateString('en-US', options);
    
    if (diffHours < 0) {
        return `${formatted} (overdue)`;
    } else if (diffHours < 24) {
        return `${formatted} (${Math.round(diffHours)}h left)`;
    } else if (diffDays < 7) {
        return `${formatted} (${Math.round(diffDays)}d left)`;
    }
    
    return formatted;
}

function formatType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}