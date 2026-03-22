import re
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag

_BASE_URL = "https://www.gobiernodecanarias.org"


def parse(html: str) -> str:
    """Parse a BOC document HTML page and return it as clean Markdown.

    The output is a Markdown document with YAML frontmatter containing
    structured metadata (year, issue, entity, section, links …) followed
    by the full body text as Markdown paragraphs.

    Args:
        html: Raw HTML content of a single BOC disposition page.

    Returns:
        A Markdown string ready to be written to a .md file.
    """
    soup = BeautifulSoup(html, "html.parser")

    meta = _extract_meta(soup)
    year, issue = _extract_year_and_issue(soup)
    section, subsection, organization = _extract_section_info(soup)
    number, title = _extract_title(soup)
    identifier, pdf_url, signature_url = _extract_document_links(soup)
    body = _extract_body(soup)

    return _build_markdown(
        year=year,
        issue=issue,
        document_number=meta.get("documentnumber"),
        document_date=meta.get("documentdate"),
        entity=meta.get("entity"),
        doc_type=int(meta["typedocument"]) if meta.get("typedocument") else None,
        section=section,
        subsection=subsection,
        organization=organization,
        number=number,
        identifier=identifier,
        pdf=pdf_url,
        signature=signature_url,
        title=title,
        body=body,
    )


