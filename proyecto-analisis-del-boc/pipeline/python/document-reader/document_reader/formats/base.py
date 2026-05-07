"""Shared dataclasses, abstract reader and Markdown rendering."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import pdfplumber


@dataclass
class Document:
    """Structured representation of a single BOC disposition."""

    year: int | None = None
    issue: int | None = None
    number: int | None = None
    date: str | None = None
    section: str | None = None
    organization: str | None = None
    identifier: str | None = None
    pdf_url: str | None = None
    title: str | None = None
    body_paragraphs: list[str] = field(default_factory=list)


class FormatReader(ABC):
    """Abstract reader for a specific BOC PDF format era."""

    @classmethod
    @abstractmethod
    def detect(cls, pdf: pdfplumber.PDF) -> bool:
        """Return True if this reader can handle the given PDF."""

    @abstractmethod
    def read(self, pdf: pdfplumber.PDF) -> list[Document]:
        """Parse the PDF into one Document per disposition."""


def _yaml_str(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def build_markdown(doc: Document) -> str:
    """Render a Document as Markdown with YAML frontmatter."""
    lines = ["---"]
    if doc.year is not None:
        lines.append(f"year: {doc.year}")
    if doc.issue is not None:
        lines.append(f"issue: {doc.issue}")
    if doc.number is not None:
        lines.append(f"number: {doc.number}")
    if doc.date is not None:
        lines.append(f"date: {_yaml_str(doc.date)}")
    if doc.organization is not None:
        lines.append(f"entity: {_yaml_str(doc.organization)}")
    if doc.section is not None:
        lines.append(f"section: {_yaml_str(doc.section)}")
    if doc.organization is not None:
        lines.append(f"organization: {_yaml_str(doc.organization)}")
    if doc.identifier is not None:
        lines.append(f"identifier: {_yaml_str(doc.identifier)}")
    if doc.pdf_url is not None:
        lines.append(f"pdf: {_yaml_str(doc.pdf_url)}")
    lines.append("---")
    lines.append("")

    if doc.title:
        lines.append(f"# {doc.title}")
        lines.append("")

    if doc.body_paragraphs:
        lines.append("\n\n".join(doc.body_paragraphs))

    return "\n".join(lines)
