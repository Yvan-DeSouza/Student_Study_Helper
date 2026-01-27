function isElementVisible(el) {
    return !el.classList.contains('hidden');
}

function hideWithAnimation(el) {
    // If already hidden via class, nothing to do
    if (el.classList.contains('hidden') || el.dataset.hiding === 'true') return;
    el.dataset.hiding = 'true';
    // start transition to invisible
    el.style.transition = 'transform 200ms ease, opacity 200ms ease';
    el.style.opacity = 0;
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
}

function showWithAnimation(el) {
    // If already visible or already showing, just ensure visible
    if (!el.classList.contains('hidden')) return;
    el.classList.remove('hidden');
    // start hidden state
    el.style.opacity = 0;
    el.style.transform = 'scale(0.98)';
    // Force reflow
    void el.offsetWidth;
    requestAnimationFrame(() => {
        el.style.transition = 'transform 250ms ease, opacity 220ms ease';
        el.style.opacity = '';
        el.style.transform = '';
    });
    const onEnd = () => {
        el.style.transition = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.removeEventListener('transitionend', onEnd);
    };
    el.addEventListener('transitionend', onEnd);
}

function applyVisibilityAndOrder(container, allItems, orderedVisibleItems, currentSortBy) {
    let lastSortBy = null;
    const visibleSet = new Set(orderedVisibleItems);

    // Record positions of currently visible items (before changes)
    const previouslyVisible = allItems.filter(isElementVisible);
    const firstRects = new Map();
    previouslyVisible.forEach(el => firstRects.set(el, el.getBoundingClientRect()));

    // 1. Hide / show elements with animation
    allItems.forEach(el => {
        const shouldShow = visibleSet.has(el);
        if (shouldShow) {
            showWithAnimation(el);
        } else {
            hideWithAnimation(el);
        }
    });

    // 2. Always reorder to match desired order (so visible items appear in correct order)
    orderedVisibleItems.forEach(el => {
        container.appendChild(el);
    });

    lastSortBy = currentSortBy;

    // Compute last positions and animate changes (FLIP) for visible items
    const lastRects = new Map();
    orderedVisibleItems.forEach(el => lastRects.set(el, el.getBoundingClientRect()));

    orderedVisibleItems.forEach(el => {
        const first = firstRects.get(el);
        const last = lastRects.get(el);
        if (first) {
            const dx = first.left - last.left;
            const dy = first.top - last.top;
            if (dx !== 0 || dy !== 0) {
                el.style.transition = 'none';
                el.style.transform = `translate(${dx}px, ${dy}px)`;
                // Force reflow
                void el.offsetWidth;
                requestAnimationFrame(() => {
                    el.style.transition = 'transform 350ms ease';
                    el.style.transform = '';
                });
                const cleanup = () => {
                    el.style.transition = '';
                    el.removeEventListener('transitionend', cleanup);
                };
                el.addEventListener('transitionend', cleanup);
            }
        } else {
            // Newly visible: fade/scale in handled by showWithAnimation
        }
    });
}

function showNoAssignmentsMessage(container, layout) {
    // Remove existing message if any
    const existing = container.querySelector('.no-assignments-message');
    if (existing) existing.remove();

    const message = document.createElement('div');
    message.className = 'no-assignments-message card';
    message.innerHTML = `
        <div class="card-body">
            <p><strong>No assignments match your current filters.</strong></p>
            <p>Try adjusting your filter settings or add some new assignments.</p>
        </div>
    `;
    container.appendChild(message);
}

function hideNoAssignmentsMessage(container) {
    const message = container.querySelector('.no-assignments-message');
    if (message) message.remove();
}

export function applyAssignmentOrdering(container, allItems, data, layout) {
    if (layout === 'single') {
        // Single table layout
        const tbody = container.querySelector('tbody');
        if (!tbody) return;

        const assignmentMap = new Map(
            allItems.map(row => [String(row.dataset.assignmentId), row])
        );

        const orderedVisibleRows = data.assignments
            .map(a => assignmentMap.get(String(a.assignment_id)))
            .filter(Boolean);

        // Show/hide rows with animation
        allItems.forEach(row => {
            const shouldShow = orderedVisibleRows.includes(row);
            if (shouldShow) {
                showWithAnimation(row);
            } else {
                hideWithAnimation(row);
            }
        });

        // Reorder visible rows
        orderedVisibleRows.forEach(row => {
            tbody.appendChild(row);
        });

        // Show/hide no assignments message
        if (orderedVisibleRows.length === 0) {
            showNoAssignmentsMessage(container, layout);
        } else {
            hideNoAssignmentsMessage(container);
        }

    } else {
        // Per-class layout
        const classMap = new Map(
            allItems.map(card => [String(card.dataset.classId), card])
        );

        const orderedVisibleCards = data.classes
            .map(cls => {
                const card = classMap.get(String(cls.class_id));
                if (!card) return null;

                // Update the assignments in this card
                const tbody = card.querySelector('tbody');
                if (tbody) {
                    const assignmentMap = new Map(
                        [...tbody.querySelectorAll('tr')].map(row => [String(row.dataset.assignmentId), row])
                    );

                    const orderedRows = cls.assignments
                        .map(a => assignmentMap.get(String(a.assignment_id)))
                        .filter(Boolean);

                    // Clear and re-add rows
                    tbody.innerHTML = '';
                    orderedRows.forEach(row => tbody.appendChild(row));

                    // Show/hide card based on whether it has assignments
                    if (orderedRows.length === 0) {
                        hideWithAnimation(card);
                        return null;
                    } else {
                        showWithAnimation(card);
                        return card;
                    }
                }
                return card;
            })
            .filter(Boolean);

        // Reorder visible cards
        orderedVisibleCards.forEach(card => {
            container.appendChild(card);
        });

        // Show/hide no assignments message
        if (orderedVisibleCards.length === 0) {
            showNoAssignmentsMessage(container, layout);
        } else {
            hideNoAssignmentsMessage(container);
        }
    }
}