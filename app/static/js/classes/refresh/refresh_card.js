// static/js/classes/refresh/refresh_card.js
import { getClassSelectorState } from '../../selector/selector_state.js';
import { filterAndSortClasses } from '../../selector/selector_filter.js';
import { applyVisibilityAndOrder } from '../../selector/selector_apply.js';
import { initVisualElementsForCard } from '../utils.js';

export async function refreshSingleCard({ classId }) {
    if (!classId) return;

    const oldCard = document.querySelector(`.class-card[data-class-id="${classId}"]`);
    if (!oldCard) return;

    const container = oldCard.closest('.classes-grid');
    if (!container) return;

    const response = await fetch(`/classes/${classId}/card`);
    if (!response.ok) throw new Error("Failed to fetch card");

    const html = await response.text();
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const newCard = temp.querySelector(`.class-card[data-class-id="${classId}"]`);
    if (!newCard) {
        console.error("No card found in fetched HTML for classId:", classId);
        return;
    }

    // Replace card
    container.replaceChild(newCard, oldCard);
    initVisualElementsForCard(newCard);

    // Re-init interactive behavior for the new DOM
    const [{ initInlineEditing }, { initCompletion }] = await Promise.all([
        import('../inlineEditing.js'),
        import('../completion.js')
    ]);

    initInlineEditing();
    initCompletion();

    const allItems = [...container.querySelectorAll('.class-card')];
    const state = getClassSelectorState();
    const filteredAndSorted = filterAndSortClasses(allItems, state);

    applyVisibilityAndOrder(
        container,
        allItems,
        filteredAndSorted,
        state.sortBy
    );
}


