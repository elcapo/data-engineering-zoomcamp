from bs4 import BeautifulSoup

from .base import FormatParser, extract_year_and_number, resolve_url

_BASE_URL = "https://www.gobiernodecanarias.org/boc"


class FormatPdfOnlyParser(FormatParser):
    """Fallback parser for BOC issues published only as PDF.

    These pages contain basic metadata (title, year, issue number) and a
    link to download the full PDF, but no individual disposition listings.
    Returns an empty dispositions list.
    """

    @classmethod
    def detect(cls, soup: BeautifulSoup) -> bool:
        conten = soup.find("div", class_="conten")
        if not conten:
            return False
        # Must have a PDF download link
        pdf_a = conten.find("a", href=lambda h: h and h.endswith(".pdf"))
        if not pdf_a:
            return False
        # Must NOT have disposition listings (those belong to other parsers)
        if soup.find("ul", class_="summary"):
            return False
        if soup.find("li", class_="justificado_boc"):
            return False
        return True

    def parse(self, soup: BeautifulSoup) -> dict:
        year, number = extract_year_and_number(soup)
        number_padded = f"{number:03d}" if number is not None else "000"

        h2 = soup.find("h2")
        title = " ".join(h2.get_text().split()) if h2 else ""

        url = f"{_BASE_URL}/{year}/{number_padded}/"

        pdf_a = soup.find("a", href=lambda h: h and h.endswith(".pdf"))
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
            "dispositions": [],
        }
