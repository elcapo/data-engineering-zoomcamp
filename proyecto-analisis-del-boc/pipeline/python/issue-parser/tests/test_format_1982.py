import pytest
from bs4 import BeautifulSoup
from pathlib import Path

from issue_parser import parse
from issue_parser.formats.format_1982 import Format1982Parser
from issue_parser.formats.format_2026 import Format2026Parser


@pytest.fixture(scope="module")
def result(html_1982):
    return parse(html_1982)


@pytest.fixture(scope="module")
def soup_1982(html_1982):
    return BeautifulSoup(html_1982.read_text(encoding="utf-8"), "html.parser")


@pytest.fixture(scope="module")
def soup_2026(html_2026):
    return BeautifulSoup(html_2026.read_text(encoding="utf-8"), "html.parser")


class TestDetection:
    def test_detects_1982_format(self, soup_1982):
        assert Format1982Parser.detect(soup_1982) is True

    def test_does_not_detect_2026_format(self, soup_2026):
        assert Format1982Parser.detect(soup_2026) is False


class TestBocMetadata:
    def test_year(self, result):
        assert result["year"] == 1982

    def test_issue(self, result):
        assert result["issue"] == 11

    def test_title(self, result):
        assert result["title"] == "BOC Nº 011. Sábado 27 de Febrero de 1982"

    def test_url(self, result):
        assert result["url"] == "https://www.gobiernodecanarias.org/boc/1982/011/"

    def test_summary_pdf_url(self, result):
        assert result["summary"]["url"] == (
            "https://www.gobiernodecanarias.org/boc/1982/011/boc-1982-011.pdf"
        )

    def test_summary_signature_is_none(self, result):
        assert result["summary"]["signature"] is None


class TestDispositions:
    def test_total_count(self, result):
        # BOC 1982/011 contains dispositions 001–011 (items 162–172)
        assert len(result["dispositions"]) == 11

    def test_first_disposition_matches_reference(self, result):
        d = result["dispositions"][0]
        assert d["section"] == "Disposiciones Generales"
        assert d["subsection"] is None
        assert d["organization"] == "Junta de Canarias"
        assert d["summary"] == (
            "162 REAL DECRETO 3.393/1981, de 29 de Diciembre, "
            "sobre indemnizaciones por residencia."
        )
        assert d["metadata"] is None
        assert d["identifier"] is None
        assert d["html"] == "https://www.gobiernodecanarias.org/boc/1982/011/001.html"
        assert d["pdf"] == (
            "https://www.gobiernodecanarias.org/boc/1982/011/boc-1982-011-001.pdf"
        )
        assert d["signature"] is None

    def test_sections_are_extracted(self, result):
        sections = {d["section"] for d in result["dispositions"]}
        assert "Disposiciones Generales" in sections
        assert "Asuntos de Personal" in sections
        assert "Resoluciones" in sections
        assert "Anuncios" in sections
        assert "Administracion de Justicia" in sections

    def test_all_organizations_are_junta(self, result):
        orgs = {d["organization"] for d in result["dispositions"]}
        assert orgs == {"Junta de Canarias"}

    def test_no_subsections(self, result):
        assert all(d["subsection"] is None for d in result["dispositions"])

    def test_all_have_html_and_pdf_links(self, result):
        for d in result["dispositions"]:
            assert d["html"] is not None and d["html"].startswith("http")
            assert d["pdf"] is not None and d["pdf"].endswith(".pdf")

    def test_disposition_numbers_are_sequential(self, result):
        # Summary texts should start with the sequential number (162–172)
        for i, d in enumerate(result["dispositions"]):
            expected_num = str(162 + i)
            assert d["summary"].startswith(expected_num), (
                f"Disposition {i} should start with {expected_num}"
            )

    def test_first_disposition_number(self, result):
        assert result["dispositions"][0]["disposition"] == 1

    def test_disposition_field_is_sequential(self, result):
        for i, d in enumerate(result["dispositions"]):
            assert d["disposition"] == i + 1
