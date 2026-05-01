"""Tests for the World Bank payload parser."""

from __future__ import annotations

from worldbank.parse import parse_records


def test_skips_records_without_iso3(sample_payload):
    rows = list(parse_records(sample_payload, source_object="raw/x.json"))
    iso_codes = [row.country_iso3 for row in rows]
    assert iso_codes == ["ESP", "FRA"]


def test_preserves_null_values(sample_payload):
    rows = list(parse_records(sample_payload, source_object="raw/x.json"))
    france = next(row for row in rows if row.country_iso3 == "FRA")
    assert france.value is None
    assert france.country_name == "France"
    assert france.year == 2022


def test_includes_source_object(sample_payload):
    rows = list(parse_records(sample_payload, source_object="raw/source.json"))
    assert all(row.source_object == "raw/source.json" for row in rows)
