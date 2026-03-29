import json

import pytest

from issue_reader import read, read_to_json


def test_read_returns_dict(pdf_2001):
    result = read(pdf_2001)
    assert isinstance(result, dict)
    assert "year" in result
    assert "dispositions" in result


def test_read_to_json_is_valid_json(pdf_2001):
    json_str = read_to_json(pdf_2001)
    data = json.loads(json_str)
    assert data["year"] == 2001


def test_read_to_json_uses_ensure_ascii_false(pdf_2001):
    json_str = read_to_json(pdf_2001)
    assert "Educación" in json_str


def test_read_accepts_string_path(pdf_2001):
    result = read(str(pdf_2001))
    assert result["year"] == 2001


def test_read_unknown_format_raises(tmp_path):
    # Create a minimal PDF that won't match any format
    dummy = tmp_path / "dummy.pdf"
    dummy.write_text("not a PDF")
    with pytest.raises(Exception):
        read(dummy)
