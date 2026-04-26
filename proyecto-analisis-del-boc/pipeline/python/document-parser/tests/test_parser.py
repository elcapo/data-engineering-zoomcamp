import pytest

from document_parser import parse, parse_file

_PDF_2026_003 = "https://sede.gobiernodecanarias.org/boc/boc-a-2026-003-39.pdf"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def result_2026(html_2026):
    return parse(html_2026)


@pytest.fixture(scope="module")
def result_1980(html_1980):
    return parse(html_1980)


# ---------------------------------------------------------------------------
# Structure
# ---------------------------------------------------------------------------


class TestStructure:
    def test_returns_string(self, result_2026):
        assert isinstance(result_2026, str)

    def test_starts_with_frontmatter(self, result_2026):
        assert result_2026.startswith("---\n")

    def test_frontmatter_is_closed(self, result_2026):
        # At least two "---" separators: open and close
        assert result_2026.count("---") >= 2

    def test_parse_file_accepts_path(self, html_2026_path):
        result = parse_file(html_2026_path)
        assert isinstance(result, str)
        assert result.startswith("---\n")

    def test_parse_file_accepts_string_path(self, html_2026_path):
        result = parse_file(str(html_2026_path))
        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# Modern format (2026)
# ---------------------------------------------------------------------------


class TestFrontmatter2026:
    def test_year(self, result_2026):
        assert "year: 2026" in result_2026

    def test_issue(self, result_2026):
        assert "issue: 1" in result_2026

    def test_document(self, result_2026):
        assert 'document: "001"' in result_2026

    def test_date(self, result_2026):
        assert 'date: "2026-01-02"' in result_2026

    def test_entity(self, result_2026):
        assert "Consejería de Presidencia" in result_2026

    def test_section(self, result_2026):
        assert "II. Autoridades y personal" in result_2026

    def test_subsection(self, result_2026):
        assert "Oposiciones y concursos" in result_2026

    def test_identifier(self, result_2026):
        assert 'identifier: "BOC-A-2026-001-1"' in result_2026

    def test_pdf_url(self, result_2026):
        assert "https://sede.gobiernodecanarias.org/boc/boc-a-2026-001-1.pdf" in result_2026

    def test_signature_url(self, result_2026):
        assert "https://sede.gobiernodecanarias.org/boc/boc-a-2026-001-1.xsign" in result_2026


class TestTitle2026:
    def test_title_is_h1(self, result_2026):
        assert "# ORDEN de 22 de diciembre de 2025" in result_2026

    def test_title_comes_after_frontmatter(self, result_2026):
        frontmatter_end = result_2026.index("---\n", 4)  # second "---"
        h1_pos = result_2026.index("# ORDEN")
        assert h1_pos > frontmatter_end


class TestBody2026:
    def test_starts_with_first_paragraph(self, result_2026):
        assert "Por Resolución de la Secretaría" in result_2026

    def test_contains_resolution_keyword(self, result_2026):
        assert "RESUELVO:" in result_2026

    def test_ends_with_signatory(self, result_2026):
        assert result_2026.rstrip().endswith("Nieves Lady Barreto Hernández.")

    def test_paragraph_count(self, result_2026):
        body_start = result_2026.index("Por Resolución")
        body = result_2026[body_start:]
        assert body.count("\n\n") == 9  # 10 paragraphs

    def test_line_breaks_in_last_paragraph(self, result_2026):
        last_para = result_2026.split("\n\n")[-1]
        assert "LA CONSEJERA DE PRESIDENCIA," in last_para
        assert "\n" in last_para

    def test_no_html_tags(self, result_2026):
        assert "<span" not in result_2026
        assert "<p " not in result_2026
        assert "<br" not in result_2026

    def test_metadata_span_not_in_body(self, result_2026):
        # The pages/size metadata must not appear in the body
        assert "Formato de archivo en PDF" not in result_2026


# ---------------------------------------------------------------------------
# Historical format (1980)
# ---------------------------------------------------------------------------


