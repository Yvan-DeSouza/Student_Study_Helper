// Page-specific animation logic for assignments page

function isElementVisible(el) {
    return !el.classList.contains('hidden');
}

function hideWithAnimation(el) {
    if (el.classList.contains('hidden') || el.dataset.hiding === 'true') return;
    
    el.dataset.hiding = 'true';
    el.style.transition = 'transform 200ms ease, opacity 200ms ease';
    el.style.opacity = '0';
    el.style.transform = 'scale(0.98)';
    
    const onEnd = (e) => {
        if (e && e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
        el.classList.add('hidden');
        el.style.transition = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.dataset.hiding = '';
        el.removeEventListener('transitionend', onEnd);
    };
    
    el.addEventListener('transitionend', onEnd);
    // Fallback in case transitionend doesn't fire
    setTimeout(() => {
        if (el.dataset.hiding === 'true') {
            onEnd();
        }
    }, 250);
}

function showWithAnimation(el) {
    if (!el.classList.contains('hidden')) return;
    
    el.classList.remove('hidden');
    el.style.opacity = '0';
    el.style.transform = 'scale(0.98)';
    
    void el.offsetWidth; // Force reflow
    
    requestAnimationFrame(() => {
        el.style.transition = 'transform 250ms ease, opacity 220ms ease';
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
    });
    
    const onEnd = () => {
        el.style.transition = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.removeEventListener('transitionend', onEnd);
    };
    
    el.addEventListener('transitionend', onEnd);
    // Fallback
    setTimeout(() => {
        onEnd();
    }, 300);
}

function showNoAssignmentsMessage(container, layout) {
    const existing = container.querySelector('.no-assignments-message');
    if (existing) return; // Already showing
    
    const message = document.createElement('div');
    message.className = 'no-assignments-message card';
    message.innerHTML = `
        <div class="card-body">
            <p><strong>No assignments match your current filters.</strong></p>
            <p>Try adjusting your filter settings or add some new assignments.</p>
        </div>
    `;
    
    // Add with animation
    message.style.opacity = '0';
    message.style.transform = 'scale(0.95)';
    container.appendChild(message);
    
    requestAnimationFrame(() => {
        message.style.transition = 'transform 250ms ease, opacity 220ms ease';
        message.style.opacity = '1';
        message.style.transform = 'scale(1)';
    });
}

function hideNoAssignmentsMessage(container) {
    const message = container.querySelector('.no-assignments-message');
    if (!message) return;
    
    message.style.transition = 'transform 200ms ease, opacity 200ms ease';
    message.style.opacity = '0';
    message.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        message.remove();
    }, 200);
}

export function applyAssignmentOrdering(container, allItems, data, layout) {
    if (layout === 'single') {
        applySingleTableOrdering(container, allItems, data);
    } else {
        applyPerClassOrdering(container, allItems, data);
    }
}

function applySingleTableOrdering(container, allItems, data) {
    const singleCard = container.querySelector('[data-table-mode="single"]');
    if (!singleCard) return;
    
    const tbody = singleCard.querySelector('tbody');
    if (!tbody) return;
    
    // Build map of all rows by assignment ID
    const assignmentMap = new Map(
        allItems.map(row => [String(row.dataset.assignmentId), row])
    );
    
    // Get ordered visible rows from API response
    const orderedVisibleRows = data.assignments
        .map(a => assignmentMap.get(String(a.assignment_id)))
        .filter(Boolean);
    
    const visibleSet = new Set(orderedVisibleRows);
    
    // Hide rows that shouldn't be visible
    allItems.forEach(row => {
        const shouldShow = visibleSet.has(row);
        if (shouldShow) {
            showWithAnimation(row);
        } else {
            hideWithAnimation(row);
        }
    });
    
    // Reorder visible rows in tbody
    orderedVisibleRows.forEach(row => {
        tbody.appendChild(row);
    });
    
    // Show/hide no assignments message
    if (orderedVisibleRows.length === 0) {
        showNoAssignmentsMessage(singleCard, 'single');
    } else {
        hideNoAssignmentsMessage(singleCard);
    }
}

function applyPerClassOrdering(container, allItems, data) {
    const perClassWrapper = container.querySelector('[data-table-mode="per_class"]');
    if (!perClassWrapper) return;
    
    // Build map of all per-class cards by class ID
    const classCardMap = new Map();
    allItems.forEach(card => {
        // Prefer data-class-id attribute, fallback to extracting from first row
        const classId = card.dataset.classId || 
                       (card.querySelector('tbody tr')?.dataset.classId);
        if (classId) {
            classCardMap.set(String(classId), card);
        }
    });
    
    // Track which cards should be visible
    const visibleCardIds = new Set();
    const orderedVisibleCards = [];
    
    // Process each class from API response
    data.classes.forEach(cls => {
        const classId = String(cls.class_id);
        const card = classCardMap.get(classId);
        
        if (!card) return;
        
        const tbody = card.querySelector('tbody');
        if (!tbody) return;
        
        // Build map of rows in this card
        const rowMap = new Map(
            [...tbody.querySelectorAll('tr')].map(row => [String(row.dataset.assignmentId), row])
        );
        
        // Get ordered rows for this class
        const orderedRows = cls.assignments
            .map(a => rowMap.get(String(a.assignment_id)))
            .filter(Boolean);
        
        if (orderedRows.length === 0) {
            // No assignments in this class - hide the card
            hideWithAnimation(card);
            return;
        }
        
        // This card should be visible
        visibleCardIds.add(classId);
        orderedVisibleCards.push(card);
        
        // Clear and rebuild tbody with ordered rows
        tbody.innerHTML = '';
        orderedRows.forEach(row => {
            row.classList.remove('hidden');
            row.style.opacity = '';
            row.style.transform = '';
            tbody.appendChild(row);
        });
        
        // Show the card
        showWithAnimation(card);
    });
    
    // Hide cards that aren't in the visible set
    allItems.forEach(card => {
        const classId = card.dataset.classId || 
                       (card.querySelector('tbody tr')?.dataset.classId);
        if (classId && !visibleCardIds.has(String(classId))) {
            hideWithAnimation(card);
        }
    });
    
    // IMPORTANT: Reorder visible cards in the wrapper without duplicating
    // First, remove all visible cards from wrapper to prevent duplicates
    orderedVisibleCards.forEach(card => {
        if (card.parentElement === perClassWrapper) {
            card.remove();
        }
    });
    
    // Then re-append in order
    orderedVisibleCards.forEach(card => {
        perClassWrapper.appendChild(card);
    });
    
    // Show/hide no assignments message
    if (orderedVisibleCards.length === 0) {
        showNoAssignmentsMessage(perClassWrapper, 'per_class');
    } else {
        hideNoAssignmentsMessage(perClassWrapper);
    }
}