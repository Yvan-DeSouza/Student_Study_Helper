from app.services.columns.registry import COLUMN_REGISTRY


DEFAULT_ASSIGNMENT_COLUMNS = [
    col.key
    for col in COLUMN_REGISTRY.values()
    if col.default_shown
]
