// static/js/columns/renderers/tableHeader.js

export function renderTableHeader(columnStates) {
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");

    for (const col of columnStates) {
        const th = document.createElement("th");
        th.textContent = col.label;

        if (col.locked) {
            th.classList.add("locked-column");
        }

        if (col.sortable) {
            th.classList.add("sortable");
        }

        tr.appendChild(th);
    }

    thead.appendChild(tr);
    return thead;
}
