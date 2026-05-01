"""End-to-end test of the poll CLI with mocked HTTP and a fake producer."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from openaq import poll
from openaq.config import Settings


@pytest.fixture
def settings(monkeypatch):
    monkeypatch.setenv("OPENAQ_API_KEY", "k")
    monkeypatch.setenv("OPENAQ_API_BASE_URL", "http://api.test")
    monkeypatch.setenv("KAFKA_BOOTSTRAP_SERVERS", "broker:9092")
    monkeypatch.setenv("OPENAQ_TOPIC", "openaq.measurements")
    return Settings.from_env()


def test_run_publishes_records_for_each_country(monkeypatch, settings, sample_locations, sample_latest):
    fake_client = MagicMock()
    fake_client.list_locations.return_value = sample_locations
    fake_client.get_latest.side_effect = [sample_latest, []]
    monkeypatch.setattr(poll, "OpenAQClient", lambda *args, **kwargs: fake_client)

    fake_producer = MagicMock()
    monkeypatch.setattr(poll, "build_producer", lambda _: fake_producer)

    published, skipped = poll.run(["ES"], ["pm25", "no2"], settings)

    assert published == 2  # pm25 + no2 from location 1001
    assert skipped == 1
    assert fake_client.list_locations.call_args.args == ("ES",)
    assert fake_client.get_latest.call_count == 2  # one per location
    fake_producer.flush.assert_called()
    fake_producer.close.assert_called_once()


def test_main_aborts_when_no_countries(monkeypatch):
    monkeypatch.setenv("OPENAQ_API_KEY", "k")
    monkeypatch.delenv("COUNTRIES", raising=False)
    with pytest.raises(SystemExit, match="No countries"):
        poll.main([])


def test_run_aborts_without_api_key(monkeypatch):
    monkeypatch.delenv("OPENAQ_API_KEY", raising=False)
    settings = Settings.from_env()
    with pytest.raises(SystemExit, match="OPENAQ_API_KEY"):
        poll.run(["ES"], ["pm25"], settings)


def test_max_locations_caps_get_latest_calls(monkeypatch, settings, sample_locations, sample_latest):
    many_locations = [
        {**sample_locations[0], "id": idx} for idx in range(1, 51)
    ]
    fake_client = MagicMock()
    fake_client.list_locations.return_value = many_locations
    fake_client.get_latest.return_value = sample_latest
    monkeypatch.setattr(poll, "OpenAQClient", lambda *args, **kwargs: fake_client)
    monkeypatch.setattr(poll, "build_producer", lambda _: MagicMock())

    poll.run(["ES"], ["pm25"], settings, max_locations=5)
    assert fake_client.get_latest.call_count == 5
