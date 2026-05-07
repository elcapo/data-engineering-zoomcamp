"""Tests for Format2006Reader on whole-bulletin PDFs."""

import pdfplumber
import pytest

from document_reader import read_all
from document_reader.formats.format_2006 import Format2006Reader


@pytest.fixture(scope="module")
def documents(pdf_2006_bulletin_path):
    with pdfplumber.open(pdf_2006_bulletin_path) as pdf:
        return Format2006Reader().read(pdf)


@pytest.fixture(scope="module")
def markdowns(pdf_2006_bulletin_path):
    return read_all(pdf_2006_bulletin_path)


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------


class TestDetection:
    def test_detects_2006_bulletin(self, pdf_2006_bulletin_path):
        with pdfplumber.open(pdf_2006_bulletin_path) as pdf:
            assert Format2006Reader.detect(pdf) is True

    def test_does_not_detect_modern_per_disposition(self, pdf_2019_path):
        with pdfplumber.open(pdf_2019_path) as pdf:
            assert Format2006Reader.detect(pdf) is False


# ---------------------------------------------------------------------------
# Disposition splitting
# ---------------------------------------------------------------------------


class TestDispositions:
    def test_total_count(self, documents):
        assert len(documents) == 14

    def test_first_global_number(self, documents):
        assert documents[0].number == 473

    def test_last_global_number(self, documents):
        assert documents[-1].number == 1236

    def test_numbers_strictly_increasing(self, documents):
        numbers = [d.number for d in documents]
        assert numbers == sorted(numbers)
        assert len(set(numbers)) == 14

    def test_all_have_a_title(self, documents):
        for d in documents:
            assert d.title
            assert len(d.title) > 10

    def test_all_have_body(self, documents):
        for d in documents:
            assert d.body_paragraphs
            assert sum(len(p) for p in d.body_paragraphs) > 50


# ---------------------------------------------------------------------------
# Bulletin metadata propagated to every disposition
# ---------------------------------------------------------------------------


class TestBulletinMetadata:
    def test_year(self, documents):
        for d in documents:
            assert d.year == 2006

    def test_issue(self, documents):
        for d in documents:
            assert d.issue == 71

    def test_date(self, documents):
        for d in documents:
            assert d.date == "2006-04-11"

    def test_pdf_url_points_to_bulletin(self, documents):
        expected = "https://www.gobiernodecanarias.org/boc/2006/071/boc-2006-071.pdf"
        for d in documents:
            assert d.pdf_url == expected


# ---------------------------------------------------------------------------
# Section / organization extraction
# ---------------------------------------------------------------------------


class TestSectionsAndOrganizations:
    def test_section_split(self, documents):
        by_section: dict[str, list[int]] = {}
        for d in documents:
            by_section.setdefault(d.section, []).append(d.number)
        assert by_section["Autoridades y Personal"] == [473, 474]
        assert by_section["Otras Resoluciones"] == [475, 476]
        assert by_section["Anuncios"] == [
            1227, 1228, 1229, 1230, 1231, 1232, 1233, 1234, 1235, 1236
        ]

    def test_organization_changes_within_section(self, documents):
        anuncios = [d for d in documents if d.section == "Anuncios"]
        orgs = {d.organization for d in anuncios}
        assert "Consejería de Empleo y Asuntos Sociales" in orgs
        assert "Cabildo Insular de Lanzarote" in orgs

    def test_first_disposition_organization(self, documents):
        assert documents[0].organization == "Consejería de Economía y Hacienda"

    def test_last_disposition_organization(self, documents):
        assert documents[-1].organization == "Cabildo Insular de Lanzarote"


# ---------------------------------------------------------------------------
# Body content quality
# ---------------------------------------------------------------------------


class TestBodyQuality:
    def test_no_sumario_tail_leaks_into_body(self, documents):
        # The sumario continuation lines for the last entries (e.g. about
        # "Cabildo Insular de Lanzarote") sit in the right column of the
        # transition page and must not leak into the first disposition's body.
        first_body = " ".join(documents[0].body_paragraphs)
        assert "Página 7030" not in first_body
        assert "Página 7031" not in first_body
        assert "ión de Resoluciones" not in first_body

    def test_no_page_header_in_body(self, documents):
        for d in documents:
            for paragraph in d.body_paragraphs:
                assert "Boletín Oficial de Canarias núm. 71" not in paragraph

    def test_first_body_starts_with_correct_paragraph(self, documents):
        first_paragraph = documents[0].body_paragraphs[0]
        assert first_paragraph.startswith(
            "Efectuada convocatoria pública para la provisión"
        )

    def test_hyphenation_is_rejoined(self, documents):
        # "modi-ficada" wraps across lines and must be rejoined.
        body = " ".join(documents[0].body_paragraphs)
        assert "modificada" in body
        assert "modi- ficada" not in body
        assert "modi-ficada" not in body

    def test_real_words_are_not_split(self, documents):
        # The over-aggressive "(de|del|la|las|los)" splitter used to break
        # "desde" into "des de"; verify it stays whole in the body.
        body = " ".join(documents[0].body_paragraphs)
        assert "desde el día siguiente" in body


# ---------------------------------------------------------------------------
# Public API integration
# ---------------------------------------------------------------------------


class TestReadAllIntegration:
    def test_returns_14_markdowns(self, markdowns):
        assert len(markdowns) == 14

    def test_each_has_frontmatter(self, markdowns):
        for md in markdowns:
            assert md.startswith("---\n")
            assert md.count("---") >= 2

    def test_each_has_title_h1(self, markdowns):
        for md in markdowns:
            assert "\n# " in md

    def test_first_markdown_has_correct_number(self, markdowns):
        assert "number: 473" in markdowns[0]

    def test_last_markdown_has_correct_number(self, markdowns):
        assert "number: 1236" in markdowns[-1]
