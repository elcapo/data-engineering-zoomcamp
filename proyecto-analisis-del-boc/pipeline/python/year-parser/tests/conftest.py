import pytest
from pathlib import Path

EXAMPLES_DIR = Path(__file__).parent.parent / "examples"


@pytest.fixture(scope="session")
def html_2025_path() -> Path:
    return EXAMPLES_DIR / "2025.html"


@pytest.fixture(scope="session")
def html_1980_path() -> Path:
    return EXAMPLES_DIR / "1980.html"


@pytest.fixture(scope="session")
def html_2025(html_2025_path) -> str:
    return html_2025_path.read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def html_1980(html_1980_path) -> str:
    return html_1980_path.read_text(encoding="utf-8")
