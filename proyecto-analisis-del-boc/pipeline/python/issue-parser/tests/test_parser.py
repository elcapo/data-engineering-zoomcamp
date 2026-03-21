import json
import pytest
from pathlib import Path

from issue_parser import parse, parse_to_json
from issue_parser.parser import parse


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
