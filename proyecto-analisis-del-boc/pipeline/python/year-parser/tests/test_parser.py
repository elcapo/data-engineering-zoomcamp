import pytest

from year_parser.parser import parse_issue_index

BASE_URL = "https://www.gobiernodecanarias.org"


# ---------------------------------------------------------------------------
# Estructura del resultado
# ---------------------------------------------------------------------------


def test_returns_list(html_2025):
    assert isinstance(parse_issue_index(html_2025), list)


def test_each_record_has_required_keys(html_2025):
    for record in parse_issue_index(html_2025):
        assert "label" in record
        assert "url" in record
        assert "year" in record
        assert "issue" in record


def test_urls_are_absolute(html_2025):
    for record in parse_issue_index(html_2025):
        assert record["url"].startswith(BASE_URL)


def test_labels_start_with_boc(html_2025):
    for record in parse_issue_index(html_2025):
        assert record["label"].startswith("BOC")


# ---------------------------------------------------------------------------
# Año 2025 — formato moderno (href con index.html)
# ---------------------------------------------------------------------------


def test_2025_total_count(html_2025):
    assert len(parse_issue_index(html_2025)) == 258


def test_2025_first_entry(html_2025):
    first = parse_issue_index(html_2025)[0]
    assert first["label"] == "BOC Nº 1 - 2 de enero de 2025 - Jueves"
    assert first["url"] == f"{BASE_URL}/boc/2025/001/index.html"
    assert first["year"] == 2025
    assert first["issue"] == 1


def test_2025_last_entry(html_2025):
    last = parse_issue_index(html_2025)[-1]
    assert last["label"] == "BOC Nº 258 - 31 de diciembre de 2025 - Miércoles"
    assert last["url"] == f"{BASE_URL}/boc/2025/258/index.html"
    assert last["year"] == 2025
    assert last["issue"] == 258


# ---------------------------------------------------------------------------
# Año 1980 — formato histórico (href sin index.html, con enlaces PDF intercalados)
# ---------------------------------------------------------------------------


def test_1980_total_count(html_1980):
    assert len(parse_issue_index(html_1980)) == 4


def test_1980_first_entry(html_1980):
    first = parse_issue_index(html_1980)[0]
    assert first["label"] == "BOC Nº 001 - 1 de Abril de 1980 - Martes"
    assert first["url"] == f"{BASE_URL}/boc/1980/001/"
    assert first["year"] == 1980
    assert first["issue"] == 1


def test_1980_pdf_links_excluded(html_1980):
    urls = [r["url"] for r in parse_issue_index(html_1980)]
    assert not any(u.endswith(".pdf") for u in urls)


def test_1980_order_is_preserved(html_1980):
    labels = [r["label"] for r in parse_issue_index(html_1980)]
    assert labels == [
        "BOC Nº 001 - 1 de Abril de 1980 - Martes",
        "BOC Nº 002 - 18 de Abril de 1980 - Viernes",
        "BOC Nº 003 - 2 de Junio de 1980 - Lunes",
        "BOC Nº 004 - 27 de Noviembre de 1980 - Jueves",
    ]


# ---------------------------------------------------------------------------
# Casos límite
# ---------------------------------------------------------------------------


def test_empty_html_returns_empty_list():
    assert parse_issue_index("") == []


def test_html_without_boc_links_returns_empty_list():
    html = "<html><body><a href='https://example.com/'>Not a BOC link</a></body></html>"
    assert parse_issue_index(html) == []
