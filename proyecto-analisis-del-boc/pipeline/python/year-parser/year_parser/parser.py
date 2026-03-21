import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

BASE_URL = "https://www.gobiernodecanarias.org"
_ISSUE_HREF_RE = re.compile(r"/boc/(\d{4})/(\d+)/(?:index\.html)?$")


def parse_issue_index(html: str) -> list[dict]:
    """Extrae el listado de boletines de un año a partir del HTML de su página de archivo.

    Devuelve una lista de dicts con las claves ``label`` y ``url``, en el
    mismo orden en que aparecen en la página.
    """
    soup = BeautifulSoup(html, "html.parser")
    results = []

    for tag in soup.find_all("a"):
        href = tag.get("href", "")
        m = _ISSUE_HREF_RE.search(href)
        if not m:
            continue

        label = tag.get_text(" ", strip=True)
        if not label.startswith("BOC"):
            continue

        absolute = href if urlparse(href).scheme else urljoin(BASE_URL, href)
        results.append({
            "label": label,
            "url": absolute,
            "year": int(m.group(1)),
            "issue": int(m.group(2)),
        })

    return results
