"""Public API: detect the PDF format and dispatch to the right reader."""

from __future__ import annotations

from pathlib import Path

import pdfplumber

from .formats import READERS, build_markdown


def read(pdf_path: str | Path) -> str:
    """Read a single-disposition BOC PDF and return one Markdown document.

    Use this for modern (post-2010) per-disposition PDFs. For multi-disposition
    bulletins (2006-era), this returns the Markdown of the *first* disposition
    found; use :func:`read_all` to get them all.
    """
    docs = read_all(pdf_path)
    if not docs:
        return ""
    return docs[0]


def read_all(pdf_path: str | Path) -> list[str]:
    """Read a BOC PDF and return one Markdown document per disposition.

    Returns a list with a single element for per-disposition PDFs (modern era)
    and one element per disposition for whole-bulletin PDFs (2006 era).
    """
    path = Path(pdf_path)
    with pdfplumber.open(path) as pdf:
        reader_cls = _detect(pdf)
        if reader_cls is None:
            raise ValueError(f"No format reader recognises the PDF at {path}")
        documents = reader_cls().read(pdf)
    return [build_markdown(doc) for doc in documents]


def read_file(pdf_path: str | Path) -> str:
    """Alias for :func:`read` for symmetry with other pipeline modules."""
    return read(pdf_path)


def _detect(pdf: pdfplumber.PDF):
    for reader_cls in READERS:
        if reader_cls.detect(pdf):
            return reader_cls
    return None
