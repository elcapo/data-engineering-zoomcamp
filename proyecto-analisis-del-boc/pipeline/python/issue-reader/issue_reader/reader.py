import json
from pathlib import Path

import pdfplumber

from .formats import READERS


def read(pdf_path: str | Path) -> dict:
    """Read a BOC PDF file and return its structured data as a dict."""
    path = Path(pdf_path)
    pdf = pdfplumber.open(path)

    for reader_class in READERS:
        if reader_class.detect(pdf):
            return reader_class().read(pdf)

    raise ValueError(f"Unrecognized BOC PDF format: {path}")


def read_to_json(pdf_path: str | Path, indent: int = 4) -> str:
    """Read a BOC PDF file and return its structured data as a JSON string."""
    return json.dumps(read(pdf_path), ensure_ascii=False, indent=indent)
