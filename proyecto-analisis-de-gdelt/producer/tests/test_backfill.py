"""Tests for the backfill entrypoint."""

import importlib
from datetime import datetime
from unittest.mock import MagicMock

import pytest


@pytest.fixture
def backfill_module():
    import backfill
    return importlib.reload(backfill)


class TestSlotParsing:
    def test_parse_slot_accepts_aligned_timestamp(self, backfill_module):
        assert backfill_module.parse_slot("20260419001500") == datetime(2026, 4, 19, 0, 15, 0)

    @pytest.mark.parametrize("value", ["20260419000100", "20260419001501", "20260419001000"])
    def test_parse_slot_rejects_unaligned(self, backfill_module, value):
        with pytest.raises(ValueError, match="not aligned"):
            backfill_module.parse_slot(value)

    def test_iter_slots_inclusive_range(self, backfill_module):
        start = datetime(2026, 4, 19, 0, 0)
        end = datetime(2026, 4, 19, 0, 30)
        slots = list(backfill_module.iter_slots(start, end))
        assert slots == [
            datetime(2026, 4, 19, 0, 0),
            datetime(2026, 4, 19, 0, 15),
            datetime(2026, 4, 19, 0, 30),
        ]

    def test_iter_slots_rejects_inverted_range(self, backfill_module):
        start = datetime(2026, 4, 19, 0, 30)
        end = datetime(2026, 4, 19, 0, 0)
        with pytest.raises(ValueError, match="must be <="):
            list(backfill_module.iter_slots(start, end))


class TestUrls:
    def test_urls_for_builds_three_gdelt_urls(self, backfill_module):
        urls = backfill_module.urls_for(datetime(2026, 4, 19, 0, 15))
        assert urls == {
            "events": "http://data.gdeltproject.org/gdeltv2/20260419001500.export.CSV.zip",
            "mentions": "http://data.gdeltproject.org/gdeltv2/20260419001500.mentions.CSV.zip",
            "gkg": "http://data.gdeltproject.org/gdeltv2/20260419001500.gkg.csv.zip",
        }


class TestMain:
    def test_publishes_each_slot_to_correct_topics(self, backfill_module, monkeypatch):
        downloaded_urls: list[str] = []

        def fake_download(url):
            downloaded_urls.append(url)
            return f"csv-for:{url}"

        monkeypatch.setattr(backfill_module, "download_and_extract", fake_download)
        backfill_module.PARSER_MAP["events"] = lambda _: [{"global_event_id": 1}]
        backfill_module.PARSER_MAP["mentions"] = lambda _: [{"global_event_id": 2}]
        backfill_module.PARSER_MAP["gkg"] = lambda _: [{"gkg_record_id": "r-3"}]

        mock_producer = MagicMock()
        monkeypatch.setattr(backfill_module, "KafkaProducer", lambda **kw: mock_producer)

        backfill_module.main(["20260419000000", "20260419001500"])

        # Two slots × three file types = 6 downloads
        assert len(downloaded_urls) == 6
        assert "20260419000000.export.CSV.zip" in downloaded_urls[0]
        assert "20260419001500.gkg.csv.zip" in downloaded_urls[-1]

        sent_topics = [call.args[0] for call in mock_producer.send.call_args_list]
        # Each slot sends events, mentions, gkg (one record each). Two slots.
        assert sent_topics == [
            "gdelt.events", "gdelt.mentions", "gdelt.gkg",
            "gdelt.events", "gdelt.mentions", "gdelt.gkg",
        ]
        sent_keys = [call.kwargs["key"] for call in mock_producer.send.call_args_list]
        assert sent_keys == [1, 2, "r-3", 1, 2, "r-3"]

        mock_producer.flush.assert_called_once()
        mock_producer.close.assert_called_once()

    def test_stops_on_slot_failure_and_closes_producer(self, backfill_module, monkeypatch):
        call_count = {"n": 0}

        def fake_download(url):
            call_count["n"] += 1
            # Fail on the second slot's first download (slot index 2 → call 4)
            if call_count["n"] == 4:
                raise RuntimeError("boom")
            return "csv"

        monkeypatch.setattr(backfill_module, "download_and_extract", fake_download)
        backfill_module.PARSER_MAP["events"] = lambda _: []
        backfill_module.PARSER_MAP["mentions"] = lambda _: []
        backfill_module.PARSER_MAP["gkg"] = lambda _: []

        mock_producer = MagicMock()
        monkeypatch.setattr(backfill_module, "KafkaProducer", lambda **kw: mock_producer)

        with pytest.raises(RuntimeError, match="boom"):
            backfill_module.main(["20260419000000", "20260419003000"])

        # Slot 1 fully downloaded (3), slot 2 failed on first (1): 4 calls, third slot never started.
        assert call_count["n"] == 4
        mock_producer.close.assert_called_once()

    def test_rejects_wrong_arg_count(self, backfill_module):
        with pytest.raises(SystemExit, match="Usage"):
            backfill_module.main(["20260419000000"])
