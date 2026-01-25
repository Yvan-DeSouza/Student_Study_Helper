// static/js/classes/refresh/refresh_cards.js
import { getClassSelectorState } from '../../selector/selector_state.js';
import { filterAndSortClasses } from '../../selector/selector_filter.js';
import { applyVisibilityAndOrder } from '../../selector/selector_apply.js';
import { initVisualElements } from '../utils.js';
import { initInlineEditing } from '../inlineEditing.js';
import { initCompletion } from '../completion.js';

export async function refreshClassCards() {
    console.log("[Classes] Refreshing class cards");
    
    // 1. Capture current selector state
    const state = getClassSelectorState();
    
    try {
        // 2. Fetch fresh HTML
        const response = await fetch('/classes?partial=cards');
        if (!response.ok) throw new Error('Failed to fetch cards');
        
        const html = await response.text();
        
        // 3. Replace DOM
        const container = document.querySelector('.classes-grid');
        if (!container) return;
        
        container.innerHTML = html;
        
        // 4. Re-initialize interactive elements
        initVisualElements();
        initInlineEditing();
        initCompletion();
        
        // 5. Reapply filters and sorting
        const allItems = [...container.querySelectorAll('.class-card')];
        const filteredAndSorted = filterAndSortClasses(allItems, state);
        
        applyVisibilityAndOrder(
            container,
            allItems,
            filteredAndSorted,
            state.sortBy
        );
        
        console.log("[Classes] Cards refreshed with state preserved");
    } catch (error) {
        console.error("[Classes] Error refreshing cards:", error);
    }
}