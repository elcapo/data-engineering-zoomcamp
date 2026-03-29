from bs4 import BeautifulSoup, NavigableString, Tag

from .base import FormatParser, disposition_number, extract_year_and_number, resolve_url

_BASE_URL = "https://www.gobiernodecanarias.org/boc"


class Format2026Parser(FormatParser):
    """Parser for the current BOC HTML format (circa 2026).

    Detection signal: dispositions use <li class="justificado_boc"> items,
    which include structured metadata blocks (<div class="document_info">),
    CVE identifiers and electronic signature links.
    Sections optionally have subsections (<h3 class="titboc">).
    """

    @classmethod
    def detect(cls, soup: BeautifulSoup) -> bool:
        return soup.find("li", class_="justificado_boc") is not None

    def parse(self, soup: BeautifulSoup) -> dict:
        year, number = extract_year_and_number(soup)
        number_padded = f"{number:03d}" if number is not None else "000"

        h2 = soup.find("h2")
        title = " ".join(h2.get_text().split()) if h2 else ""

        url = f"{_BASE_URL}/{year}/{number_padded}/"

        conten = soup.find("div", class_="conten")
        sumario_url, firma_url = _extract_sumario_links(conten)

        return {
            "year": year,
            "issue": number,
            "title": title,
            "url": url,
            "summary": {
                "url": sumario_url,
                "signature": firma_url,
            },
            "dispositions": self._parse_dispositions(conten),
        }

    def _parse_dispositions(self, conten: Tag | None) -> list[dict]:
        if not conten:
            return []

        # Some issues (e.g. 2020/062) wrap dispositions inside a
        # <div id="bloq_menu"> instead of placing them as direct children
        # of <div class="conten">.  Use that wrapper when present.
        container = conten.find("div", id="bloq_menu") or conten

        dispositions = []
        current_section = None
        current_subsection = None
        current_org = None

        for element in container.children:
            if not hasattr(element, "name") or element.name is None:
                continue

            if element.name == "h4":
                current_section = " ".join(element.get_text().split())
                current_subsection = None
                current_org = None
            elif element.name == "h3" and "titboc" in element.get("class", []):
                current_subsection = " ".join(element.get_text().split())
                current_org = None
            elif element.name == "h5":
                current_org = " ".join(element.get_text().split())
            elif element.name == "ul":
                for li in element.find_all("li", class_="justificado_boc"):
                    dispositions.append(
                        _parse_li_2026(li, current_section, current_subsection, current_org)
                    )

        return dispositions


def _parse_li_2026(
    li: Tag,
    section: str | None,
    subsection: str | None,
    org: str | None,
) -> dict:
    b_tag = li.find("b")
    number = b_tag.get_text(strip=True) if b_tag else ""

    # The description is in the second direct <a> child of <li>
    direct_links = [c for c in li.children if isinstance(c, Tag) and c.name == "a"]
    desc_a = direct_links[1] if len(direct_links) > 1 else None
    description = " ".join(desc_a.get_text().split()) if desc_a else ""

    sumario = f"{number} {description}".strip() if number or description else None

    metadatos = _extract_metadatos(li)
    identificador, html_url, firma_url, pdf_url = _extract_cve_fields(li)

    return {
        "disposition": disposition_number(html_url),
        "section": section,
        "subsection": subsection,
        "organization": org,
        "summary": sumario,
        "metadata": metadatos,
        "identifier": identificador,
        "pdf": pdf_url,
        "html": html_url,
        "signature": firma_url,
    }


def _extract_metadatos(li: Tag) -> str | None:
    doc_info = li.find("div", class_="document_info")
    if not doc_info:
        return None
    # Re-parse to avoid mutating the original tree
    doc_clone = BeautifulSoup(str(doc_info), "html.parser")
    cve = doc_clone.find("div", class_="cve")
    if cve:
        cve.decompose()
    text = " ".join(doc_clone.get_text().split())
    return text or None


def _extract_cve_fields(li: Tag) -> tuple[str | None, str | None, str | None, str | None]:
    cve_div = li.find("div", class_="cve")
    if not cve_div:
        # Fallback for older formats (e.g. 2009) that use justificado_boc
        # but place links directly in the <li> without a CVE block.
        html_a = li.find("a", title=lambda t: t and "Ir a la disposición" in t)
        html_url = resolve_url(html_a["href"] if html_a else None)

        pdf_a = li.find("a", title=lambda t: t and "Descarga la disposición" in t)
        pdf_url = resolve_url(pdf_a["href"] if pdf_a else None)

        return None, html_url, None, pdf_url

    identificador = None
    for node in cve_div.children:
        if isinstance(node, NavigableString) and node.strip():
            identificador = node.strip()
            break

    html_a = cve_div.find("a", title=lambda t: t and "Vista previa" in t)
    html_url = resolve_url(html_a["href"] if html_a else None)

    firma_a = cve_div.find("a", title=lambda t: t and "firma electrónica" in t)
    firma_url = resolve_url(firma_a["href"] if firma_a else None)

    pdf_a = cve_div.find("a", title=lambda t: t and "Descargar en formato PDF" in t)
    pdf_url = resolve_url(pdf_a["href"] if pdf_a else None)

    return identificador, html_url, firma_url, pdf_url


def _extract_sumario_links(conten: Tag | None) -> tuple[str | None, str | None]:
    if not conten:
        return None, None

    summary_p = conten.find("p", class_="justificado")
    if not summary_p:
        return None, None

    pdf_a = summary_p.find("a", title=lambda t: t and "formato PDF" in t)
    sumario_url = resolve_url(pdf_a["href"] if pdf_a else None)

    cve_span = summary_p.find("span", class_="cve")
    firma_a = (
        cve_span.find("a", title=lambda t: t and "firma electrónica" in t)
        if cve_span
        else None
    )
    firma_url = resolve_url(firma_a["href"] if firma_a else None)

    return sumario_url, firma_url


