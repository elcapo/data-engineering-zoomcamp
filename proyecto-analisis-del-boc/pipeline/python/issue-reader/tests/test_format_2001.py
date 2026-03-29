import pdfplumber
import pytest

from issue_reader import read
from issue_reader.formats.format_2001 import Format2001Reader


@pytest.fixture(scope="module")
def result(pdf_2001):
    return read(pdf_2001)


@pytest.fixture(scope="module")
def pdf(pdf_2001):
    return pdfplumber.open(pdf_2001)


class TestDetection:
    def test_detects_2001_format(self, pdf):
        assert Format2001Reader.detect(pdf) is True


class TestBocMetadata:
    def test_year(self, result):
        assert result["year"] == 2001

    def test_issue(self, result):
        assert result["issue"] == 121

    def test_title(self, result):
        assert result["title"] == "BOC Nº 121. Viernes, 14 de septiembre de 2001"

    def test_url(self, result):
        assert result["url"] == "https://www.gobiernodecanarias.org/boc/2001/121/"

    def test_summary_pdf_url(self, result):
        assert result["summary"]["url"] == (
            "https://www.gobiernodecanarias.org/boc/2001/121/boc-2001-121.pdf"
        )

    def test_summary_signature_is_none(self, result):
        assert result["summary"]["signature"] is None


class TestDispositions:
    def test_total_count(self, result):
        assert len(result["dispositions"]) == 55

    def test_first_disposition(self, result):
        d = result["dispositions"][0]
        assert d["disposition"] == 1
        assert d["section"] == "Autoridades y Personal"
        assert d["subsection"] == "Oposiciones y concursos"
        assert d["organization"] == (
            "Consejería de Presidencia e Innovación Tecnológica"
        )
        assert d["summary"].startswith(
            "Dirección General de Relaciones con la Administración de Justicia.-"
        )

    def test_sections_are_extracted(self, result):
        sections = {d["section"] for d in result["dispositions"]}
        assert "Autoridades y Personal" in sections
        assert "Otras Resoluciones" in sections
        assert "Anuncios" in sections

    def test_subsections_are_extracted(self, result):
        subsections = {d["subsection"] for d in result["dispositions"] if d["subsection"]}
        assert "Oposiciones y concursos" in subsections
        assert "Anuncios de contratación" in subsections
        assert "Otros anuncios" in subsections
        assert "Administración Local" in subsections

    def test_organizations_are_extracted(self, result):
        orgs = {d["organization"] for d in result["dispositions"] if d["organization"]}
        assert "Consejería de Educación, Cultura y Deportes" in orgs
        assert "Consejería de Economía, Hacienda y Comercio" in orgs
        assert "Consejería de Sanidad y Consumo" in orgs

    def test_last_disposition_is_administracion_local(self, result):
        d = result["dispositions"][-1]
        assert d["subsection"] == "Administración Local"
        assert d["organization"] == "Ayuntamiento de Yaiza (Lanzarote)"

    def test_no_garbage_from_two_column_content(self, result):
        for d in result["dispositions"]:
            assert "R E S U E LVO" not in (d["section"] or "")
            assert "R E S U E LVO" not in (d["summary"] or "")

    def test_hyphenated_words_are_rejoined(self, result):
        d = result["dispositions"][0]
        assert "temporal" in d["summary"]
        assert "tempo- ral" not in d["summary"]

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
