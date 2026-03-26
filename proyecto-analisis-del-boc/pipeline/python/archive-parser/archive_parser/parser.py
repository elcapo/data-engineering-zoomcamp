from urllib.parse import urljoin, urlparse
import re

from bs4 import BeautifulSoup

BASE_URL = "https://www.gobiernodecanarias.org/boc/archivo/"
_YEAR_PATTERN = re.compile(BASE_URL + r"(\d{4}|$)")


def _is_absolute(url: str) -> bool:
    parsed = urlparse(url)
    return bool(parsed.scheme and parsed.netloc)


def _year_from_link(link: str) -> int | None:
    matches = _YEAR_PATTERN.findall(link)
    return int(matches[0]) if matches and matches[0] else None


def parse_year_index(html: str) -> list[dict]:
    """Extrae el índice de años a partir del HTML del archivo del BOC.

    Devuelve una lista de dicts con las claves ``year`` y ``absolute_link``,
    sin duplicados (un registro por año).
    """
    soup = BeautifulSoup(html, "html.parser")
    seen: dict[int, dict] = {}

    for tag in soup.find_all("a"):
        if not tag.has_attr("href"):
            continue

        href = tag["href"]
        absolute = href if _is_absolute(href) else str(urljoin(BASE_URL, href))
        if not absolute.startswith(BASE_URL):
            continue

        year = _year_from_link(absolute)
        if not year or year in seen:
            continue

        seen[year] = {"year": year, "absolute_link": absolute}

    return list(seen.values())
