from dataclasses import dataclass


@dataclass(frozen=True)
class ColumnCapabilities:
    sortable: bool
    filterable: bool
    selectable: bool        # Can appear in column selector
    visible_when_locked: bool


# Reusable capability presets
CORE_CAPABILITIES = ColumnCapabilities(
    sortable=True,
    filterable=True,
    selectable=False,
    visible_when_locked=True,
)

SIMPLE_CAPABILITIES = ColumnCapabilities(
    sortable=True,
    filterable=True,
    selectable=True,
    visible_when_locked=True,
)

COMPUTED_CAPABILITIES = ColumnCapabilities(
    sortable=True,
    filterable=False,
    selectable=True,
    visible_when_locked=True,
)

ADVANCED_CAPABILITIES = ColumnCapabilities(
    sortable=True,
    filterable=False,
    selectable=True,
    visible_when_locked=False,
)
