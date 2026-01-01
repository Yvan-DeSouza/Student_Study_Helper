let lastSortBy = null;

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

export function applyVisibilityAndOrder(container, allItems, orderedVisibleItems, currentSortBy) {
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
