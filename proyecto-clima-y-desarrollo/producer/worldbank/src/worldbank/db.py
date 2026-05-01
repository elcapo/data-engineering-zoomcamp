"""Postgres landing for parsed World Bank records."""

from __future__ import annotations

import logging
from typing import Iterable

import psycopg

from worldbank.config import Settings
from worldbank.parse import IndicatorRow

logger = logging.getLogger(__name__)

UPSERT_SQL = """
INSERT INTO raw.worldbank_indicators_raw
    (indicator_code, country_iso3, country_name, year, value, unit, obs_status, source_object)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (indicator_code, country_iso3, year) DO UPDATE SET
    country_name = EXCLUDED.country_name,
    value = EXCLUDED.value,
    unit = EXCLUDED.unit,
    obs_status = EXCLUDED.obs_status,
    source_object = EXCLUDED.source_object,
    ingested_at = now();
"""


def connect(settings: Settings) -> psycopg.Connection:
    return psycopg.connect(
        host=settings.postgres_host,
        port=settings.postgres_port,
        user=settings.postgres_user,
        password=settings.postgres_password,
        dbname=settings.postgres_db,
    )


def upsert_rows(conn: psycopg.Connection, rows: Iterable[IndicatorRow]) -> int:
    payload = [
        (
            row.indicator_code,
            row.country_iso3,
            row.country_name,
            row.year,
            row.value,
            row.unit,
            row.obs_status,
            row.source_object,
        )
        for row in rows
    ]
    if not payload:
        return 0
    with conn.cursor() as cursor:
        cursor.executemany(UPSERT_SQL, payload)
    conn.commit()
    return len(payload)
