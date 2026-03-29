import pytest
from bs4 import BeautifulSoup

from issue_parser import parse
from issue_parser.formats.format_2026 import Format2026Parser


@pytest.fixture(scope="module")
def result(html_2009):
    return parse(html_2009)


@pytest.fixture(scope="module")
def soup_2009(html_2009):
    return BeautifulSoup(html_2009.read_text(encoding="utf-8"), "html.parser")


class TestDetection:
    def test_detects_as_2026_variant(self, soup_2009):
        assert Format2026Parser.detect(soup_2009) is True


class TestBocMetadata:
    def test_year(self, result):
        assert result["year"] == 2009

    def test_issue(self, result):
        assert result["issue"] == 255

    def test_title(self, result):
        assert result["title"] == "BOC Nº 255. Jueves 31 de Diciembre de 2009"

    def test_url(self, result):
        assert result["url"] == "https://www.gobiernodecanarias.org/boc/2009/255/"

    def test_summary_pdf_url(self, result):
        assert result["summary"]["url"] == (
            "https://www.gobiernodecanarias.org/boc/2009/255/boc-2009-255.pdf"
        )

    def test_summary_signature_is_none(self, result):
        assert result["summary"]["signature"] is None


class TestDispositions:
    def test_total_count(self, result):
        assert len(result["dispositions"]) == 29

    def test_first_disposition(self, result):
        d = result["dispositions"][0]
        assert d["section"] == "Disposiciones Generales"
        assert d["subsection"] is None
        assert d["organization"] == "Presidencia del Gobierno"
        assert d["summary"].startswith("1968 LEY 13/2009")
        assert d["html"] == "https://www.gobiernodecanarias.org/boc/2009/255/001.html"
        assert d["pdf"] == "https://www.gobiernodecanarias.org/boc/2009/255/boc-2009-255-001.pdf"

    def test_disposition_with_subsection(self, result):
        d = result["dispositions"][2]
        assert d["section"] == "Autoridades y Personal"
        assert d["subsection"] == "Oposiciones y concursos"

    def test_sections_are_extracted(self, result):
        sections = {d["section"] for d in result["dispositions"]}
        assert "Disposiciones Generales" in sections
        assert "Autoridades y Personal" in sections
        assert "Otras Resoluciones" in sections
        assert "Anuncios" in sections

    def test_subsections_are_extracted(self, result):
        subsections = {d["subsection"] for d in result["dispositions"] if d["subsection"]}
        assert "Oposiciones y concursos" in subsections
        assert "Otros anuncios" in subsections
        assert "Administración Local" in subsections

    def test_all_have_html_and_pdf_links(self, result):
        for d in result["dispositions"]:
            assert d["html"] is not None and d["html"].endswith(".html")
            assert d["pdf"] is not None and d["pdf"].endswith(".pdf")

    def test_no_metadata_or_identifiers(self, result):
        for d in result["dispositions"]:
            assert d["metadata"] is None
            assert d["identifier"] is None
            assert d["signature"] is None
