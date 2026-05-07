"""Reader for modern (post-2010) per-disposition BOC PDFs.

Handles the layout used in `boc-a-YYYY-NNN-NNNN.pdf` files, where each PDF
contains a single disposition with a structured header (date), section/title
heading, organization, italic title and Times-Roman body, and a footer with
the canonical `boc-a-...` identifier.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

import pdfplumber

from .base import Document, FormatReader

_BASE_PDF_URL = "https://sede.gobiernodecanarias.org/boc/"

# Vertical tolerance (in points) for grouping characters into the same visual
# line. Inline 9-pt small caps such as "HACE SABER:" sit a few points below
# their surrounding 11-pt body text and must merge into the same line.
_TOP_TOLERANCE = 3.0

# Heuristic page bands.
_HEADER_MAX_TOP = 110.0
_FOOTER_MIN_TOP = 770.0

_MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9,
    "octubre": 10, "noviembre": 11, "diciembre": 12,
}

_HEADER_DATE_RE = re.compile(
    r"(?:Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)\s+"
    r"(\d{1,2})\s+de\s+([A-Za-zñÑáéíóúÁÉÍÓÚ]+)\s+de\s+(\d{4})"
)
_IDENTIFIER_RE = re.compile(r"boc-a-(\d{4})-(\d+)-(\d+)", re.IGNORECASE)
_TITLE_NUMBER_RE = re.compile(r"^(\d+)\s+(.*)$")


@dataclass
class _Line:
    text: str
    font: str
    size: float
    top: float
    page: int

    @property
    def is_bold(self) -> bool:
        return "Bold" in self.font

    @property
    def is_italic(self) -> bool:
        return "Italic" in self.font


class FormatModernReader(FormatReader):
    """Reader for per-disposition PDFs (one disposition per file)."""

    @classmethod
    def detect(cls, pdf: pdfplumber.PDF) -> bool:
        # Modern per-disposition PDFs always carry the `boc-a-...` identifier
        # in the footer of every page.
        for page in pdf.pages:
            text = page.extract_text() or ""
            if _IDENTIFIER_RE.search(text):
                return True
        return False

    def read(self, pdf: pdfplumber.PDF) -> list[Document]:
        return [_extract(pdf)]


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------


def _extract(pdf: pdfplumber.PDF) -> Document:
    doc = Document()

    body_lines: list[_Line] = []

    for page_index, page in enumerate(pdf.pages):
        for line in _annotated_lines(page, page_index):
            text = line.text

            # Discard the rotated "Página" side-marker (size 4).
            if line.size < 6:
                continue

            # Header band: extract metadata, then drop the line.
            if line.top < _HEADER_MAX_TOP:
                _consume_header(line, doc)
                continue

            # Footer band: extract identifier, then drop the line.
            if line.top > _FOOTER_MIN_TOP:
                _consume_footer(line, doc)
                continue

            # Section header (only on the first page).
            if doc.section is None and line.is_bold and line.size >= 12.5:
                doc.section = _clean(text)
                continue

            # Organization (Bold 11pt before the title).
            if doc.organization is None and line.is_bold and not _starts_with_number(text):
                doc.organization = _clean(text)
                continue

            # Title: a line whose font mix is Bold + Italic and starts with the
            # disposition number, optionally followed by additional pure-italic
            # continuation lines.
            if doc.title is None:
                if (line.is_bold or line.is_italic) and _starts_with_number(text):
                    m = _TITLE_NUMBER_RE.match(text)
                    if m:
                        doc.number = int(m.group(1))
                        doc.title = _clean(m.group(2))
                        continue
                # Fallback: a pure italic line right after the organization is
                # also part of the title (rare).
                if line.is_italic:
                    doc.title = _clean(text)
                    continue

            # Italic continuation of the title (e.g. "de procedimiento ordinario nº 0000233/2018.").
            if doc.title is not None and not body_lines and line.is_italic:
                doc.title = _join_wrapped(doc.title, _clean(text))
                continue

            body_lines.append(line)

    doc.body_paragraphs = _group_paragraphs(body_lines)
    _finalise_links(doc)
    return doc


def _annotated_lines(page: pdfplumber.pdf.Page, page_index: int) -> list[_Line]:
    """Group page chars into visual lines with dominant font and median size."""
    if not page.chars:
        return []

    buckets: dict[float, list] = {}
    for c in page.chars:
        key = round(c["top"], 1)
        for existing in buckets:
            if abs(existing - key) <= _TOP_TOLERANCE:
                buckets[existing].append(c)
                break
        else:
            buckets[key] = [c]

    result: list[_Line] = []
    for top in sorted(buckets):
        chars = sorted(buckets[top], key=lambda c: c["x0"])
        text = "".join(c["text"] for c in chars).strip()
        if not text:
            continue

        visible = [c for c in chars if c["text"].strip()]
        if not visible:
            continue

        fonts = Counter(c["fontname"] for c in visible)
        dominant = fonts.most_common(1)[0][0]
        median_size = sorted(c["size"] for c in visible)[len(visible) // 2]

        result.append(
            _Line(
                text=text,
                font=dominant,
                size=median_size,
                top=top,
                page=page_index,
            )
        )

    return result


# ---------------------------------------------------------------------------
# Header / footer parsing
# ---------------------------------------------------------------------------


def _consume_header(line: _Line, doc: Document) -> None:
    """Extract the publication date from the header line."""
    if doc.date is not None:
        return
    m = _HEADER_DATE_RE.search(line.text)
    if not m:
        return
    day = int(m.group(1))
    month_name = m.group(2).lower()
    year = int(m.group(3))
    month = _MONTHS.get(month_name)
    if doc.year is None:
        doc.year = year
    if month:
        doc.date = f"{year:04d}-{month:02d}-{day:02d}"


def _consume_footer(line: _Line, doc: Document) -> None:
    """Extract the canonical document identifier from a footer line."""
    if doc.identifier is not None:
        return
    m = _IDENTIFIER_RE.search(line.text)
    if not m:
        return
    raw = m.group(0).lower()
    doc.identifier = raw.upper()
    if doc.year is None:
        doc.year = int(m.group(1))
    if doc.issue is None:
        doc.issue = int(m.group(2))
    if doc.number is None:
        doc.number = int(m.group(3))


def _finalise_links(doc: Document) -> None:
    if doc.identifier:
        doc.pdf_url = f"{_BASE_PDF_URL}{doc.identifier.lower()}.pdf"


# ---------------------------------------------------------------------------
# Body paragraph grouping
# ---------------------------------------------------------------------------


def _group_paragraphs(lines: list[_Line]) -> list[str]:
    """Group consecutive body lines into paragraphs by vertical spacing."""
    if not lines:
        return []

    typical_gap_by_page: dict[int, float] = {}
    for page_idx in {l.page for l in lines}:
        gaps = _consecutive_gaps([l for l in lines if l.page == page_idx])
        if gaps:
            typical_gap_by_page[page_idx] = _median(gaps)

    paragraphs: list[list[str]] = [[]]
    prev: _Line | None = None

    for line in lines:
        if prev is not None:
            same_page = line.page == prev.page
            typical = typical_gap_by_page.get(line.page, 14.0)
            gap = (line.top - prev.top) if same_page else None
            new_paragraph = False
            if same_page and gap is not None and gap > typical * 1.6:
                new_paragraph = True
            elif not same_page and not _ends_with_continuation(prev.text):
                new_paragraph = True
            if new_paragraph and paragraphs[-1]:
                paragraphs.append([])
        paragraphs[-1].append(line.text)
        prev = line

    return [_finalise_paragraph(parts) for parts in paragraphs if parts]


def _consecutive_gaps(lines: list[_Line]) -> list[float]:
    return [
        round(b.top - a.top, 1)
        for a, b in zip(lines, lines[1:])
        if b.top > a.top and (b.top - a.top) < 40
    ]


def _median(values: list[float]) -> float:
    s = sorted(values)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def _ends_with_continuation(text: str) -> bool:
    stripped = text.rstrip()
    if not stripped:
        return False
    return stripped[-1] not in ".:;!?"


def _finalise_paragraph(parts: list[str]) -> str:
    text = " ".join(p.strip() for p in parts if p.strip())
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(\w)- (\w)", r"\1\2", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _starts_with_number(text: str) -> bool:
    return bool(_TITLE_NUMBER_RE.match(text.strip()))


def _join_wrapped(head: str, tail: str) -> str:
    joined = f"{head} {tail}"
    return re.sub(r"(\w)- (\w)", r"\1\2", joined)
