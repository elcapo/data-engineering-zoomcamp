"""Parse World Bank API payloads into typed rows for the warehouse."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable


@dataclass(frozen=True)
class IndicatorRow:
    indicator_code: str
    country_iso3: str
    country_name: str | None
    year: int
    value: float | None
    unit: str | None
    obs_status: str | None
    source_object: str


def parse_records(payload: dict[str, Any], source_object: str) -> Iterable[IndicatorRow]:
    """Yield one IndicatorRow per record with a non-empty ISO3 code.

    Records without `countryiso3code` are aggregates the API still returns
    (e.g. legacy region codes); skip them so the natural key holds.
    """
    for record in payload.get("records", []):
        iso3 = (record.get("countryiso3code") or "").strip()
        if not iso3:
            continue
        indicator = record.get("indicator") or {}
        country = record.get("country") or {}
        try:
            year = int(record["date"])
        except (KeyError, TypeError, ValueError):
            continue
        value = record.get("value")
        yield IndicatorRow(
            indicator_code=indicator.get("id") or "",
            country_iso3=iso3,
            country_name=country.get("value"),
            year=year,
            value=float(value) if value is not None else None,
            unit=record.get("unit") or None,
            obs_status=record.get("obs_status") or None,
            source_object=source_object,
        )
