from bs4 import BeautifulSoup

from .base import FormatParser, disposition_number, extract_year_and_number, normalize_section, resolve_url

_BASE_URL = "https://www.gobiernodecanarias.org/boc"


class Format1982Parser(FormatParser):
    """Parser for the original BOC HTML format (circa 1982).

    Detection signal: dispositions are listed inside <ul class="summary">
    with <li class="justificado"> items and <a class="abstract"> descriptions.
    There are no document metadata blocks, CVE identifiers, or electronic
    signatures — those features were added in later formats.
    """

    @classmethod
    def detect(cls, soup: BeautifulSoup) -> bool:
        return soup.find("ul", class_="summary") is not None

    def parse(self, soup: BeautifulSoup) -> dict:
        year, number = extract_year_and_number(soup)
        number_padded = f"{number:03d}" if number is not None else "000"

        h2 = soup.find("h2")
        title = " ".join(h2.get_text().split()) if h2 else ""

        url = f"{_BASE_URL}/{year}/{number_padded}/"

        pdf_a = soup.find("a", title=lambda t: t and "Descarga el Boletín" in t)
        sumario_url = resolve_url(pdf_a["href"] if pdf_a else None)

        return {
            "year": year,
            "issue": number,
            "title": title,
            "url": url,
            "summary": {
                "url": sumario_url,
                "signature": None,
            },
            "dispositions": self._parse_dispositions(soup),
        }

    def _parse_dispositions(self, soup: BeautifulSoup) -> list[dict]:
        conten = soup.find("div", class_="conten")
        if not conten:
            return []

        dispositions = []
        current_section = None
        current_org = None

        for element in conten.children:
            if not hasattr(element, "name") or element.name is None:
                continue

            if element.name == "h4":
                current_section = normalize_section(" ".join(element.get_text().split()))
                current_org = None
            elif element.name == "h5":
                current_org = " ".join(element.get_text().split())
            elif element.name == "ul" and "summary" in element.get("class", []):
                for li in element.find_all("li", class_="justificado"):
                    dispositions.append(
                        _parse_li_1982(li, current_section, current_org)
                    )

        return dispositions


def _parse_li_1982(li, section: str | None, org: str | None) -> dict:
    b_tag = li.find("b")
    number = b_tag.get_text(strip=True) if b_tag else ""

    abstract_a = li.find("a", class_="abstract")
    description = " ".join(abstract_a.get_text().split()) if abstract_a else ""

    html_a = li.find(
        "a", title=lambda t: t and ("Ir a la disposición" in t or "Ir al artículo" in t)
    )
    html_url = resolve_url(html_a["href"] if html_a else None)

    pdf_a = li.find(
        "a",
        title=lambda t: t
        and ("Descarga la disposición" in t or "Descarga el artículo" in t),
    )
    pdf_url = resolve_url(pdf_a["href"] if pdf_a else None)

    sumario = f"{number} {description}".strip() if number or description else None

    return {
        "disposition": disposition_number(html_url),
        "section": section,
        "subsection": None,
        "organization": org,
        "summary": sumario,
        "metadata": None,
        "identifier": None,
        "pdf": pdf_url,
        "html": html_url,
        "signature": None,
    }


