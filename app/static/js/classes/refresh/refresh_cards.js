// static/js/classes/refresh/refresh_cards.js
import { getClassSelectorState } from '../../selector/core/state_classes.js';
import { fetchFilteredClassIds } from '../../selector/core/filter_classes.js';
import { applyClassOrdering } from '../../selector/classes/apply.js';
import { initVisualElements } from '../utils.js';
import { initInlineEditing } from '../inlineEditing.js';
import { initCompletion } from '../completion.js';

export async function refreshClassCards() {
    console.log("[Classes] Refreshing class cards");
    
    
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
        const state = getClassSelectorState();
        const orderedIds = await fetchFilteredClassIds(state);
        const allItems = [...container.querySelectorAll('.class-card')];
        applyClassOrdering(container, allItems, orderedIds, state.sortBy);
        
        console.log("[Classes] Cards refreshed with state preserved");
    } catch (error) {
        console.error("[Classes] Error refreshing cards:", error);
    }
}