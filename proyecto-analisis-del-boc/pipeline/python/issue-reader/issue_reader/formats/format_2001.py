import re
from collections import Counter

import pdfplumber

from .base import (
    FormatReader,
    build_issue_url,
    build_pdf_url,
    extract_year_and_number,
    normalize_section,
)

_SECTION_RE = re.compile(r"^[IVXLC]+\.\s")
_PAGE_REF_RE = re.compile(r"Página\s*(\d+)\s*$", re.MULTILINE)
_HEADER_RE = re.compile(
    r"^\d{4,}\s*Boletín Oficial|^Boletín Oficial.*\d{4,}$"
)
# Minimum font size for sumario body text (footer is typically size 7)
_MIN_BODY_SIZE = 8.0


class Format2001Reader(FormatReader):
    """Reader for BOC PDFs from the early 2000s era.

    Detection signal: first page header contains "Número \\d+" and the PDF
    contains sumario entries with "Página \\d+" references.
    """

    @classmethod
    def detect(cls, pdf: pdfplumber.PDF) -> bool:
        first_text = pdf.pages[0].extract_text() or ""
        first_line = first_text.split("\n")[0]
        if not re.search(r"Número\s+\d+", first_line):
            return False
        return bool(_PAGE_REF_RE.search(first_text))

    def read(self, pdf: pdfplumber.PDF) -> dict:
        year, number = extract_year_and_number(pdf)

        first_text = pdf.pages[0].extract_text() or ""
        first_line = first_text.split("\n")[0]
        title = _build_title(first_line, number)

        lines = _extract_sumario_lines(pdf)
        pdf_url = build_pdf_url(year, number)
        dispositions = _parse_dispositions(lines, pdf_url)

        return {
            "year": year,
            "issue": number,
            "title": title,
            "url": build_issue_url(year, number),
            "summary": {
                "url": pdf_url,
                "signature": None,
            },
            "dispositions": dispositions,
        }


def _build_title(header_line: str, number: int | None) -> str:
    """Build a title like 'BOC Nº 121. Viernes, 14 de septiembre de 2001'."""
    m = re.search(r"(.+?)Número\s+\d+", header_line)
    date_part = m.group(1).strip() if m else ""
    # Remove "Año XXX" prefix
    date_part = re.sub(r"^Año\s+\S+\s*", "", date_part).strip()
    if number is not None and date_part:
        return f"BOC Nº {number}. {date_part}"
    return f"BOC Nº {number}" if number is not None else ""


def _annotated_lines(page: pdfplumber.pdf.Page) -> list[dict]:
    """Group page chars into lines annotated with dominant font and size."""
    if not page.chars:
        return []

    lines_by_top: dict[float, list] = {}
    for c in page.chars:
        key = round(c["top"], 1)
        if key not in lines_by_top:
            lines_by_top[key] = []
        lines_by_top[key].append(c)

    result = []
    for top in sorted(lines_by_top):
        chars = lines_by_top[top]
        text = "".join(c["text"] for c in chars).strip()
        if not text:
            continue

        visible = [c for c in chars if c["text"].strip()]
        if not visible:
            continue

        fonts = Counter(c["fontname"] for c in visible)
        dominant = fonts.most_common(1)[0][0]
        median_size = sorted(c["size"] for c in visible)[len(visible) // 2]

        result.append({"text": text, "font": dominant, "size": median_size})

    return result


def _extract_sumario_lines(pdf: pdfplumber.PDF) -> list[dict]:
    """Extract annotated lines from sumario pages only."""
    all_lines = []
    for page in pdf.pages:
        page_text = page.extract_text() or ""
        if not _PAGE_REF_RE.search(page_text):
            break

        lines = _annotated_lines(page)
        filtered = []
        for line in lines:
            text = line["text"]
            # Skip page headers
            if _HEADER_RE.match(text):
                continue
            # Skip footer/small text (size < 8)
            if line["size"] < _MIN_BODY_SIZE:
                continue
            filtered.append(line)

        # Only keep lines up to (and including) the last "Página" reference.
        # On the final sumario page, content body text may follow the last
        # entry — discard those trailing lines.
        last_page_idx = -1
        for i, line in enumerate(filtered):
            if _PAGE_REF_RE.search(line["text"]):
                last_page_idx = i
        if last_page_idx >= 0:
            filtered = filtered[: last_page_idx + 1]

        all_lines.extend(filtered)

    return all_lines


def _parse_dispositions(lines: list[dict], pdf_url: str | None = None) -> list[dict]:
    """Parse annotated sumario lines into structured dispositions."""
    dispositions: list[dict] = []
    current_section: str | None = None
    current_subsection: str | None = None
    current_org: str | None = None
    pending_text_parts: list[str] = []
    seen_sections: set[str] = set()

    def _flush() -> None:
        if not pending_text_parts:
            return
        summary = " ".join(pending_text_parts)
        summary = " ".join(summary.split())
        # Rejoin hyphenated words split across lines (e.g. "tempo- ral" → "temporal")
        summary = re.sub(r"(\w)- (\w)", r"\1\2", summary)
        dispositions.append({
            "disposition": len(dispositions) + 1,
            "section": current_section,
            "subsection": current_subsection,
            "organization": current_org,
            "summary": summary if summary else None,
            "metadata": None,
            "identifier": None,
            "pdf": pdf_url,
            "html": None,
            "signature": None,
        })
        pending_text_parts.clear()

    for line in lines:
        text = line["text"]
        font = line["font"]

        # Skip the header line (Año XIX ...)
        if re.match(r"^Año\s+", text):
            continue

        # Check for "Página" reference — closes the current disposition
        m_page = _PAGE_REF_RE.search(text)
        if m_page:
            before = text[: m_page.start()].strip()
            if before:
                pending_text_parts.append(before)
            _flush()
            continue

        # Section header: Bold + Roman numeral prefix
        if "Bold" in font and _SECTION_RE.match(text):
            # Fix missing spaces (PDF artifact, e.g. "YPERSONAL" → "Y PERSONAL")
            normalized = re.sub(r"(?<=\bY)(?=[A-ZÁÉÍÓÚ])", " ", text)
            normalized = " ".join(normalized.split())
            # If this section was already seen, we've hit the content area
            # (two-column layout repeats section headers from the sumario)
            if any(normalized.startswith(s) or s.startswith(normalized)
                   for s in seen_sections):
                break
            seen_sections.add(normalized)
            _flush()
            current_section = normalize_section(normalized)
            current_subsection = None
            current_org = None
            continue

        # Subsection: Italic
        if "Italic" in font and not _SECTION_RE.match(text):
            _flush()
            current_subsection = " ".join(text.split())
            continue

        # Organization: Bold (not a section header)
        if "Bold" in font:
            _flush()
            current_org = " ".join(text.split())
            continue

        # Regular text: part of a disposition summary
        if "Roman" in font or "Helvetica" in font:
            pending_text_parts.append(text)

    return dispositions
