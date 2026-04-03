"""Core logic for fetching, parsing, and transforming GDELT v2 data."""

from __future__ import annotations

import io
import logging
import zipfile

import requests

logger = logging.getLogger(__name__)

LAST_UPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt"

# Column indices for each GDELT file type (0-based).
EVENT_COLUMNS = {
    0: "global_event_id",
    1: "sql_date",
    5: "actor1_code",
    6: "actor1_name",
    7: "actor1_country",
    15: "actor2_code",
    16: "actor2_name",
    17: "actor2_country",
    28: "event_root_code",
    29: "quad_class",
    30: "goldstein_scale",
    31: "num_mentions",
    32: "num_sources",
    33: "num_articles",
    51: "action_geo_type",
    52: "action_geo_name",
    56: "action_geo_lat",
    57: "action_geo_long",
    59: "date_added",
    60: "source_url",
}

MENTION_COLUMNS = {
    0: "global_event_id",
    1: "event_time_date",
    2: "mention_time_date",
    4: "mention_source",
    13: "mention_doc_tone",
}

GKG_COLUMNS = {
    0: "gkg_record_id",
    1: "gkg_date",
    3: "source_name",
    4: "document_id",
    7: "themes",
    9: "persons",
    10: "organizations",
    15: "tone_raw",
}

INT_FIELDS = {"global_event_id", "sql_date", "quad_class", "num_mentions",
              "num_sources", "num_articles", "action_geo_type", "word_count"}
BIGINT_FIELDS = {"date_added", "event_time_date", "mention_time_date", "gkg_date"}
FLOAT_FIELDS = {"goldstein_scale", "action_geo_lat", "action_geo_long",
                "mention_doc_tone", "tone", "positive_score", "negative_score"}


def _coerce(value: str, field: str):
    """Convert a raw string value to its appropriate Python type."""
    if not value:
        return None
    if field in INT_FIELDS:
        return int(value)
    if field in BIGINT_FIELDS:
        return int(value)
    if field in FLOAT_FIELDS:
        return float(value)
    return value


def fetch_latest_urls() -> dict[str, str]:
    """GET lastupdate.txt and return dict mapping type -> download URL.

    The file has 3 lines, each with: size hash url
    Order: export (events), mentions, gkg.
    """
    resp = requests.get(LAST_UPDATE_URL, timeout=30)
    resp.raise_for_status()
    lines = [line.strip() for line in resp.text.strip().splitlines() if line.strip()]
    names = ["events", "mentions", "gkg"]
    urls: dict[str, str] = {}
    for name, line in zip(names, lines):
        parts = line.split()
        urls[name] = parts[-1]  # URL is last token
    return urls


def download_and_extract(url: str) -> str:
    """Download a ZIP file and extract the single CSV inside it."""
    logger.info("Downloading %s", url)
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        csv_name = zf.namelist()[0]
        return zf.read(csv_name).decode("utf-8", errors="replace")


def _parse_rows(csv_text: str, columns: dict[int, str]) -> list[dict]:
    """Generic tab-delimited parser that extracts specific column indices."""
    max_idx = max(columns.keys())
    records: list[dict] = []
    for line in csv_text.splitlines():
        if not line:
            continue
        fields = line.split("\t")
        if len(fields) <= max_idx:
            continue
        record = {name: _coerce(fields[idx], name) for idx, name in columns.items()}
        records.append(record)
    return records


def parse_events(csv_text: str) -> list[dict]:
    return _parse_rows(csv_text, EVENT_COLUMNS)


def parse_mentions(csv_text: str) -> list[dict]:
    return _parse_rows(csv_text, MENTION_COLUMNS)


def parse_gkg(csv_text: str) -> list[dict]:
    """Parse GKG rows, splitting the tone subfield into individual scores."""
    raw = _parse_rows(csv_text, GKG_COLUMNS)
    for record in raw:
        tone_raw = record.pop("tone_raw", "") or ""
        parts = tone_raw.split(",")
        record["tone"] = float(parts[0]) if len(parts) > 0 and parts[0] else None
        record["positive_score"] = float(parts[1]) if len(parts) > 1 and parts[1] else None
        record["negative_score"] = float(parts[2]) if len(parts) > 2 and parts[2] else None
        record["word_count"] = int(parts[6]) if len(parts) > 6 and parts[6] else None
    return raw
