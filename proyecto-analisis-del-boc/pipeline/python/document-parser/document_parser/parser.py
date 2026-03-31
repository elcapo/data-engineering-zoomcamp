import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, NavigableString, Tag

_BASE_URL = "https://www.gobiernodecanarias.org"


def _find_content(soup: BeautifulSoup) -> Tag | None:
    """Find the main content container across all known formats.

    Modern/historical pages use ``div.conten``; PDA pages use
    ``div.bloq_contenido``.
    """
    return soup.find("div", class_="conten") or soup.find("div", class_="bloq_contenido")


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
        document=meta.get("documentnumber"),
        number=number,
        date=meta.get("documentdate"),
        entity=meta.get("entity"),
        section=section,
        subsection=subsection,
        organization=organization,
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
    document: str | None,
    number: int | str | None,
    date: str | None,
    entity: str | None,
    section: str | None,
    subsection: str | None,
    organization: str | None,
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
    if document is not None:
        lines.append(f"document: {_yaml_str(document)}")
    if number is not None:
        lines.append(f"number: {number}" if isinstance(number, int) else f"number: {_yaml_str(number)}")
    if date is not None:
        lines.append(f"date: {_yaml_str(date)}")
    if entity is not None:
        lines.append(f"entity: {_yaml_str(entity)}")
    if section is not None:
        lines.append(f"section: {_yaml_str(section)}")
    if subsection is not None:
        lines.append(f"subsection: {_yaml_str(subsection)}")
    if organization is not None:
        lines.append(f"organization: {_yaml_str(organization)}")
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
    conten = _find_content(soup)
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

    # PDA format: <h4> holds the section, <h5> holds the organization.
    h4 = conten.find("h4")
    if h4:
        section = " ".join(h4.get_text().split())
        return section, None, parts[0]

    return parts[0], None, None


def _extract_title(soup: BeautifulSoup) -> tuple[str | None, str | None]:
    """Extract the disposition number and descriptive title from <h3>.

    Modern format: the number is in a <b> tag; historical format uses
    "N - Title text" as plain text.

    Returns:
        (number, title) e.g. ("1", "ORDEN de 22 de diciembre de 2025…").
    """
    conten = _find_content(soup)
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
        return int(number) if number.isdigit() else number, title

    # Historical format: "1 - REAL DECRETO…"
    match = re.match(r"^(\d+)\s*[-–]\s*(.+)$", text, re.DOTALL)
    if match:
        return int(match.group(1)), match.group(2).strip()

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
    conten = _find_content(soup)
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
    conten = _find_content(soup)
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
    """Convert a paragraph tag to plain text with Markdown links.

    Applies HTML inline whitespace collapsing: runs of whitespace (including
    newlines from HTML source indentation) between inline elements collapse to
    a single space. Only explicit <br/> tags produce a line break.
    <a> tags are rendered as Markdown links with resolved absolute URLs.
    """
    tokens = []
    for node in tag.children:
        if isinstance(node, NavigableString):
            s = str(node)
            normalized = " ".join(s.split())
            if normalized:
                # Preserve one space at the boundary if the original had whitespace
                # there — prevents "textoDescargar" when a link follows inline text.
                if s[0:1].isspace() and tokens and tokens[-1] != "\n":
                    normalized = " " + normalized
                if s[-1:].isspace():
                    normalized = normalized + " "
                tokens.append(normalized)
            elif s and tokens and tokens[-1] not in ("\n", " ") and not tokens[-1].endswith(" "):
                # Whitespace-only node between elements: emit a single space separator.
                tokens.append(" ")
        elif isinstance(node, Tag):
            if node.name == "br":
                tokens.append("\n")
            elif node.name == "a":
                tokens.append(_link_to_markdown(node))
            else:
                tokens.append(_para_to_text(node))

    raw = "".join(tokens)
    # Normalise multiple spaces per line (spaces added above may double up),
    # then strip each line's edges.
    lines = raw.split("\n")
    cleaned = [" ".join(line.split()) for line in lines]
    return "\n".join(cleaned).strip()


def _link_to_markdown(a: Tag) -> str:
    """Render an <a> tag as a Markdown link with an absolute URL."""
    text = " ".join(a.get_text().split())
    href = _resolve_url(a.get("href"))
    if href and text:
        return f"[{text}]({href})"
    return text


def _resolve_url(url: str | None) -> str | None:
    """Convert a relative URL to an absolute URL using the BOC base domain."""
    if not url:
        return None
    return url if urlparse(url).scheme else urljoin(_BASE_URL, url)
