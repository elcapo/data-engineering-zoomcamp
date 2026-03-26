import pytest
from pathlib import Path

from archive_parser.parser import parse_year_index

BASE_URL = "https://www.gobiernodecanarias.org/boc/archivo/"


# ---------------------------------------------------------------------------
# Estructura del resultado
# ---------------------------------------------------------------------------


def test_returns_list(archive_html):
    result = parse_year_index(archive_html)
    assert isinstance(result, list)


def test_each_record_has_required_keys(archive_html):
    for record in parse_year_index(archive_html):
        assert "year" in record
        assert "absolute_link" in record


def test_year_is_four_digit_int(archive_html):
    for record in parse_year_index(archive_html):
        assert isinstance(record["year"], int)
        assert 1000 <= record["year"] <= 9999


def test_links_are_absolute(archive_html):
    for record in parse_year_index(archive_html):
        assert record["absolute_link"].startswith(BASE_URL)


# ---------------------------------------------------------------------------
# Deduplicación
# ---------------------------------------------------------------------------


def test_no_duplicate_years(archive_html):
    result = parse_year_index(archive_html)
    years = [r["year"] for r in result]
    assert len(years) == len(set(years))


# ---------------------------------------------------------------------------
# Contenido esperado del ejemplo real
# ---------------------------------------------------------------------------


def test_contains_known_years(archive_html):
    years = {r["year"] for r in parse_year_index(archive_html)}
    # Años presentes en el archivo de ejemplo
    assert 2026 in years
    assert 2025 in years
    assert 2024 in years


def test_link_for_known_year(archive_html):
    result = parse_year_index(archive_html)
    by_year = {r["year"]: r for r in result}
    assert by_year[2026]["absolute_link"] == BASE_URL + "2026/"


# ---------------------------------------------------------------------------
# Casos límite
# ---------------------------------------------------------------------------


def test_empty_html_returns_empty_list():
    assert parse_year_index("") == []


def test_html_without_archive_links_returns_empty_list():
    html = "<html><body><a href='https://example.com/'>Not a BOC link</a></body></html>"
    assert parse_year_index(html) == []


def test_relative_links_are_resolved():
    html = f'<html><body><a href="./2023/">2023</a></body></html>'
    result = parse_year_index(html)
    assert len(result) == 1
    assert result[0]["absolute_link"] == BASE_URL + "2023/"


def test_absolute_links_are_accepted():
    html = f'<html><body><a href="{BASE_URL}2020/">2020</a></body></html>'
    result = parse_year_index(html)
    assert len(result) == 1
    assert result[0]["year"] == 2020
