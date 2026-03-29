import pdfplumber
import pytest

from issue_reader import read
from issue_reader.formats.format_2006 import Format2006Reader


@pytest.fixture(scope="module")
def result(pdf_2006):
    return read(pdf_2006)


@pytest.fixture(scope="module")
def pdf(pdf_2006):
    return pdfplumber.open(pdf_2006)


class TestDetection:
    def test_detects_2006_format(self, pdf):
        assert Format2006Reader.detect(pdf) is True


class TestBocMetadata:
    def test_year(self, result):
        assert result["year"] == 2006

    def test_issue(self, result):
        assert result["issue"] == 71

    def test_title(self, result):
        assert result["title"] == "BOC Nº 71. Martes 11 de abril de 2006"

    def test_url(self, result):
        assert result["url"] == "https://www.gobiernodecanarias.org/boc/2006/071/"

    def test_summary_pdf_url(self, result):
        assert result["summary"]["url"] == (
            "https://www.gobiernodecanarias.org/boc/2006/071/boc-2006-071.pdf"
        )

    def test_summary_signature_is_none(self, result):
        assert result["summary"]["signature"] is None


class TestDispositions:
    def test_total_count(self, result):
        assert len(result["dispositions"]) == 14

    def test_first_disposition(self, result):
        d = result["dispositions"][0]
        assert d["disposition"] == 1
        assert d["section"] == "II. Autoridades y Personal"
        assert d["subsection"] == "Oposiciones y concursos"
        assert d["organization"] == "Consejería de Economía y Hacienda"
        assert d["summary"].startswith(
            "Orden de 23 de marzo de 2006, por la que se resuelve"
        )

    def test_sections_are_extracted(self, result):
        sections = {d["section"] for d in result["dispositions"]}
        assert "II. Autoridades y Personal" in sections
        assert "III. Otras Resoluciones" in sections
        assert "IV. Anuncios" in sections

    def test_subsections_are_extracted(self, result):
        subsections = {d["subsection"] for d in result["dispositions"] if d["subsection"]}
        assert "Oposiciones y concursos" in subsections
        assert "Anuncios de contratación" in subsections
        assert "Otros anuncios" in subsections
        assert "Administración Local" in subsections

    def test_organizations_are_extracted(self, result):
        orgs = {d["organization"] for d in result["dispositions"] if d["organization"]}
        assert "Consejería de Economía y Hacienda" in orgs
        assert "Presidencia del Gobierno" in orgs
        assert "Consejería de Empleo y Asuntos Sociales" in orgs

    def test_last_disposition_is_administracion_local(self, result):
        d = result["dispositions"][-1]
        assert d["subsection"] == "Administración Local"
        assert d["organization"] == "Cabildo Insular de Lanzarote"

    def test_missing_spaces_are_fixed(self, result):
        for d in result["dispositions"]:
            if d["subsection"]:
                assert "Local" not in d["subsection"] or " Local" in d["subsection"]
            if d["organization"]:
                assert "Insular de" in d["organization"] or "Insular" not in d["organization"]

    def test_hyphenated_words_are_rejoined(self, result):
        d = result["dispositions"][2]
        assert "publicación" in d["summary"]
        assert "publica-" not in d["summary"]

    def test_disposition_numbers_are_sequential(self, result):
        for i, d in enumerate(result["dispositions"]):
            assert d["disposition"] == i + 1

    def test_all_have_summary(self, result):
        for d in result["dispositions"]:
            assert d["summary"] is not None
            assert len(d["summary"]) > 10

    def test_pdf_matches_summary_url(self, result):
        expected_url = result["summary"]["url"]
        for d in result["dispositions"]:
            assert d["pdf"] == expected_url

    def test_html_signature_are_none(self, result):
        for d in result["dispositions"]:
            assert d["html"] is None
            assert d["signature"] is None

    def test_no_garbage_from_header_decoration(self, result):
        for d in result["dispositions"]:
            assert d["summary"] != "Mar-"
            assert "71" != d["summary"]

    def test_no_garbage_from_two_column_content(self, result):
        for d in result["dispositions"]:
            assert "NIVEL:" not in (d["summary"] or "")
            assert "D I S PO N G O" not in (d["summary"] or "")
