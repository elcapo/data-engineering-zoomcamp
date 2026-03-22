from pathlib import Path

import pytest

EXAMPLES = Path(__file__).parent.parent / "examples"


@pytest.fixture(scope="session")
def html_2026_path() -> Path:
    return EXAMPLES / "2026-001-001.html"


@pytest.fixture(scope="session")
def html_2026(html_2026_path: Path) -> str:
    return html_2026_path.read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def html_1980_path() -> Path:
    return EXAMPLES / "1980-001-001.html"


@pytest.fixture(scope="session")
def html_1980(html_1980_path: Path) -> str:
    return html_1980_path.read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def html_2026_003_path() -> Path:
    return EXAMPLES / "2026-003-007.html"


@pytest.fixture(scope="session")
def html_2026_003(html_2026_003_path: Path) -> str:
    return html_2026_003_path.read_text(encoding="utf-8")
