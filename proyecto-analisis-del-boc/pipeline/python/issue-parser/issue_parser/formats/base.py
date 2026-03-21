from abc import ABC, abstractmethod
from urllib.parse import urlsplit, urljoin

from bs4 import BeautifulSoup

_LEGACY_BASE_URL = "https://www.gobiernodecanarias.org"


def resolve_url(url: str | None) -> str | None:
    """Return an absolute URL, resolving relative paths against the legacy base domain."""
    if url is None:
        return None
    if not urlsplit(url).scheme:
        return urljoin(_LEGACY_BASE_URL, url)
    return url


class FormatParser(ABC):
    @classmethod
    @abstractmethod
    def detect(cls, soup: BeautifulSoup) -> bool:
        """Return True if this parser can handle the given HTML."""
        ...

    @abstractmethod
    def parse(self, soup: BeautifulSoup) -> dict:
        """Parse the HTML and return a structured dict."""
        ...
