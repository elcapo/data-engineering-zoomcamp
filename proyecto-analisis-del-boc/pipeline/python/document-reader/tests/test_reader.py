import pytest

from document_reader import read, read_file


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def result_2019(pdf_2019_path):
    return read(pdf_2019_path)


# ---------------------------------------------------------------------------
# Structure
# ---------------------------------------------------------------------------


class TestStructure:
    def test_returns_string(self, result_2019):
        assert isinstance(result_2019, str)

    def test_starts_with_frontmatter(self, result_2019):
        assert result_2019.startswith("---\n")

    def test_frontmatter_is_closed(self, result_2019):
        # The frontmatter delimiters appear at least twice (open + close).
        assert result_2019.count("---") >= 2

    def test_read_file_accepts_path(self, pdf_2019_path):
        result = read_file(pdf_2019_path)
        assert isinstance(result, str)
        assert result.startswith("---\n")

    def test_read_file_accepts_string_path(self, pdf_2019_path):
        result = read_file(str(pdf_2019_path))
        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# Frontmatter
# ---------------------------------------------------------------------------


class TestFrontmatter:
    def test_year(self, result_2019):
        assert "year: 2019" in result_2019

    def test_issue(self, result_2019):
        assert "issue: 229" in result_2019

    def test_number(self, result_2019):
        assert "number: 5624" in result_2019

    def test_date(self, result_2019):
        assert 'date: "2019-11-26"' in result_2019

    def test_section(self, result_2019):
        assert 'section: "IV. Administración de Justicia"' in result_2019

    def test_organization(self, result_2019):
        assert (
            'organization: "Juzgado de Primera Instancia nº 2 de San Bartolomé de Tirajana"'
            in result_2019
        )

    def test_entity(self, result_2019):
        assert (
            'entity: "Juzgado de Primera Instancia nº 2 de San Bartolomé de Tirajana"'
            in result_2019
        )

    def test_identifier(self, result_2019):
        assert 'identifier: "BOC-A-2019-229-5624"' in result_2019

    def test_pdf_url(self, result_2019):
        assert (
            'pdf: "https://sede.gobiernodecanarias.org/boc/boc-a-2019-229-5624.pdf"'
            in result_2019
        )


# ---------------------------------------------------------------------------
# Title
# ---------------------------------------------------------------------------


class TestTitle:
    def test_title_is_h1(self, result_2019):
        assert "# EDICTO de 11 de julio de 2019" in result_2019

    def test_title_includes_continuation(self, result_2019):
        # The italic continuation line on the next visual line must be merged
        # into the title.
        assert "procedimiento ordinario nº 0000233/2018." in result_2019

    def test_title_does_not_contain_number(self, result_2019):
        # The disposition number "5624" appears in the frontmatter but not in
        # the title body.
        title_line = next(l for l in result_2019.splitlines() if l.startswith("# "))
        assert "5624" not in title_line

    def test_title_comes_after_frontmatter(self, result_2019):
        frontmatter_end = result_2019.index("---\n", 4)  # second "---"
        h1_pos = result_2019.index("# EDICTO")
        assert h1_pos > frontmatter_end


# ---------------------------------------------------------------------------
# Body
# ---------------------------------------------------------------------------


class TestBody:
    def test_starts_with_first_paragraph(self, result_2019):
        assert "D./Dña. Mónica Vera Hartmann" in result_2019

    def test_contains_inline_smallcaps(self, result_2019):
        # "HACE SABER:" is rendered with 9 pt small caps inline; it must merge
        # with its surrounding 11 pt body line into a single paragraph.
        assert (
            "HACE SABER: que en este Juzgado se ha dictado sentencia"
            in result_2019
        )

    def test_standalone_smallcaps_kept(self, result_2019):
        # "SENTENCIA" and "FALLO:" are standalone small-caps lines and must
        # appear as their own paragraphs.
        assert "\n\nSENTENCIA\n\n" in result_2019
        assert "\n\nFALLO:\n\n" in result_2019

    def test_paragraph_breaks_detected(self, result_2019):
        # Several distinct paragraphs separated by blank lines.
        body_start = result_2019.index("D./Dña. Mónica")
        body = result_2019[body_start:]
        assert body.count("\n\n") >= 8

    def test_ends_with_signatory(self, result_2019):
        assert result_2019.rstrip().endswith(
            "El/la Letrado/a de la Administración de Justicia."
        )

    def test_no_header_in_body(self, result_2019):
        assert "Boletín Oficial de Canarias" not in result_2019

    def test_no_footer_in_body(self, result_2019):
        assert "sede.gobcan.es" not in result_2019
        # The raw lowercase identifier from the footer should not appear in the
        # body — only the uppercase canonical form in the frontmatter.
        body_start = result_2019.index("D./Dña. Mónica")
        assert "boc-a-2019-229-5624" not in result_2019[body_start:]

    def test_no_pagina_marker(self, result_2019):
        # The rotated "Página" side-marker must be discarded.
        body_start = result_2019.index("D./Dña. Mónica")
        body = result_2019[body_start:]
        assert "Página" not in body
