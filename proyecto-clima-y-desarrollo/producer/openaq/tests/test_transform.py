"""Tests for the lookup builder and the latest→record transformer."""

from __future__ import annotations

from openaq.transform import build_sensor_lookup, record_key, to_records


def test_lookup_indexes_by_location_and_sensor(sample_locations):
    lookup = build_sensor_lookup(sample_locations)
    assert (1001, 7001) in lookup
    assert (1001, 7002) in lookup
    assert (1002, 7003) in lookup
    assert lookup[(1001, 7001)]["parameter"] == "pm25"
    assert lookup[(1001, 7002)]["unit"] == "ppm"
    assert lookup[(1002, 7003)]["country_iso"] == "ES"


def test_to_records_skips_unknown_sensors(sample_locations, sample_latest):
    lookup = build_sensor_lookup(sample_locations)
    records, skipped = to_records(sample_latest, lookup, {"pm25", "no2"})
    assert skipped == 1  # the sensor 99999 entry
    assert {(r["sensor_id"], r["parameter"]) for r in records} == {(7001, "pm25"), (7002, "no2")}


def test_to_records_filters_by_whitelist(sample_locations, sample_latest):
    lookup = build_sensor_lookup(sample_locations)
    records, skipped = to_records(sample_latest, lookup, {"pm25"})
    assert [r["parameter"] for r in records] == ["pm25"]
    assert skipped == 2  # no2 + unknown sensor


def test_to_records_skips_null_value():
    lookup = {(1, 1): {"parameter": "pm25", "unit": "µg/m³",
                       "location_name": None, "country_iso": "ES",
                       "latitude": 0, "longitude": 0}}
    latest = [{
        "datetime": {"utc": "2026-05-01T00:00:00Z"},
        "value": None,
        "locationsId": 1, "sensorsId": 1,
    }]
    records, skipped = to_records(latest, lookup, {"pm25"})
    assert records == []
    assert skipped == 1


def test_record_key_format():
    assert record_key({
        "location_id": 1001, "parameter": "pm25",
        "datetime_utc": "2026-05-01T13:00:00Z",
    }) == "1001:pm25:2026-05-01T13:00:00Z"
