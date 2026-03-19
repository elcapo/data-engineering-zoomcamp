from .format_1982 import Format1982Parser
from .format_2026 import Format2026Parser

# Ordered from most specific to least specific.
# The first parser whose detect() returns True is used.
PARSERS = [
    Format2026Parser,
    Format1982Parser,
]
