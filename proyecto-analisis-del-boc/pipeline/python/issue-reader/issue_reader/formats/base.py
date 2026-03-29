import re
from abc import ABC, abstractmethod

import pdfplumber


_BASE_URL = "https://www.gobiernodecanarias.org/boc"


def extract_year_and_number(pdf: pdfplumber.PDF) -> tuple[int | None, int | None]:
    """Extract year and issue number from the first page header.

    Looks for patterns like "Número 121" and a 4-digit year in the header line.
    """
    first_page = pdf.pages[0]
    text = first_page.extract_text() or ""
    first_line = text.split("\n")[0]

    year = None
    number = None

    m_num = re.search(r"Número\s+(\d+)", first_line)
    if m_num:
        number = int(m_num.group(1))

    m_year = re.search(r"\b(\d{4})\b", first_line)
    if m_year:
        year = int(m_year.group(1))

    return year, number


def build_issue_url(year: int | None, number: int | None) -> str:
    number_padded = f"{number:03d}" if number is not None else "000"
    return f"{_BASE_URL}/{year}/{number_padded}/"


def build_pdf_url(year: int | None, number: int | None) -> str:
    number_padded = f"{number:03d}" if number is not None else "000"
    return f"{_BASE_URL}/{year}/{number_padded}/boc-{year}-{number_padded}.pdf"


class FormatReader(ABC):
    @classmethod
    @abstractmethod
    def detect(cls, pdf: pdfplumber.PDF) -> bool:
        """Return True if this reader can handle the given PDF."""
        ...

    @abstractmethod
    def read(self, pdf: pdfplumber.PDF) -> dict:
        """Read the PDF and return a structured dict."""
        ...
