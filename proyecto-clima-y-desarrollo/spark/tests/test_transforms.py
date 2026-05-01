"""Tests for the pure helpers that drive the OpenAQ backfill job."""

from __future__ import annotations

from pathlib import Path

import pytest

from transforms import (
    assert_safe_token,
    build_input_paths,
    load_iso_seed,
    parse_csv_list,
    parse_year_range,
    resolve_column_map,
)


class TestParseCsvList:
    def test_returns_empty_for_falsy(self):
        assert parse_csv_list(None) == []
        assert parse_csv_list("") == []
        assert parse_csv_list("   ") == []

    def test_strips_and_filters_blanks(self):
        assert parse_csv_list(" ES , , AR,BR ") == ["ES", "AR", "BR"]


class TestParseYearRange:
    def test_single_year(self):
        assert parse_year_range("2023") == [2023]

    def test_inclusive_range(self):
        assert parse_year_range("2020-2022") == [2020, 2021, 2022]

    def test_mixed_list(self):
        assert parse_year_range("2020,2022-2023,2025") == [2020, 2022, 2023, 2025]

    def test_dedupes_and_sorts(self):
        assert parse_year_range("2024,2022,2024,2020-2021") == [2020, 2021, 2022, 2024]

    def test_empty(self):
        assert parse_year_range("") == []
        assert parse_year_range(None) == []


class TestAssertSafeToken:
    @pytest.mark.parametrize("safe", ["ES", "openaq-data-archive", "climate.dev", "loc_123"])
    def test_accepts_safe(self, safe):
        assert assert_safe_token(safe, "X") == safe

    @pytest.mark.parametrize("unsafe", ["ES;DROP TABLE", "bucket name", "$injection", "value`tick"])
    def test_rejects_unsafe(self, unsafe):
        with pytest.raises(ValueError, match="Unsafe character"):
            assert_safe_token(unsafe, "X")


class TestResolveColumnMap:
    def test_resolves_canonical_names(self):
        actual = ["location_id", "sensors_id", "location", "datetime",
                  "lat", "lon", "parameter", "units", "value"]
        mapping = resolve_column_map(actual)
        assert mapping["location_id"] == "location_id"
        assert mapping["sensor_id"] == "sensors_id"
        assert mapping["latitude"] == "lat"
        assert mapping["longitude"] == "lon"
        assert mapping["unit"] == "units"
        assert mapping["datetime_utc"] == "datetime"

    def test_case_insensitive(self):
        actual = ["Location_ID", "Sensors_ID", "Location", "DateTime",
                  "Lat", "Lon", "Parameter", "Units", "Value"]
        mapping = resolve_column_map(actual)
        assert mapping["location_id"] == "Location_ID"
        assert mapping["latitude"] == "Lat"

    def test_raises_on_missing(self):
        with pytest.raises(ValueError, match="missing expected columns"):
            resolve_column_map(["only_one_column"])


class TestBuildInputPaths:
    def test_cartesian_product(self):
        paths = build_input_paths("openaq-data-archive", [10, 20], [2022, 2023])
        assert paths == [
            "s3a://openaq-data-archive/records/csv.gz/locationid=10/year=2022/",
            "s3a://openaq-data-archive/records/csv.gz/locationid=10/year=2023/",
            "s3a://openaq-data-archive/records/csv.gz/locationid=20/year=2022/",
            "s3a://openaq-data-archive/records/csv.gz/locationid=20/year=2023/",
        ]

    def test_rejects_empty_inputs(self):
        with pytest.raises(ValueError):
            build_input_paths("b", [], [2022])
        with pytest.raises(ValueError):
            build_input_paths("b", [1], [])


class TestLoadIsoSeed:
    def test_reads_seed_csv(self, tmp_path: Path):
        seed = tmp_path / "iso.csv"
        seed.write_text(
            "iso2,iso3,wb_code,country_name\n"
            "ES,ESP,ESP,Spain\n"
            "ar,arg,arg,Argentina\n"  # lowercase to verify normalization
            ",,,blank row\n",
            encoding="utf-8",
        )
        mapping = load_iso_seed(seed)
        assert mapping == {"ES": "ESP", "AR": "ARG"}

    def test_empty_seed_raises(self, tmp_path: Path):
        seed = tmp_path / "iso.csv"
        seed.write_text("iso2,iso3,wb_code,country_name\n", encoding="utf-8")
        with pytest.raises(ValueError, match="empty"):
            load_iso_seed(seed)
