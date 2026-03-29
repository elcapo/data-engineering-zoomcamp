from .format_2001 import Format2001Reader
from .format_2006 import Format2006Reader

# Ordered from most specific to least specific.
# The first reader whose detect() returns True is used.
READERS = [
    Format2001Reader,
    Format2006Reader,
]
