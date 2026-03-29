import pytest
from bs4 import BeautifulSoup

from issue_parser import parse
from issue_parser.formats.format_1982 import Format1982Parser
from issue_parser.formats.format_2026 import Format2026Parser
from issue_parser.formats.format_pdf_only import FormatPdfOnlyParser


@pytest.fixture(scope="module")
def result(html_pdf_only):
    return parse(html_pdf_only)


@pytest.fixture(scope="module")
def soup_pdf_only(html_pdf_only):
    return BeautifulSoup(html_pdf_only.read_text(encoding="utf-8"), "html.parser")


@pytest.fixture(scope="module")
def soup_1982(html_1982):
    return BeautifulSoup(html_1982.read_text(encoding="utf-8"), "html.parser")


@pytest.fixture(scope="module")
def soup_2026(html_2026):
    return BeautifulSoup(html_2026.read_text(encoding="utf-8"), "html.parser")


class TestDetection:
    def test_detects_pdf_only_format(self, soup_pdf_only):
        assert FormatPdfOnlyParser.detect(soup_pdf_only) is True

    def test_does_not_detect_1982_format(self, soup_1982):
        assert FormatPdfOnlyParser.detect(soup_1982) is False

    def test_does_not_detect_2026_format(self, soup_2026):
        assert FormatPdfOnlyParser.detect(soup_2026) is False

    def test_other_parsers_do_not_detect_pdf_only(self, soup_pdf_only):
        assert Format1982Parser.detect(soup_pdf_only) is False
        assert Format2026Parser.detect(soup_pdf_only) is False


class TestBocMetadata:
    def test_year(self, result):
        assert result["year"] == 2001

    def test_issue(self, result):
        assert result["issue"] == 121

    def test_title(self, result):
        assert result["title"] == "BOC Nº 121. Viernes 14 de Septiembre de 2001"

    def test_url(self, result):
        assert result["url"] == "https://www.gobiernodecanarias.org/boc/2001/121/"

    def test_summary_pdf_url(self, result):
        assert result["summary"]["url"] == (
            "https://www.gobiernodecanarias.org/boc/2001/121/boc-2001-121.pdf"
        )

    def test_summary_signature_is_none(self, result):
        assert result["summary"]["signature"] is None


class TestDispositions:
    def test_dispositions_are_empty(self, result):
        assert result["dispositions"] == []
