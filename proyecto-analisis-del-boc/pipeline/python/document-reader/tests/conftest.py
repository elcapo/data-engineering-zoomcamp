from pathlib import Path

import pytest

EXAMPLES = Path(__file__).parent.parent / "examples"
ISSUE_READER_EXAMPLES = (
    Path(__file__).parent.parent.parent / "issue-reader" / "examples"
)


@pytest.fixture(scope="session")
def pdf_2019_path() -> Path:
    return EXAMPLES / "boc-a-2019-229-5624.pdf"


@pytest.fixture(scope="session")
def pdf_2006_bulletin_path() -> Path:
    """The 2006/071 bulletin PDF, shared with issue-reader's fixtures."""
    return ISSUE_READER_EXAMPLES / "boc-2006-071.pdf"
