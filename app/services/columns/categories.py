from enum import Enum


class ColumnCategory(Enum):
    CORE = "core"
    SIMPLE = "simple"
    COMPUTED = "computed"
    ADVANCED = "advanced"


# Useful groupings (NO string checks elsewhere)
NON_HIDEABLE_CATEGORIES = {
    ColumnCategory.CORE,
}

GATED_CATEGORIES = {
    ColumnCategory.ADVANCED,
}
