from .base import Document, FormatReader, build_markdown
from .format_2006 import Format2006Reader
from .format_modern import FormatModernReader

# Order matters: more specific readers first.
READERS: list[type[FormatReader]] = [
    Format2006Reader,
    FormatModernReader,
]

__all__ = [
    "Document",
    "FormatReader",
    "Format2006Reader",
    "FormatModernReader",
    "READERS",
    "build_markdown",
]
