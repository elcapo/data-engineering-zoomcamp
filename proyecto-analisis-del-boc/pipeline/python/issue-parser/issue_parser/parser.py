import json
from pathlib import Path

from bs4 import BeautifulSoup

from .formats import PARSERS


def parse(html_path: str | Path) -> dict:
    """Parse a BOC HTML file and return its structured data as a dict."""
    path = Path(html_path)
    html = path.read_text(encoding="utf-8").replace("\x00", "")
    soup = BeautifulSoup(html, "html.parser")

    for parser_class in PARSERS:
        if parser_class.detect(soup):
            return parser_class().parse(soup)

    raise ValueError(f"Unrecognized BOC format: {path}")


def parse_to_json(html_path: str | Path, indent: int = 4) -> str:
    """Parse a BOC HTML file and return its structured data as a JSON string."""
    return json.dumps(parse(html_path), ensure_ascii=False, indent=indent)
