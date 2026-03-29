import re
from collections import Counter

import pdfplumber

from .base import (
    FormatReader,
    build_issue_url,
    build_pdf_url,
    normalize_section,
)

_SECTION_RE = re.compile(r"^[IVXLC]+\.\s*")
_PAGE_REF_RE = re.compile(r"Página\s*(\d+)\s*$", re.MULTILINE)
_HEADER_RE = re.compile(
    r"^\d{4,}\s*Boletín Oficial|^Boletín Oficial.*\d{4,}$"
)
# Pattern for extracting year and issue from interior page headers like
# "6814Boletín Oficial de Canarias núm. 71, martes 11 de abril de 2006"
_INTERIOR_HEADER_RE = re.compile(
    r"Boletín Oficial de Canarias\s+núm\.\s*(\d+),\s*(.+?)\s+de\s+(\d{4})"
)
_MIN_BODY_SIZE = 8.0
# Vertical tolerance for grouping characters into lines (points).
# In the 2006 format, "Página" references and their surrounding text
# can sit at slightly different vertical positions; 3pt merges them.
_TOP_TOLERANCE = 3.0


class Format2006Reader(FormatReader):
    """Reader for BOC PDFs from the mid-2000s era.

    Detection signal: an interior page header contains
    "Boletín Oficial de Canarias núm. NN" (as opposed to the 2001 format
    which uses "Número NN" on the very first line).
    """

    @classmethod
    def detect(cls, pdf: pdfplumber.PDF) -> bool:
        # The first page may not have a standard header; check the first
        # few pages for the characteristic interior header pattern.
        for page in pdf.pages[:5]:
            text = page.extract_text() or ""
            if _INTERIOR_HEADER_RE.search(text):
                return True
        return False

    def read(self, pdf: pdfplumber.PDF) -> dict:
        year, number, date_part = _extract_metadata(pdf)

        title = f"BOC Nº {number}. {date_part}" if date_part else f"BOC Nº {number}"

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


def _extract_metadata(pdf: pdfplumber.PDF) -> tuple[int | None, int | None, str]:
    """Extract year, issue number and date string from interior page headers."""
    for page in pdf.pages[:5]:
        text = page.extract_text() or ""
        m = _INTERIOR_HEADER_RE.search(text)
        if m:
            number = int(m.group(1))
            raw_date = m.group(2).strip()
            year = int(m.group(3))
            # Capitalise date: "martes 11 de abril" → "Martes 11 de abril"
            date_part = raw_date[0].upper() + raw_date[1:] if raw_date else ""
            return year, number, f"{date_part} de {year}"
    return None, None, ""


def _fix_missing_spaces(text: str) -> str:
    """Insert spaces in common PDF artifacts where words run together.

    Handles patterns like "AdministraciónLocal" → "Administración Local",
    "III.Otras" → "III. Otras", "Cabildo Insularde" → "Cabildo Insular de".
    """
    # lowercase letter followed by uppercase letter
    text = re.sub(r"([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])", r"\1 \2", text)
    # After Roman-numeral section dots: "III.Otras" → "III. Otras"
    text = re.sub(r"^([IVXLC]+\.)(\S)", r"\1 \2", text)
    # "Insularde" → "Insular de" (lowercase 'd' stuck to preceding word)
    text = re.sub(r"([a-záéíóúüñ]{2})(de|del|la|las|los)\b", r"\1 \2", text)
    return text


# ── Line extraction ──────────────────────────────────────────────────

def _annotated_lines(page: pdfplumber.pdf.Page) -> list[dict]:
    """Group page chars into lines annotated with dominant font and size.

    Uses a wider vertical tolerance than the 2001 reader so that "Página"
    references (which sit at a slightly different *top*) merge with their
    surrounding text on the same visual line.
    """
    if not page.chars:
        return []

    lines_by_top: dict[float, list] = {}
    for c in page.chars:
        key = round(c["top"], 1)
        assigned = False
        for existing_key in sorted(lines_by_top):
            if abs(existing_key - key) <= _TOP_TOLERANCE:
                lines_by_top[existing_key].append(c)
                assigned = True
                break
        if not assigned:
            lines_by_top[key] = [c]

    result = []
    for top in sorted(lines_by_top):
        chars = sorted(lines_by_top[top], key=lambda c: c["x0"])
        text = "".join(c["text"] for c in chars).strip()
        if not text:
            continue

        visible = [c for c in chars if c["text"].strip()]
        if not visible:
            continue

        # Determine font from left-column chars only (< 450 pt) so that
        # right-aligned "Página" digits don't skew the dominant font.
        left_chars = [c for c in visible if c["x0"] < 450]
        source = left_chars if left_chars else visible

        fonts = Counter(c["fontname"] for c in source)
        dominant = fonts.most_common(1)[0][0]
        median_size = sorted(c["size"] for c in visible)[len(visible) // 2]

        result.append({"text": text, "font": dominant, "size": median_size})

    return result


def _is_header_decoration(line: dict) -> bool:
    """Return True for decorative header elements like '71' or 'Mar-'."""
    # Large issue number in Courier
    if line["font"] == "Courier" and line["size"] > 15:
        return True
    # Short date fragment in Helvetica (e.g. "Mar-", "Abr-")
    if line["font"] == "Helvetica" and line["size"] >= 10 and len(line["text"]) <= 5:
        return True
    return False


def _extract_sumario_lines(pdf: pdfplumber.PDF) -> list[dict]:
    """Extract annotated lines from sumario pages only."""
    all_lines: list[dict] = []
    for page in pdf.pages:
        page_text = page.extract_text() or ""
        if not _PAGE_REF_RE.search(page_text):
            break

        lines = _annotated_lines(page)
        filtered = []
        for line in lines:
            text = line["text"]
            if _HEADER_RE.match(text):
                continue
            if line["size"] < _MIN_BODY_SIZE:
                continue
            if _is_header_decoration(line):
                continue
            filtered.append(line)

        # Only keep lines up to (and including) the last "Página" reference.
        last_page_idx = -1
        for i, line in enumerate(filtered):
            if _PAGE_REF_RE.search(line["text"]):
                last_page_idx = i
        if last_page_idx >= 0:
            filtered = filtered[: last_page_idx + 1]

        all_lines.extend(filtered)

    return all_lines


# ── Disposition parsing ──────────────────────────────────────────────

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
        # Rejoin hyphenated words split across lines
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
            normalized = _fix_missing_spaces(text)
            normalized = " ".join(normalized.split())
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
            current_subsection = _fix_missing_spaces(" ".join(text.split()))
            continue

        # Organization: Bold (not a section header)
        if "Bold" in font:
            _flush()
            current_org = _fix_missing_spaces(" ".join(text.split()))
            continue

        # Regular text: part of a disposition summary
        if "Roman" in font or "Helvetica" in font:
            pending_text_parts.append(text)

    return dispositions
