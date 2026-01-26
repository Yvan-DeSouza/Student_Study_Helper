

class UpcomingDeadlines {
  constructor(pageId) {
    this.pageId = pageId;
    this.currentCount = null;
    this.isDirty = false;
    this.assignmentTypeColors = {};
    this.init();
  }

  async init() {
    // Wait for the loadDeadlines() call to set the currentCount from backend
    await this.loadDeadlines(); 
    const input = document.getElementById(`deadlines-count-input-${this.pageId}`);
    if (input) {
        this.currentCount = parseInt(input.value);
    }
    this.isDirty = false;


    this.attachEventListeners();
    this.setupBeforeUnloadHandler();
  }

  attachEventListeners() {
    const setBtn = document.querySelector(`.set-deadlines-count[data-page="${this.pageId}"]`);
    const input = document.getElementById(`deadlines-count-input-${this.pageId}`);
   
    if (setBtn) {
      setBtn.addEventListener('click', () => this.handleSetAmount());
    }
   
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSetAmount();
        }
      });
     
      input.addEventListener('input', () => {
        const newCount = parseInt(input.value);
        if (!isNaN(newCount) && newCount !== this.currentCount) {
          this.isDirty = true;
        }
      });
    }
  }

  setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      if (this.isDirty) {
        this.saveCountToDatabase();
      }
    });
   
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.isDirty) {
        this.saveCountToDatabase();
      }
    });
  }

  async loadDeadlines(count = null) {
    const loading = document.getElementById(`deadlines-loading-${this.pageId}`);
    const content = document.getElementById(`deadlines-content-${this.pageId}`);
   
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
     
      this.assignmentTypeColors = data.assignment_type_colors || {};
      this.renderDeadlines(data);
     
      if (data.requested !== undefined) {
        const input = document.getElementById(`deadlines-count-input-${this.pageId}`);
        if (input) {
          input.value = data.requested;
        }
        this.currentCount = data.requested;
        this.isDirty = false;
      }
     
    } catch (error) {
      console.error('Error loading deadlines:', error);
      content.innerHTML = `<p class="error-message">Error loading deadlines: ${error.message}</p>`;
    } finally {
      loading.classList.add('hidden');
    }
  }

  renderDeadlines(data) {
    const content = document.getElementById(`deadlines-content-${this.pageId}`);
    if (!content) return;
   
    const { assignments, requested, total_uncompleted } = data;
   
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
              ${assignments.map(a => this.renderRow(a)).join('')}
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

  renderRow(assignment) {
    const statusClass = assignment.status;
    const dueDate = assignment.due_at ? this.formatDate(assignment.due_at) : 'No due date';
    const progress = assignment.study_minutes && assignment.estimated_minutes
      ? Math.round((assignment.study_minutes / assignment.estimated_minutes) * 100)
      : 0;
    const tooltipText = this.generateTooltip(assignment);
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

  formatType(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  handleSetAmount() {
    const input = document.getElementById(`deadlines-count-input-${this.pageId}`);
    const count = parseInt(input.value);
   
    if (isNaN(count) || count < 0 || count > 10) {
      this.showInvalidAmountModal();
      return;
    }
   
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
   
    const input = document.getElementById(`deadlines-count-input-${this.pageId}`);
    if (!input) return;
   
    const count = parseInt(input.value);
    if (isNaN(count) || count < 0 || count > 10) return;
   
    try {
      const data = JSON.stringify({ count });
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
        await fetch('/api/user-preferences/deadlines-count', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken 
           },
          body: data,
          keepalive: true
        });
        this.isDirty = false
      } catch (error) {
      console.error('Error saving count:', error);
    }
  }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('deadlines-content-home')) {
    new UpcomingDeadlines('home');
  }
 
  if (document.getElementById('deadlines-content-assignments')) {
    new UpcomingDeadlines('assignments');
  }
});