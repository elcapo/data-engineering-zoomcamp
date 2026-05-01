"""Build (location, sensor) lookups and assemble Kafka-ready measurement records."""

from __future__ import annotations

from typing import Any, Iterable


def build_sensor_lookup(locations: Iterable[dict[str, Any]]) -> dict[tuple[int, int], dict[str, Any]]:
    """Map (location_id, sensor_id) → enrichment fields needed to publish a record."""
    lookup: dict[tuple[int, int], dict[str, Any]] = {}
    for loc in locations:
        loc_id = loc.get("id")
        if loc_id is None:
            continue
        country = loc.get("country") or {}
        coords = loc.get("coordinates") or {}
        for sensor in loc.get("sensors") or []:
            sensor_id = sensor.get("id")
            if sensor_id is None:
                continue
            parameter = sensor.get("parameter") or {}
            lookup[(int(loc_id), int(sensor_id))] = {
                "location_name": loc.get("name"),
                "country_iso": country.get("code"),
                "parameter": parameter.get("name"),
                "unit": parameter.get("units"),
                "latitude": coords.get("latitude"),
                "longitude": coords.get("longitude"),
            }
    return lookup


def to_records(
    latest_results: Iterable[dict[str, Any]],
    lookup: dict[tuple[int, int], dict[str, Any]],
    parameters_whitelist: set[str],
) -> tuple[list[dict[str, Any]], int]:
    """Transform `/latest` payload into publishable records.

    Returns (records, skipped_count). A measurement is skipped when its sensor
    is not in the lookup (stale list) or its parameter is not whitelisted.
    """
    records: list[dict[str, Any]] = []
    skipped = 0
    for raw in latest_results:
        loc_id = raw.get("locationsId")
        sensor_id = raw.get("sensorsId")
        if loc_id is None or sensor_id is None:
            skipped += 1
            continue
        meta = lookup.get((int(loc_id), int(sensor_id)))
        if meta is None or not meta.get("parameter"):
            skipped += 1
            continue
        if meta["parameter"] not in parameters_whitelist:
            skipped += 1
            continue
        datetime_obj = raw.get("datetime") or {}
        datetime_utc = datetime_obj.get("utc")
        if datetime_utc is None or raw.get("value") is None:
            skipped += 1
            continue
        records.append({
            "location_id": int(loc_id),
            "location_name": meta["location_name"],
            "country_iso": meta["country_iso"],
            "sensor_id": int(sensor_id),
            "parameter": meta["parameter"],
            "unit": meta["unit"],
            "value": raw["value"],
            "datetime_utc": datetime_utc,
            "datetime_local": datetime_obj.get("local"),
            "latitude": meta["latitude"],
            "longitude": meta["longitude"],
        })
    return records, skipped


def record_key(record: dict[str, Any]) -> str:
    return f"{record['location_id']}:{record['parameter']}:{record['datetime_utc']}"