def parse_file(html_path: str | Path) -> str:
    """Parse a BOC document HTML file and return it as clean Markdown.

    Args:
        html_path: Path to the HTML file.

    Returns:
        A Markdown string ready to be written to a .md file.
    """
    path = Path(html_path)
    return parse(path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Markdown rendering
# ---------------------------------------------------------------------------


def _build_markdown(
    *,
    year: int | None,
    issue: int | None,
    document_number: str | None,
    document_date: str | None,
    entity: str | None,
    doc_type: int | None,
    section: str | None,
    subsection: str | None,
    organization: str | None,
    number: str | None,
    identifier: str | None,
    pdf: str | None,
    signature: str | None,
    title: str | None,
    body: str,
) -> str:
    """Assemble the final Markdown document from its parts."""
    lines = ["---"]

    if year is not None:
        lines.append(f"year: {year}")
    if issue is not None:
        lines.append(f"issue: {issue}")
    if document_number is not None:
        lines.append(f"document_number: {_yaml_str(document_number)}")
    if document_date is not None:
        lines.append(f"document_date: {_yaml_str(document_date)}")
    if entity is not None:
        lines.append(f"entity: {_yaml_str(entity)}")
    if doc_type is not None:
        lines.append(f"type: {doc_type}")
    if section is not None:
        lines.append(f"section: {_yaml_str(section)}")
    if subsection is not None:
        lines.append(f"subsection: {_yaml_str(subsection)}")
    if organization is not None:
        lines.append(f"organization: {_yaml_str(organization)}")
    if number is not None:
        lines.append(f"number: {_yaml_str(number)}")
    if identifier is not None:
        lines.append(f"identifier: {_yaml_str(identifier)}")
    if pdf is not None:
        lines.append(f"pdf: {_yaml_str(pdf)}")
    if signature is not None:
        lines.append(f"signature: {_yaml_str(signature)}")

    lines.append("---")
    lines.append("")

    if title:
        lines.append(f"# {title}")
        lines.append("")

    if body:
        lines.append(body)

    return "\n".join(lines)


def _yaml_str(value: str) -> str:
    """Serialize a string as a double-quoted YAML scalar."""
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


# ---------------------------------------------------------------------------
# Data extraction helpers
# ---------------------------------------------------------------------------


def _extract_meta(soup: BeautifulSoup) -> dict:
    """Return a dict of name → content from all <META> tags."""
    result = {}
    for meta in soup.find_all("meta"):
        name = meta.get("name", "").lower()
        content = meta.get("content", "")
        if name:
            result[name] = content
    return result


def _extract_year_and_issue(soup: BeautifulSoup) -> tuple[int | None, int | None]:
    """Extract year and issue number from the page <title>."""
    title_tag = soup.find("title")
    text = title_tag.get_text(strip=True) if title_tag else ""
    match = re.search(r"(\d{4})/(\d+)", text)
    if not match:
        return None, None
    return int(match.group(1)), int(match.group(2))


def _extract_section_info(
    soup: BeautifulSoup,
) -> tuple[str | None, str | None, str | None]:
    """Parse the <h5> breadcrumb into (section, subsection, organization).

    The heading uses " - " as separator. Two parts → (section, None, org).
    Three or more parts → (section, subsection, org).
    """
    conten = soup.find("div", class_="conten")
    if not conten:
        return None, None, None

    h5 = conten.find("h5")
    if not h5:
        return None, None, None

    raw = " ".join(h5.get_text().split())
    parts = [p.strip() for p in raw.split(" - ")]

    if len(parts) >= 3:
        return parts[0], parts[1], parts[-1]
    if len(parts) == 2:
        return parts[0], None, parts[1]
    return parts[0], None, None


def _extract_title(soup: BeautifulSoup) -> tuple[str | None, str | None]:
    """Extract the disposition number and descriptive title from <h3>.

    Modern format: the number is in a <b> tag; historical format uses
    "N - Title text" as plain text.

    Returns:
        (number, title) e.g. ("1", "ORDEN de 22 de diciembre de 2025…").
    """
    conten = soup.find("div", class_="conten")
    if not conten:
        return None, None

    h3 = conten.find("h3")
    if not h3:
        return None, None

    # Clone to avoid mutating the live tree; strip nested <p> (2026 metadata block)
    h3_clone = BeautifulSoup(str(h3), "html.parser").find("h3")
    for nested in h3_clone.find_all("p"):
        nested.decompose()

    text = " ".join(h3_clone.get_text().split())

    # Modern format: number wrapped in <b>
    b_tag = h3.find("b")
    if b_tag:
        number = b_tag.get_text(strip=True)
        title = re.sub(r"^\s*" + re.escape(number) + r"\s*", "", text).strip()
        return number, title

    # Historical format: "1 - REAL DECRETO…"
    match = re.match(r"^(\d+)\s*[-–]\s*(.+)$", text, re.DOTALL)
    if match:
        return match.group(1).strip(), match.group(2).strip()

    return None, text


def _extract_document_links(
    soup: BeautifulSoup,
) -> tuple[str | None, str | None, str | None]:
    """Extract CVE identifier, PDF URL, and electronic signature URL.

    Modern (2026) format: a <span class="cve"> appears inside the <h3>.
    Historical format: only a PDF <a> link in the first <p> after <h3>.

    Returns:
        (identifier, pdf_url, signature_url)
    """
    conten = soup.find("div", class_="conten")
    if not conten:
        return None, None, None

    h3 = conten.find("h3")
    if not h3:
        return None, None, None

    # Modern format: span.cve may be inside h3 or just after it as a sibling <p>
    cve_span = h3.find("span", class_="cve")
    if cve_span is None:
        next_p = h3.find_next_sibling("p")
        if next_p:
            cve_span = next_p.find("span", class_="cve")

    if cve_span:
        identifier = None
        for node in cve_span.children:
            if isinstance(node, NavigableString) and node.strip():
                identifier = node.strip().rstrip(".")
                break

        firma_a = cve_span.find("a", title=lambda t: t and "firma electrónica" in t)
        signature_url = _resolve_url(firma_a["href"] if firma_a else None)

        pdf_a = cve_span.find("a", title=lambda t: t and "PDF" in t)
        pdf_url = _resolve_url(pdf_a["href"] if pdf_a else None)

        return identifier, pdf_url, signature_url

    # Historical format: first <p class="justificado"> after h3 holds the PDF link
    pdf_p = h3.find_next_sibling("p", class_="justificado")
    if pdf_p and pdf_p.find("img", class_="icon_pdf"):
        pdf_a = pdf_p.find("a")
        return None, _resolve_url(pdf_a["href"] if pdf_a else None), None

    return None, None, None


def _extract_body(soup: BeautifulSoup) -> str:
    """Extract body paragraphs after <h3> as clean Markdown text.

    Each <p> becomes a paragraph separated by a blank line. <br/> tags
    within paragraphs are preserved as line breaks. Navigation and
    metadata paragraphs are skipped.
    """
    conten = soup.find("div", class_="conten")
    if not conten:
        return ""

    h3 = conten.find("h3")
    if not h3:
        return ""

    paragraphs = []
    for p in h3.find_next_siblings("p"):
        # Skip the PDF download link paragraph (historical format)
        if p.find("img", class_="icon_pdf"):
            continue
        # Skip the CVE/metadata paragraph that may appear as h3 sibling
        if p.find("span", class_="cve"):
            continue

        text = _para_to_text(p)
        if text:
            paragraphs.append(text)

    return "\n\n".join(paragraphs)


def _para_to_text(tag: Tag) -> str:
    """Convert a paragraph tag to plain text, preserving <br/> as line breaks.

    Whitespace within each text node is collapsed before concatenation, so
    HTML source indentation does not produce spurious blank lines around <br/>.
    """
    parts = []
    for node in tag.children:
        if isinstance(node, NavigableString):
            normalized = " ".join(str(node).split())
            if normalized:
                parts.append(normalized)
        elif isinstance(node, Tag):
            if node.name == "br":
                parts.append("\n")
            else:
                parts.append(_para_to_text(node))

    return "".join(parts).strip()


def _resolve_url(url: str | None) -> str | None:
    """Convert a relative URL to an absolute URL using the BOC base domain."""
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return _BASE_URL + url
