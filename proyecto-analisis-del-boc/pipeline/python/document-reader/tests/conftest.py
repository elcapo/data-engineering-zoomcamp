from pathlib import Path

import pytest

EXAMPLES = Path(__file__).parent.parent / "examples"


@pytest.fixture(scope="session")
def pdf_2019_path() -> Path:
    return EXAMPLES / "boc-a-2019-229-5624.pdf"
