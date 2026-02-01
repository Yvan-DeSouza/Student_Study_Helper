// static/js/columns/core/columnPolicy.js

export function shouldRenderLockedColumn(columnState) {
    return columnState.visible;
}

export function lockedCellDisplayMode(columnState) {
    // future-proofing: blur, placeholder, tooltip, etc.
    return "placeholder"; // currently always placeholder
}

export function getLockedTooltip(lockReason) {
    if (!lockReason) return null;

    // JS translates backend diagnostics into human-readable text
    if (lockReason.unlock_hint) {
        return lockReason.unlock_hint;
    }

    return "This column is locked.";
}
