import re
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


def extract_year_and_number(soup: BeautifulSoup) -> tuple[int | None, int | None]:
    """Extract year and issue number from a BOC HTML page.

    Tries the <title> tag first (e.g. "BOC - 2026/47"), then falls back to the
    <h2> tag (e.g. "BOC Nº 168. Martes 28 de Agosto de 2012").
    """
    for tag_name in ("title", "h2"):
        tag = soup.find(tag_name)
        if not tag:
            continue
        text = tag.get_text(strip=True)
        m = re.search(r"(\d{4})/(\d+)", text)
        if m:
            return int(m.group(1)), int(m.group(2))
        m_h2 = re.search(r"[Nn]º\s*(\d+)", text)
        m_year = re.search(r"\b(\d{4})\b", text)
        if m_h2 and m_year:
            return int(m_year.group(1)), int(m_h2.group(1))
    return None, None


_ROMAN_PREFIX_RE = re.compile(r"^([IVXLC]+[\.\-]+\s*)+")
_LOWERCASE_WORDS = {"de", "del", "la", "las", "los", "y", "el", "en"}


def normalize_section(section: str | None) -> str | None:
    """Normalize a BOC section name.

    Removes the leading Roman-numeral prefix (e.g. "IV. ", "III.-") and
    converts the remaining text to title case, keeping Spanish
    prepositions/articles lowercase.
    """
    if not section:
        return section
    text = _ROMAN_PREFIX_RE.sub("", section).strip()
    if not text:
        return section
    words = text.split()
    result = []
    for i, word in enumerate(words):
        lower = word.lower()
        if i == 0 or lower not in _LOWERCASE_WORDS:
            result.append(lower.capitalize())
        else:
            result.append(lower)
    return " ".join(result)


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
