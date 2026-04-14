"""Tests for the publish entrypoint."""

import importlib
from unittest.mock import MagicMock

import pytest


@pytest.fixture
def publish_module(monkeypatch, tmp_path):
    monkeypatch.setenv("INPUT_DIR", str(tmp_path))
    import publish
    return importlib.reload(publish)


class TestPublish:
    def test_sends_records_to_correct_topics(self, publish_module, monkeypatch, tmp_path):
        (tmp_path / "events.csv").write_text("events-csv")
        (tmp_path / "mentions.csv").write_text("mentions-csv")
        (tmp_path / "gkg.csv").write_text("gkg-csv")

        monkeypatch.setattr(publish_module, "parse_events", lambda _: [{"global_event_id": 1}])
        monkeypatch.setattr(publish_module, "parse_mentions", lambda _: [{"global_event_id": 2}])
        monkeypatch.setattr(publish_module, "parse_gkg", lambda _: [{"gkg_record_id": "r-3"}])
        publish_module.PARSER_MAP["events"] = publish_module.parse_events
        publish_module.PARSER_MAP["mentions"] = publish_module.parse_mentions
        publish_module.PARSER_MAP["gkg"] = publish_module.parse_gkg

        mock_producer = MagicMock()
        monkeypatch.setattr(publish_module, "KafkaProducer", lambda **kw: mock_producer)

        publish_module.main()

        sent_topics = [call.args[0] for call in mock_producer.send.call_args_list]
        sent_keys = [call.kwargs["key"] for call in mock_producer.send.call_args_list]
        assert sent_topics == ["gdelt.events", "gdelt.mentions", "gdelt.gkg"]
        assert sent_keys == [1, 2, "r-3"]
        mock_producer.flush.assert_called_once()
        mock_producer.close.assert_called_once()

    def test_fails_fast_when_csv_missing(self, publish_module):
        with pytest.raises(FileNotFoundError, match="Missing input CSVs"):
            publish_module.main()
