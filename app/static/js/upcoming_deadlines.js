// static/js/upcoming_deadlines.js

class UpcomingDeadlines {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }
    
    this.currentCount = null;
    this.isDirty = false; // Track if count has changed
    this.assignmentTypeColors = {};
    this.init();
  }

  async init() {
    await this.loadTemplate();
    await this.loadDeadlines();
    this.setupBeforeUnloadHandler();
  }

  async loadTemplate() {
    try {
      const response = await fetch('/static/html/partials/upcoming_deadlines.html');
      const html = await response.text();
      this.container.innerHTML = html;
      
      // Attach event listeners after loading template
      this.attachEventListeners();
    } catch (error) {
      console.error('Error loading template:', error);
      this.container.innerHTML = '<p class="error-message">Error loading upcoming deadlines.</p>';
    }
  }

  attachEventListeners() {
    const setBtn = document.getElementById('set-deadlines-count');
    const input = document.getElementById('deadlines-count-input');
    
    if (setBtn) {
      setBtn.addEventListener('click', () => this.handleSetAmount());
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSetAmount();
        }
      });
      
      // Track changes
      input.addEventListener('input', () => {
        const newCount = parseInt(input.value);
        if (!isNaN(newCount) && newCount !== this.currentCount) {
          this.isDirty = true;
        }
      });
    }
  }

  setupBeforeUnloadHandler() {
    // Save to database before leaving page/refreshing
    window.addEventListener('beforeunload', (e) => {
      if (this.isDirty) {
        this.saveCountToDatabase();
      }
    });
    
    // Handle visibility change (tab switch, minimize)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.isDirty) {
        this.saveCountToDatabase();
      }
    });
  }

  async loadDeadlines(count = null) {
    const loading = document.getElementById('deadlines-loading');
    const content = document.getElementById('deadlines-content');
    
    if (!loading || !content) return;
    
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
      
      // Store assignment type colors
      this.assignmentTypeColors = data.assignment_type_colors || {};
      
      this.renderDeadlines(data);
      
      // Update input field and current count
      if (data.requested !== undefined) {
        const input = document.getElementById('deadlines-count-input');
        if (input) {
          input.value = data.requested;
        }
        this.currentCount = data.requested;
        this.isDirty = false; // Reset dirty flag after successful load
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
    if (!content) return;
    
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
    const statusClass = assignment.status;
    const dueDate = assignment.due_at 
      ? this.formatDate(assignment.due_at)
      : 'No due date';
    
    const progress = assignment.study_minutes && assignment.estimated_minutes
      ? Math.round((assignment.study_minutes / assignment.estimated_minutes) * 100)
      : 0;
    
    const tooltipText = this.generateTooltip(assignment);
    
    // Get assignment type color
    const typeColor = this.assignmentTypeColors[assignment.assignment_type] || '#4b8df2';
    
    return `
      <tr class="deadline-row ${statusClass}" data-assignment-id="${assignment.assignment_id}">
        <td>
          <span class="class-badge" style="background-color: ${assignment.class_color}20; color: black; border: 1px solid black;">
            ${this.escapeHtml(assignment.class_name)}
          </span>
        </td>
        <td class="assignment-title">${this.escapeHtml(assignment.title)}</td>
        <td>
          <span class="type-badge" style="background-color: ${typeColor}20; color: black; border: 1px solid black;">
            ${this.formatType(assignment.assignment_type)}
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
    
    const options = { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
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

  formatType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleSetAmount() {
    const input = document.getElementById('deadlines-count-input');
    const count = parseInt(input.value);
    
    // Validate input
    if (isNaN(count) || count < 0 || count > 10) {
      this.showInvalidAmountModal();
      return;
    }
    
    // Mark as dirty and reload
    this.isDirty = true;
    this.loadDeadlines(count);
  }

  showInvalidAmountModal() {
    const modal = document.getElementById('invalidDeadlineAmountModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('active');
    }
  }

  async saveCountToDatabase() {
    if (!this.isDirty) return;
    
    const input = document.getElementById('deadlines-count-input');
    if (!input) return;
    
    const count = parseInt(input.value);
    if (isNaN(count) || count < 0 || count > 10) return;
    
    try {
      // Use sendBeacon for reliability during page unload
      const data = JSON.stringify({ count });
      const blob = new Blob([data], { type: 'application/json' });
      
      // Try sendBeacon first (more reliable for unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/user-preferences/deadlines-count', blob);
      } else {
        // Fallback to sync fetch
        await fetch('/api/user-preferences/deadlines-count', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: data,
          keepalive: true
        });
      }
      
      this.isDirty = false;
    } catch (error) {
      console.error('Error saving count:', error);
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