// static/js/columns/core/columnState.js

export function normalizeColumnState(raw) {
    return {
        key: raw.key,
        label: raw.label,

        visible: Boolean(raw.visible),
        locked: Boolean(raw.locked),

        sortable: Boolean(raw.sortable),
        filterable: Boolean(raw.filterable),
        selectable: Boolean(raw.selectable),

        lockReason: raw.lock_reason || null,
    };
}
