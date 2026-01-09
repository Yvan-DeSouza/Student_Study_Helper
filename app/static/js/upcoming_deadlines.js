// static/js/upcoming_deadlines.js

class UpcomingDeadlines {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }
    
    this.currentCount = null;
    this.init();
  }

  async init() {
    await this.render();
    await this.loadDeadlines();
  }

  render() {
    this.container.innerHTML = `
      <div class="upcoming-deadlines-header">
        <h3>Upcoming Deadlines</h3>
        
        <div class="deadline-legend">
          <span class="legend-item">
            <span class="legend-dot overdue"></span>
            <span class="legend-text">Overdue</span>
          </span>
          <span class="legend-item">
            <span class="legend-dot soon"></span>
            <span class="legend-text">Due soon (&lt;2 days)</span>
          </span>
          <span class="legend-item">
            <span class="legend-dot normal"></span>
            <span class="legend-text">Normal</span>
          </span>
        </div>

        <div class="deadline-controls">
          <label class="control-label">Choose how many upcoming assignments you want to see:</label>
          <div class="control-row">
            <input 
              type="number" 
              id="deadlines-count-input" 
              class="input-field" 
              min="0" 
              max="10" 
              value="3"
              style="width: 80px; padding: 8px;"
            >
            <button class="btn-tiny" id="set-deadlines-count">Set amount</button>
          </div>
        </div>
      </div>

      <div class="deadlines-table-wrapper">
        <div id="deadlines-loading" class="deadlines-loading hidden">
          Loading deadlines...
        </div>
        
        <div id="deadlines-content"></div>
      </div>
    `;

    // Attach event listeners
    document.getElementById('set-deadlines-count').addEventListener('click', () => {
      this.updateCount();
    });
    
    document.getElementById('deadlines-count-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.updateCount();
      }
    });
  }

  async loadDeadlines(count = null) {
    const loading = document.getElementById('deadlines-loading');
    const content = document.getElementById('deadlines-content');
    
    loading.classList.remove('hidden');
    
    try {
      const url = count !== null 
        ? `/api/upcoming-deadlines?count=${count}`
        : '/api/upcoming-deadlines';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load deadlines');
      }
      
      this.renderDeadlines(data);
      
      // Update input field if we got data
      if (count === null && data.requested !== undefined) {
        document.getElementById('deadlines-count-input').value = data.requested;
      }
      
    } catch (error) {
      console.error('Error loading deadlines:', error);
      content.innerHTML = `<p class="error-message">Error loading deadlines: ${error.message}</p>`;
    } finally {
      loading.classList.add('hidden');
    }
  }

  renderDeadlines(data) {
    const content = document.getElementById('deadlines-content');
    const { assignments, requested, total_uncompleted } = data;
    
    // No uncompleted assignments
    if (total_uncompleted === 0) {
      content.innerHTML = `
        <div class="deadlines-empty">
          <p class="congratulations">🎉 Congratulations, you have no assignments to finish!</p>
        </div>
      `;
      return;
    }
    
    // Show available assignments
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
              ${assignments.map(a => this.renderRow(a)).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      content.innerHTML = tableHTML;
      
      // Show message if requested more than available
      if (requested > assignments.length) {
        const diff = requested - assignments.length;
        content.innerHTML += `
          <p class="deadlines-warning">
            Unable to show the next ${requested} upcoming deadlines because you only have ${total_uncompleted} uncompleted assignment${total_uncompleted !== 1 ? 's' : ''}.
          </p>
        `;
      }
    } else {
      // Requested 0 or some other edge case
      content.innerHTML = `<p class="deadlines-info">No deadlines to display.</p>`;
    }
  }

  renderRow(assignment) {
    const statusClass = assignment.status; // overdue, soon, normal
    const dueDate = assignment.due_at 
      ? this.formatDate(assignment.due_at)
      : 'No due date';
    
    const progress = assignment.study_minutes && assignment.estimated_minutes
      ? Math.round((assignment.study_minutes / assignment.estimated_minutes) * 100)
      : 0;
    
    const tooltipText = this.generateTooltip(assignment);
    
    return `
      <tr class="deadline-row ${statusClass}" data-assignment-id="${assignment.assignment_id}">
        <td>
          <span class="class-badge" style="background-color: ${assignment.class_color}20; color: ${assignment.class_color}; border: 1px solid ${assignment.class_color};">
            ${assignment.class_name}
          </span>
        </td>
        <td class="assignment-title">${this.escapeHtml(assignment.title)}</td>
        <td>
          <span class="type-badge">${this.formatType(assignment.assignment_type)}</span>
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

  generateTooltip(assignment) {
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

  formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    // Format as readable date
    const options = { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    const formatted = date.toLocaleDateString('en-US', options);
    
    // Add relative time
    if (diffHours < 0) {
      return `${formatted} (overdue)`;
    } else if (diffHours < 24) {
      return `${formatted} (${Math.round(diffHours)}h left)`;
    } else if (diffDays < 7) {
      return `${formatted} (${Math.round(diffDays)}d left)`;
    }
    
    return formatted;
  }

  formatType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async updateCount() {
    const input = document.getElementById('deadlines-count-input');
    const count = parseInt(input.value);
    
    if (isNaN(count) || count < 0 || count > 10) {
      alert('Please enter a number between 0 and 10');
      return;
    }
    
    // Save preference to backend
    try {
      const response = await fetch('/api/user-preferences/deadlines-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save preference');
      }
      
      // Reload deadlines with new count
      await this.loadDeadlines(count);
      
    } catch (error) {
      console.error('Error updating count:', error);
      alert('Error saving preference. Please try again.');
    }
  }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
  const homeContainer = document.getElementById('upcoming-deadlines-home');
  const assignmentsContainer = document.getElementById('upcoming-deadlines-assignments');
  
  if (homeContainer) {
    new UpcomingDeadlines('upcoming-deadlines-home');
  }
  
  if (assignmentsContainer) {
    new UpcomingDeadlines('upcoming-deadlines-assignments');
  }
});