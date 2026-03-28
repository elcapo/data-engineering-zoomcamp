import json
import pytest
from bs4 import BeautifulSoup
from pathlib import Path

from issue_parser import parse, parse_to_json
from issue_parser.parser import parse
from issue_parser.formats.base import extract_year_and_number


def test_parse_1982_returns_dict(html_1982):
    result = parse(html_1982)
    assert isinstance(result, dict)
    assert "dispositions" in result


def test_parse_2026_returns_dict(html_2026):
    result = parse(html_2026)
    assert isinstance(result, dict)
    assert "dispositions" in result


def test_parse_to_json_is_valid_json(html_1982, html_2026):
    for path in (html_1982, html_2026):
        output = parse_to_json(path)
        data = json.loads(output)
        assert isinstance(data, dict)


def test_parse_to_json_uses_ensure_ascii_false(html_2026):
    output = parse_to_json(html_2026)
    # Spanish characters should appear as-is, not escaped
    assert "ú" in output or "ó" in output or "á" in output


def test_parse_accepts_string_path(html_1982):
    result = parse(str(html_1982))
    assert result["year"] == 1982


def test_parse_unknown_format_raises(tmp_path):
    unknown_html = tmp_path / "unknown.html"
    unknown_html.write_text("<html><body><p>No BOC structure here</p></body></html>")
    with pytest.raises(ValueError, match="Unrecognized BOC format"):
        parse(unknown_html)


class TestExtractYearAndNumber:
    def test_from_title_tag(self):
        soup = BeautifulSoup("<title>BOC - 2026/47.</title>", "html.parser")
        assert extract_year_and_number(soup) == (2026, 47)

    def test_from_h2_when_title_missing(self):
        soup = BeautifulSoup(
            "<html><h2>BOC Nº 168. Martes 28 de Agosto de 2012</h2></html>",
            "html.parser",
        )
        assert extract_year_and_number(soup) == (2012, 168)

    def test_from_h2_when_title_has_no_pattern(self):
        soup = BeautifulSoup(
            "<html><title>Gobierno de Canarias</title>"
            "<h2>BOC Nº 011. Sábado 27 de Febrero de 1982</h2></html>",
            "html.parser",
        )
        assert extract_year_and_number(soup) == (1982, 11)

    def test_returns_none_when_no_info(self):
        soup = BeautifulSoup("<html><body></body></html>", "html.parser")
        assert extract_year_and_number(soup) == (None, None)
