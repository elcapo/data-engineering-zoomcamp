"""Tests for the download entrypoint."""

import importlib
from pathlib import Path

import pytest


@pytest.fixture
def download_module(monkeypatch, tmp_path):
    monkeypatch.setenv("OUTPUT_DIR", str(tmp_path))
    import download
    return importlib.reload(download)


class TestDownload:
    def test_writes_three_csvs(self, download_module, monkeypatch, tmp_path):
        monkeypatch.setattr(download_module, "fetch_latest_urls", lambda: {
            "events": "http://x/events.zip",
            "mentions": "http://x/mentions.zip",
            "gkg": "http://x/gkg.zip",
        })
        monkeypatch.setattr(download_module, "download_and_extract", lambda url: f"csv-for:{url}")

        download_module.main()

        assert (tmp_path / "events.csv").read_text() == "csv-for:http://x/events.zip"
        assert (tmp_path / "mentions.csv").read_text() == "csv-for:http://x/mentions.zip"
        assert (tmp_path / "gkg.csv").read_text() == "csv-for:http://x/gkg.zip"

    def test_failure_does_not_leave_partial(self, download_module, monkeypatch, tmp_path):
        monkeypatch.setattr(download_module, "fetch_latest_urls", lambda: {
            "events": "http://x/events.zip",
            "mentions": "http://x/mentions.zip",
            "gkg": "http://x/gkg.zip",
        })

        def fake_download(url):
            if "gkg" in url:
                raise RuntimeError("404 after retries")
            return f"csv-for:{url}"

        monkeypatch.setattr(download_module, "download_and_extract", fake_download)

        with pytest.raises(RuntimeError, match="404"):
            download_module.main()

        assert not (tmp_path / "gkg.csv").exists()
        assert not list(tmp_path.glob("*.tmp"))
