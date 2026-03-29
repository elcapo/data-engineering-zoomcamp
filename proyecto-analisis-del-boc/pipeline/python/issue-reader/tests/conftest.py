import pytest
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent.parent / "examples"


@pytest.fixture(scope="session")
def pdf_2001() -> Path:
    return FIXTURES_DIR / "boc-2001-121.pdf"


@pytest.fixture(scope="session")
def pdf_2006() -> Path:
    return FIXTURES_DIR / "boc-2006-071.pdf"
