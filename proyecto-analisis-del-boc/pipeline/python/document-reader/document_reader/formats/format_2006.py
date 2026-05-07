"""Reader for 2006-era BOC bulletins published as a single multi-disposition PDF.

Some old issues (e.g. 2006/071) were not split into per-disposition PDFs:
the whole bulletin is a single PDF with a two-column body. Each disposition
is introduced by its global number printed in bold (e.g. "473" for the first
disposition of 2006/071) followed by the title in italics. The page layout is:

  ┌───────────────┬───────────────┐
  │ Section (Bold)│ ...           │
  │ Subsection (I)│ ...           │
  │ Organization  │ ...           │
  │ 473 ORDEN ... │ ...           │
  │   (italic)    │ ...           │
  │ Body text ... │ Body text ... │
  └───────────────┴───────────────┘

Column boundary is around x = 290pt on a 595pt-wide page. Within each
column lines are grouped by their top coordinate; lines from the left
column are read entirely before the right column on the same page.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass

import pdfplumber

from .base import Document, FormatReader

_BASE_BULLETIN_URL = "https://www.gobiernodecanarias.org/boc"

# Layout
_COLUMN_SPLIT = 290.0
_HEADER_MAX_TOP = 80.0
_TOP_TOLERANCE = 3.0
# Cover decorations and sumario footer text are smaller; the smallest body
# text (compact tables like NIVEL/PUNTOS) is 9pt.
_MIN_BODY_SIZE = 8.0
_PAGINA_RE = re.compile(r"Página\s*\d+")

# Header & metadata
_HEADER_RE = re.compile(
    r"Boletín Oficial de Canarias\s+núm\.\s*(\d+),\s*(.+?)\s+de\s+(\d{4})"
)
_PAGE_HEADER_LINE_RE = re.compile(r"Boletín Oficial de Canarias")

# Sections & numbers
_ROMAN_PREFIX_RE = re.compile(r"^[IVXLC]+\.\s")
_ROMAN_SECTION_RE = re.compile(r"^([IVXLC]+\.\s*)+")
_LOWERCASE_WORDS = {"de", "del", "la", "las", "los", "y", "el", "en"}
_TITLE_PREFIX_RE = re.compile(r"^(\d+)\s*(.*)$")

_MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9,
    "octubre": 10, "noviembre": 11, "diciembre": 12,
}


@dataclass
class _Line:
    text: str
    first_font: str
    dominant_font: str
    size: float
    top: float
    page: int
    column: int  # 0 = left, 1 = right
    x0: float

    @property
    def first_is_bold(self) -> bool:
        return "Bold" in self.first_font

    @property
    def is_dominant_italic(self) -> bool:
        return "Italic" in self.dominant_font

    @property
    def is_dominant_bold(self) -> bool:
        return "Bold" in self.dominant_font

    @property
    def is_section_header(self) -> bool:
        return (
            self.is_dominant_bold
            and self.size >= 12.5
            and bool(_ROMAN_PREFIX_RE.match(self.text))
        )


class Format2006Reader(FormatReader):
    """Reader for whole-bulletin PDFs from the 2006 era."""

    @classmethod
    def detect(cls, pdf: pdfplumber.PDF) -> bool:
        # The first page may not have a standard header; check the first few
        # pages for the characteristic interior header pattern.
        for page in pdf.pages[:5]:
            text = page.extract_text() or ""
            if _HEADER_RE.search(text):
                return True
        return False

    def read(self, pdf: pdfplumber.PDF) -> list[Document]:
        year, issue, date = _extract_bulletin_metadata(pdf)
        bulletin_pdf_url = _build_bulletin_pdf_url(year, issue)

        documents: list[Document] = []
        current: Document | None = None
        body_buffer: list[_Line] = []
        title_buffer: list[str] = []
        section: str | None = None
        organization: str | None = None
        org_buffer: list[str] = []
        in_title = False

        def _close_current() -> None:
            nonlocal current, body_buffer, title_buffer, in_title
            if current is None:
                return
            if title_buffer:
                current.title = _join_title(title_buffer)
            current.body_paragraphs = _group_paragraphs(body_buffer)
            documents.append(current)
            current = None
            body_buffer = []
            title_buffer = []
            in_title = False

        for line in _iter_body_lines(pdf):
            text = line.text

            # Section header (e.g. "III. Otras Resoluciones") — closes the
            # previous disposition and resets the organization context.
            if line.is_section_header:
                _close_current()
                section = _normalize_section(text)
                organization = None
                org_buffer = []
                continue

            # Disposition title: line whose first char is bold and starts with
            # a digit followed by italic text.
            if line.first_is_bold and _looks_like_title(line):
                m = _TITLE_PREFIX_RE.match(text)
                if not m:
                    continue
                _close_current()
                if org_buffer:
                    organization = _normalize_org(" ".join(org_buffer))
                    org_buffer = []
                current = Document(
                    year=year,
                    issue=issue,
                    date=date,
                    number=int(m.group(1)),
                    section=section,
                    organization=organization,
                    pdf_url=bulletin_pdf_url,
                )
                rest = m.group(2).strip()
                if rest:
                    title_buffer.append(rest)
                in_title = True
                continue

            # Bold standalone line — signals a (new) organization for the
            # upcoming disposition, so close the current one and accumulate
            # the bold lines until we reach the next title.
            if line.is_dominant_bold:
                _close_current()
                org_buffer.append(text)
                continue

            # Italic continuation of the title (no leading number).
            if in_title and line.is_dominant_italic:
                title_buffer.append(text)
                continue

            # Anything else after the title is body text.
            if current is not None:
                in_title = False
                body_buffer.append(line)

        _close_current()
        return documents


# ---------------------------------------------------------------------------
# Metadata
# ---------------------------------------------------------------------------


def _extract_bulletin_metadata(pdf: pdfplumber.PDF) -> tuple[int | None, int | None, str | None]:
    for page in pdf.pages[:5]:
        text = page.extract_text() or ""
        m = _HEADER_RE.search(text)
        if not m:
            continue
        issue = int(m.group(1))
        raw_date = m.group(2).strip()
        year = int(m.group(3))
        date = _parse_date(raw_date, year)
        return year, issue, date
    return None, None, None


def _build_bulletin_pdf_url(year: int | None, issue: int | None) -> str | None:
    if year is None or issue is None:
        return None
    return f"{_BASE_BULLETIN_URL}/{year}/{issue:03d}/boc-{year}-{issue:03d}.pdf"


def _parse_date(raw_date: str, year: int) -> str | None:
    """Parse "martes 11 de abril" + year into ISO 8601 (yyyy-mm-dd)."""
    m = re.search(r"(\d{1,2})\s+de\s+([A-Za-zñÑáéíóú]+)", raw_date)
    if not m:
        return None
    day = int(m.group(1))
    month = _MONTHS.get(m.group(2).lower())
    if month is None:
        return None
    return f"{year:04d}-{month:02d}-{day:02d}"


# ---------------------------------------------------------------------------
# Line iteration (column-aware)
# ---------------------------------------------------------------------------


def _iter_body_lines(pdf: pdfplumber.PDF):
    """Yield body lines page-by-page, left column first, then right column.

    The sumario is rendered with smaller fonts (section headers at size 11pt)
    while the body uses size 13pt section headers, so we can identify the
    first body line as the first :func:`_Line.is_section_header` we find.
    """
    body_started = False
    for page_idx, page in enumerate(pdf.pages):
        if not page.chars:
            continue
        for column in (0, 1):
            lines = _column_lines(page, page_idx, column)
            # Sumario index entries always end with a "Página N" reference.
            # Anything in this column at or above the last such reference is
            # part of the sumario; body content starts strictly after it.
            last_pagina_idx = -1
            for i, line in enumerate(lines):
                if _PAGINA_RE.search(line.text):
                    last_pagina_idx = i
            for i, line in enumerate(lines):
                if i <= last_pagina_idx:
                    continue
                if line.top < _HEADER_MAX_TOP:
                    continue
                if line.size < _MIN_BODY_SIZE:
                    continue
                if _PAGE_HEADER_LINE_RE.search(line.text):
                    continue
                if not body_started:
                    if line.is_section_header:
                        body_started = True
                    else:
                        continue
                yield line


def _column_lines(page: pdfplumber.pdf.Page, page_idx: int, column: int) -> list[_Line]:
    """Group chars of one column on a page into annotated lines."""
    chars = [c for c in page.chars if (c["x0"] < _COLUMN_SPLIT) == (column == 0)]
    if not chars:
        return []

    buckets: dict[float, list] = defaultdict(list)
    keys: list[float] = []
    for c in chars:
        key = round(c["top"], 1)
        for existing in keys:
            if abs(existing - key) <= _TOP_TOLERANCE:
                buckets[existing].append(c)
                break
        else:
            buckets[key] = [c]
            keys.append(key)

    result: list[_Line] = []
    for top in sorted(buckets):
        cs = sorted(buckets[top], key=lambda c: c["x0"])
        text = "".join(c["text"] for c in cs).strip()
        if not text:
            continue
        visible = [c for c in cs if c["text"].strip()]
        if not visible:
            continue
        first_font = visible[0]["fontname"]
        fonts = Counter(c["fontname"] for c in visible)
        dominant_font = fonts.most_common(1)[0][0]
        median_size = sorted(c["size"] for c in visible)[len(visible) // 2]
        x0 = min(c["x0"] for c in visible)
        result.append(
            _Line(
                text=_fix_missing_spaces(text),
                first_font=first_font,
                dominant_font=dominant_font,
                size=median_size,
                top=top,
                page=page_idx,
                column=column,
                x0=x0,
            )
        )
    return result


# ---------------------------------------------------------------------------
# Heuristics
# ---------------------------------------------------------------------------


def _looks_like_title(line: _Line) -> bool:
    """A title starts with a number, the first character is bold, and the
    remainder of the line has at least some italic text."""
    if not _TITLE_PREFIX_RE.match(line.text):
        return False
    return line.is_dominant_italic or line.is_dominant_bold


def _normalize_section(text: str) -> str:
    cleaned = _ROMAN_SECTION_RE.sub("", text).strip()
    if not cleaned:
        return text
    words = cleaned.split()
    out: list[str] = []
    for i, word in enumerate(words):
        lower = word.lower()
        if i == 0 or lower not in _LOWERCASE_WORDS:
            out.append(lower.capitalize())
        else:
            out.append(lower)
    return " ".join(out)


def _fix_missing_spaces(text: str) -> str:
    """Insert spaces in common PDF artefacts where words run together.

    Safe to apply to body text: only triggers on lowercase→uppercase
    transitions (e.g. "AdministraciónLocal") and Roman-numeral section
    prefixes. The lowercase→preposition rule lives in :func:`_normalize_org`
    instead, because it splits valid words like "desde" → "des de".
    """
    text = re.sub(r"([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])", r"\1 \2", text)
    text = re.sub(r"^([IVXLC]+\.)(\S)", r"\1 \2", text)
    return text


def _normalize_org(text: str) -> str:
    """Apply org-only fixes (e.g. 'Cabildo Insularde' → 'Cabildo Insular de').

    Organization labels are short and don't contain words like 'desde',
    so the lowercase→preposition splitter is safe here.
    """
    text = _fix_missing_spaces(text)
    text = re.sub(r"([a-záéíóúüñ]{2})(de|del|la|las|los)\b", r"\1 \2", text)
    return text


def _join_title(parts: list[str]) -> str:
    text = " ".join(p.strip() for p in parts if p.strip())
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(\w)- (\w)", r"\1\2", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Body paragraph grouping
# ---------------------------------------------------------------------------


def _group_paragraphs(lines: list[_Line]) -> list[str]:
    """Group body lines into paragraphs by vertical spacing within a column."""
    if not lines:
        return []

    # Compute typical line gap per (page, column) to detect paragraph breaks.
    typical_gap: dict[tuple[int, int], float] = {}
    keys = {(l.page, l.column) for l in lines}
    for key in keys:
        same = [l for l in lines if (l.page, l.column) == key]
        gaps = [
            round(b.top - a.top, 1)
            for a, b in zip(same, same[1:])
            if 0 < b.top - a.top < 40
        ]
        if gaps:
            typical_gap[key] = _median(gaps)

    paragraphs: list[list[str]] = [[]]
    prev: _Line | None = None
    for line in lines:
        if prev is not None:
            same_block = (line.page, line.column) == (prev.page, prev.column)
            typical = typical_gap.get((line.page, line.column), 14.0)
            new_paragraph = False
            if same_block and (line.top - prev.top) > typical * 1.6:
                new_paragraph = True
            elif not same_block and not _ends_with_continuation(prev.text):
                new_paragraph = True
            if new_paragraph and paragraphs[-1]:
                paragraphs.append([])
        paragraphs[-1].append(line.text)
        prev = line

    return [_finalise_paragraph(parts) for parts in paragraphs if parts]


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
