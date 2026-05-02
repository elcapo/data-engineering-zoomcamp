"""Pure helpers for the OpenAQ backfill job.

These functions don't touch Spark directly so they can be unit-tested without
spinning up a SparkSession. Anything that does need Spark lives in
`openaq_backfill.py` and is glue code on top of these primitives.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path

# OpenAQ S3 dump column names vary slightly between snapshots. We accept any
# of the aliases below for each canonical field and fail loudly if none match.
_COLUMN_ALIASES: dict[str, tuple[str, ...]] = {
    "location_id":    ("location_id", "locationid", "locations_id"),
    "sensor_id":      ("sensors_id", "sensor_id", "sensorid"),
    "location_name":  ("location", "location_name", "name"),
    "parameter":      ("parameter", "parameter_name"),
    "unit":           ("units", "unit"),
    "value":          ("value", "measurement_value"),
    "datetime_utc":   ("datetime", "datetime_utc", "utc"),
    "latitude":       ("lat", "latitude"),
    "longitude":      ("lon", "lng", "longitude"),
}

# Strict allowlist for CLI / env values that we forward into shell-rendered
# Spark configs and S3 paths. Mirrors flink/jobs/sql_loader.py:_sanitize.
_SAFE_TOKEN = re.compile(r"^[A-Za-z0-9_.\-]+$")


def parse_csv_list(raw: str | None) -> list[str]:
    """Split a comma-separated string into a stripped, non-empty list."""
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def parse_year_range(raw: str | None) -> list[int]:
    """Accept '2022', '2020-2023', or '2020,2021,2024' and return a sorted unique list."""
    if not raw:
        return []
    years: set[int] = set()
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        if "-" in token:
            start, end = token.split("-", 1)
            years.update(range(int(start), int(end) + 1))
        else:
            years.add(int(token))
    return sorted(years)


def assert_safe_token(value: str, name: str) -> str:
    if not _SAFE_TOKEN.match(value):
        raise ValueError(
            f"Unsafe character in '{name}'={value!r}: only alphanumerics, "
            f"dots, underscores and hyphens are allowed"
        )
    return value


def resolve_column_map(actual_columns: list[str]) -> dict[str, str]:
    """Map canonical names → actual CSV column names. Raises if any are missing."""
    lower = {c.lower(): c for c in actual_columns}
    resolved: dict[str, str] = {}
    missing: list[str] = []
    for canonical, aliases in _COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in lower:
                resolved[canonical] = lower[alias]
                break
        else:
            missing.append(canonical)
    if missing:
        raise ValueError(
            f"OpenAQ dump is missing expected columns: {missing}. "
            f"Available: {actual_columns}"
        )
    return resolved


def build_input_paths(
    bucket: str,
    location_ids: list[int],
    years: list[int],
) -> list[str]:
    """Build s3a:// paths matching the OpenAQ archive layout.

    Layout: s3://openaq-data-archive/records/csv.gz/locationid={lid}/year={year}/
    Each leaf contains month/day partitions of CSV.gz files; Spark recurses.
    """
    if not location_ids:
        raise ValueError("location_ids is empty")
    if not years:
        raise ValueError("years is empty")
    paths: list[str] = []
    for lid in location_ids:
        for year in years:
            paths.append(f"s3a://{bucket}/records/csv.gz/locationid={int(lid)}/year={int(year)}/")
    return paths


_PATH_RE = re.compile(r"^s3a://([^/]+)/records/csv\.gz/locationid=(\d+)/year=(\d+)/?$")


def filter_existing_paths(spark, bucket: str, paths: list[str]) -> list[str]:
    """Drop paths that don't exist in the source bucket.

    PySpark's read.csv(paths) raises AnalysisException atomically if any path
    is missing — and the OpenAQ S3 dump is sparse (not every (location, year)
    combo exists). We use the JVM-side Hadoop FileSystem so no extra Python
    deps (boto3) are needed; hadoop-aws is already on the classpath.

    For efficiency, we list each `locationid=N/` directory once (one HTTP call)
    and check membership locally instead of doing one `exists` per (location,
    year) pair (which would be ~6× more network calls).
    """
    sc = spark.sparkContext
    URI = sc._jvm.java.net.URI
    Path_ = sc._jvm.org.apache.hadoop.fs.Path
    FileSystem = sc._jvm.org.apache.hadoop.fs.FileSystem
    fs = FileSystem.get(URI(f"s3a://{bucket}"), sc._jsc.hadoopConfiguration())

    # Group candidate paths by location for one list call per location.
    by_loc: dict[str, list[str]] = {}
    unparseable: list[str] = []
    for p in paths:
        m = _PATH_RE.match(p)
        if m:
            by_loc.setdefault(m.group(2), []).append(p)
        else:
            unparseable.append(p)

    # Fall back to per-path exists for paths that don't match the layout.
    kept = [p for p in unparseable if fs.exists(Path_(p))]

    for lid, candidates in by_loc.items():
        loc_dir = f"s3a://{bucket}/records/csv.gz/locationid={lid}/"
        if not fs.exists(Path_(loc_dir)):
            continue
        existing_years: set[str] = set()
        for status in fs.listStatus(Path_(loc_dir)):
            child = status.getPath().getName()  # e.g. "year=2022"
            if child.startswith("year="):
                existing_years.add(child[len("year="):])
        for cand in candidates:
            year = _PATH_RE.match(cand).group(3)
            if year in existing_years:
                kept.append(cand)
    return kept


def load_iso_seed(seed_path: Path) -> dict[str, str]:
    """Read the ISO2 → ISO3 mapping CSV used by both Spark and dbt seeds."""
    mapping: dict[str, str] = {}
    with seed_path.open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            iso2 = (row.get("iso2") or "").strip().upper()
            iso3 = (row.get("iso3") or "").strip().upper()
            if iso2 and iso3:
                mapping[iso2] = iso3
    if not mapping:
        raise ValueError(f"ISO seed at {seed_path} is empty or malformed")
    return mapping
