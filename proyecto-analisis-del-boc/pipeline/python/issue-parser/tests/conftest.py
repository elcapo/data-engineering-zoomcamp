import pytest
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent.parent / "examples"


@pytest.fixture(scope="session")
def html_1982() -> Path:
    return FIXTURES_DIR / "boc-1982_011.html"


@pytest.fixture(scope="session")
def html_2026() -> Path:
    return FIXTURES_DIR / "boc-2026_47.html"


@pytest.fixture(scope="session")
def html_2009() -> Path:
    return FIXTURES_DIR / "boc-2009_255.html"


@pytest.fixture(scope="session")
def html_pdf_only() -> Path:
    return FIXTURES_DIR / "boc-2001_121.html"
