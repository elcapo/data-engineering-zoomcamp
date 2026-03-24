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


def disposition_number(url: str | None) -> int | None:
    """Return the disposition number from the last path segment of a URL.

    For example, https://www.gobiernodecanarias.org/boc/1982/011/005.html → 5.
    """
    if url is None:
        return None
    path = urlsplit(url).path
    filename = path.rstrip("/").rsplit("/", 1)[-1]
    stem = filename.rsplit(".", 1)[0]
    try:
        return int(stem)
    except ValueError:
        return None


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
