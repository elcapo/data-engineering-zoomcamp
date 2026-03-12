import pytest
from pathlib import Path

EXAMPLES_DIR = Path(__file__).parent.parent / "examples"


@pytest.fixture(scope="session")
def archive_html_path() -> Path:
    return EXAMPLES_DIR / "archive.html"


@pytest.fixture(scope="session")
def archive_html(archive_html_path) -> str:
    return archive_html_path.read_text(encoding="utf-8")
