import pytest
from bs4 import BeautifulSoup

from issue_parser import parse
from issue_parser.formats.format_1982 import Format1982Parser
from issue_parser.formats.format_2026 import Format2026Parser


@pytest.fixture(scope="module")
def result(html_2026):
    return parse(html_2026)


@pytest.fixture(scope="module")
def soup_2026(html_2026):
    return BeautifulSoup(html_2026.read_text(encoding="utf-8"), "html.parser")


@pytest.fixture(scope="module")
def soup_1982(html_1982):
    return BeautifulSoup(html_1982.read_text(encoding="utf-8"), "html.parser")


class TestDetection:
    def test_detects_2026_format(self, soup_2026):
        assert Format2026Parser.detect(soup_2026) is True

    def test_does_not_detect_1982_format(self, soup_1982):
        assert Format2026Parser.detect(soup_1982) is False


class TestBocMetadata:
    def test_year(self, result):
        assert result["year"] == 2026

    def test_issue(self, result):
        assert result["issue"] == 47

    def test_title(self, result):
        assert result["title"] == "BOC Nº 47. Martes 10 de marzo de 2026"

    def test_url(self, result):
        assert result["url"] == "https://www.gobiernodecanarias.org/boc/2026/047/"

    def test_summary_pdf_url(self, result):
        assert result["summary"]["url"] == (
            "https://sede.gobiernodecanarias.org/boc/boc-s-2026-047.pdf"
        )

    def test_summary_signature_url(self, result):
        assert result["summary"]["signature"] == (
            "https://sede.gobiernodecanarias.org/boc/boc-s-2026-047.xsign"
        )


class TestDispositions:
    def test_total_count(self, result):
        # BOC 2026/47 contains dispositions 762–782
        assert len(result["dispositions"]) == 21

    def test_first_disposition_matches_reference(self, result):
        d = result["dispositions"][0]
        assert d["section"] == "Disposiciones Generales"
        assert d["subsection"] is None
        assert d["organization"] == "Presidencia del Gobierno"
        assert d["summary"].startswith("762 DECRETO ley 2/2026")
        assert d["metadata"] == (
            "6 páginas. Formato de archivo en PDF/Adobe Acrobat. Tamaño: 206.97 Kb."
        )
        assert d["identifier"] is not None
        assert "BOC-A-2026-047-762" in d["identifier"]
        assert d["html"] == "https://www.gobiernodecanarias.org/boc/2026/047/762.html"
        assert d["pdf"] == "https://sede.gobiernodecanarias.org/boc/boc-a-2026-047-762.pdf"
        assert d["signature"] == "https://sede.gobiernodecanarias.org/boc/boc-a-2026-047-762.xsign"

    def test_second_disposition_has_subsection(self, result):
        d = result["dispositions"][1]
        assert d["section"] == "Autoridades y Personal"
        assert d["subsection"] == "Oposiciones y concursos"
        assert d["organization"] == "Consejería de Hacienda y Relaciones con la Unión Europea"

    def test_sections_are_extracted(self, result):
        sections = {d["section"] for d in result["dispositions"]}
        assert "Disposiciones Generales" in sections
        assert "Autoridades y Personal" in sections
        assert "Otras Resoluciones" in sections
        assert "Anuncios" in sections

    def test_subsections_are_extracted(self, result):
        subsections = {d["subsection"] for d in result["dispositions"]}
        assert "Oposiciones y concursos" in subsections
        assert "Otros anuncios" in subsections
        assert None in subsections  # Some dispositions have no subsection

    def test_all_have_html_pdf_and_signature_links(self, result):
        for d in result["dispositions"]:
            assert d["html"] is not None and d["html"].endswith(".html")
            assert d["pdf"] is not None and d["pdf"].endswith(".pdf")
            assert d["signature"] is not None and d["signature"].endswith(".xsign")

    def test_all_have_metadata(self, result):
        for d in result["dispositions"]:
            assert d["metadata"] is not None
            assert "Formato de archivo en PDF/Adobe Acrobat" in d["metadata"]

    def test_all_have_identifier(self, result):
        for d in result["dispositions"]:
            assert d["identifier"] is not None
            assert "BOC-A-2026-047" in d["identifier"]

    def test_disposition_numbers_are_sequential(self, result):
        # Summary texts should start with the sequential number (762–782)
        for i, d in enumerate(result["dispositions"]):
            expected_num = str(762 + i)
            assert d["summary"].startswith(expected_num), (
                f"Disposition {i} should start with {expected_num}"
            )

    def test_first_disposition_number(self, result):
        assert result["dispositions"][0]["disposition"] == 762

    def test_disposition_field_is_sequential(self, result):
        for i, d in enumerate(result["dispositions"]):
            assert d["disposition"] == 762 + i

    def test_administracion_local_section(self, result):
        admin_local = [
            d for d in result["dispositions"]
            if d["section"] == "Administración Local"
        ]
        assert len(admin_local) == 3  # dispositions 779, 780, 781

    def test_otras_administraciones_section(self, result):
        otras = [
            d for d in result["dispositions"]
            if d["section"] == "Otras Administraciones Públicas"
        ]
        assert len(otras) == 1  # disposition 782
