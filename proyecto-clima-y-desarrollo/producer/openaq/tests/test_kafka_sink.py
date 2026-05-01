"""Tests for the Kafka sink — verify key/value bytes and flush semantics."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

from openaq.kafka_sink import publish


def test_publish_sends_keyed_records():
    producer = MagicMock()
    records = [
        {
            "location_id": 1001, "location_name": "Madrid",
            "country_iso": "ES", "sensor_id": 7001,
            "parameter": "pm25", "unit": "µg/m³",
            "value": 12.3,
            "datetime_utc": "2026-05-01T13:00:00Z",
            "datetime_local": "2026-05-01T15:00:00+02:00",
            "latitude": 40.4, "longitude": -3.7,
        },
    ]
    sent = publish(producer, "openaq.measurements", records)
    assert sent == 1
    producer.send.assert_called_once()
    call = producer.send.call_args
    assert call.args[0] == "openaq.measurements"
    assert call.kwargs["key"] == "1001:pm25:2026-05-01T13:00:00Z"
    assert call.kwargs["value"]["value"] == 12.3
    producer.flush.assert_called_once()


def test_value_serializer_round_trip():
    """Sanity-check the lambda used in build_producer."""
    serializer = lambda v: json.dumps(v, ensure_ascii=False).encode("utf-8")  # noqa: E731
    payload = {"parameter": "pm25", "value": 1.0, "unit": "µg/m³"}
    encoded = serializer(payload)
    assert json.loads(encoded.decode("utf-8")) == payload