class TestFrontmatter1980:
    def test_year(self, result_1980):
        assert "year: 1980" in result_1980

    def test_issue(self, result_1980):
        assert "issue: 1" in result_1980

    def test_document(self, result_1980):
        assert 'document: "001"' in result_1980

    def test_date(self, result_1980):
        assert 'date: "1980-04-01"' in result_1980

    def test_entity(self, result_1980):
        assert "Canarias Régimen Preautonómico" in result_1980

    def test_section(self, result_1980):
        assert "I. DISPOSICIONES GENERALES" in result_1980

    def test_no_subsection(self, result_1980):
        assert "subsection:" not in result_1980

    def test_no_identifier(self, result_1980):
        assert "identifier:" not in result_1980

    def test_pdf_url_is_absolute(self, result_1980):
        assert (
            "https://www.gobiernodecanarias.org/boc/1980/001/boc-1980-001-001.pdf"
            in result_1980
        )

    def test_no_signature(self, result_1980):
        assert "signature:" not in result_1980


class TestTitle1980:
    def test_title_is_h1(self, result_1980):
        assert "# REAL DECRETO-LEY 9/1978" in result_1980


class TestBody1980:
    def test_starts_with_first_paragraph(self, result_1980):
        assert "La insularidad" in result_1980

    def test_contains_additional_provision(self, result_1980):
        assert "DISPOSICION ADICIONAL" in result_1980

    def test_paragraph_count(self, result_1980):
        body_start = result_1980.index("La insularidad")
        body = result_1980[body_start:]
        assert body.count("\n\n") == 7  # 8 paragraphs

    def test_no_html_tags(self, result_1980):
        assert "<p" not in result_1980
        assert "<img" not in result_1980

    def test_pdf_link_not_in_body(self, result_1980):
        assert "Descargar en formato pdf" not in result_1980


# ---------------------------------------------------------------------------
# Inline links (2026-003)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def result_2026_003(html_2026_003):
    return parse(html_2026_003)


class TestInlineLinks:
    def test_link_rendered_as_markdown(self, result_2026_003):
        expected = f"[Descargar]({_PDF_2026_003})"
        assert expected in result_2026_003

    def test_space_before_link(self, result_2026_003):
        # "documento [Descargar](...)" — must have a space before the link
        assert f"del documento [{_PDF_2026_003}" not in result_2026_003
        assert f"documento [Descargar]({_PDF_2026_003})" in result_2026_003

    def test_no_bare_href_in_body(self, result_2026_003):
        # Links should appear as Markdown syntax, not as raw <a> tags
        assert "<a " not in result_2026_003
        assert "</a>" not in result_2026_003


# ---------------------------------------------------------------------------
# PDA format (2025)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def result_2025(html_2025):
    return parse(html_2025)


class TestFrontmatter2025:
    def test_year(self, result_2025):
        assert "year: 2025" in result_2025

    def test_issue(self, result_2025):
        assert "issue: 68" in result_2025

    def test_number(self, result_2025):
        assert "number: 1352" in result_2025

    def test_section(self, result_2025):
        assert "III. Otras Resoluciones" in result_2025

    def test_no_subsection(self, result_2025):
        assert "subsection:" not in result_2025

    def test_organization(self, result_2025):
        assert "Consejería de Economía, Industria, Comercio y Autónomos" in result_2025

    def test_pdf_url(self, result_2025):
        assert "https://sede.gobiernodecanarias.org/boc/boc-a-2025-068-1352.pdf" in result_2025

    def test_no_meta_date(self, result_2025):
        # PDA pages have no META tags, so date is absent
        assert "date:" not in result_2025

    def test_no_meta_entity(self, result_2025):
        assert "entity:" not in result_2025

    def test_no_identifier(self, result_2025):
        assert "identifier:" not in result_2025


class TestTitle2025:
    def test_title_is_h1(self, result_2025):
        assert "# Dirección General de Promoción y Diversificación Económica" in result_2025


class TestBody2025:
    def test_starts_with_first_paragraph(self, result_2025):
        assert "ANTECEDENTES" in result_2025

    def test_no_html_tags(self, result_2025):
        assert "<p" not in result_2025
        assert "<img" not in result_2025

    def test_pdf_link_not_in_body(self, result_2025):
        assert "Descargar en formato pdf" not in result_2025


# ---------------------------------------------------------------------------
# Tolerant decoding (2009-037-008 has a stray non-UTF-8 byte)
# ---------------------------------------------------------------------------


class TestNonUtf8Bytes:
    def test_parse_file_does_not_raise(self, html_2009_path):
        # Real BOC document with a 0x8d byte in the body; must not raise.
        result = parse_file(html_2009_path)
        assert isinstance(result, str)
        assert result.startswith("---\n")

    def test_frontmatter_extracted(self, html_2009_path):
        result = parse_file(html_2009_path)
        assert "year: 2009" in result
        assert "issue: 37" in result
