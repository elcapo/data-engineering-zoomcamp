"""Shared fixtures for the openaq producer tests."""

from __future__ import annotations

import pytest


@pytest.fixture
def sample_locations() -> list[dict]:
    return [
        {
            "id": 1001,
            "name": "Madrid - Plaza del Carmen",
            "country": {"id": 24, "code": "ES", "name": "Spain"},
            "coordinates": {"latitude": 40.4189, "longitude": -3.7034},
            "sensors": [
                {"id": 7001, "name": "pm25 µg/m³", "parameter": {"id": 1, "name": "pm25", "units": "µg/m³"}},
                {"id": 7002, "name": "no2 ppm", "parameter": {"id": 5, "name": "no2", "units": "ppm"}},
            ],
        },
        {
            "id": 1002,
            "name": "Barcelona - Eixample",
            "country": {"id": 24, "code": "ES", "name": "Spain"},
            "coordinates": {"latitude": 41.3851, "longitude": 2.1734},
            "sensors": [
                {"id": 7003, "name": "pm10 µg/m³", "parameter": {"id": 2, "name": "pm10", "units": "µg/m³"}},
            ],
        },
    ]


@pytest.fixture
def sample_latest() -> list[dict]:
    return [
        {
            "datetime": {"utc": "2026-05-01T13:00:00Z", "local": "2026-05-01T15:00:00+02:00"},
            "value": 12.3,
            "coordinates": {"latitude": 40.4189, "longitude": -3.7034},
            "sensorsId": 7001,
            "locationsId": 1001,
        },
        {
            "datetime": {"utc": "2026-05-01T13:00:00Z", "local": "2026-05-01T15:00:00+02:00"},
            "value": 0.022,
            "coordinates": {"latitude": 40.4189, "longitude": -3.7034},
            "sensorsId": 7002,
            "locationsId": 1001,
        },
        {
            # sensor not in lookup — should be skipped
            "datetime": {"utc": "2026-05-01T13:00:00Z", "local": "2026-05-01T15:00:00+02:00"},
            "value": 8.0,
            "coordinates": {"latitude": 0, "longitude": 0},
            "sensorsId": 99999,
            "locationsId": 1001,
        },
    ]
