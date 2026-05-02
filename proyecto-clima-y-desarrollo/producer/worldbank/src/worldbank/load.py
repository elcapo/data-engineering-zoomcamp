"""CLI: MinIO/S3 raw JSON → Postgres raw.worldbank_indicators_raw."""

from __future__ import annotations

import argparse
import logging
import sys

from botocore.exceptions import ClientError

from worldbank.config import Settings, resolve_indicators
from worldbank.db import connect, upsert_rows
from worldbank.parse import parse_records
from worldbank.storage import build_client, get_json, object_key

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load raw World Bank JSON into Postgres.")
    parser.add_argument("--start-year", type=int, required=True)
    parser.add_argument("--end-year", type=int, required=True)
    parser.add_argument(
        "--indicators",
        type=str,
        default=None,
        help="Comma-separated indicator codes; falls back to INDICATORS env var.",
    )
    return parser.parse_args(argv)


def run(start_year: int, end_year: int, indicators: list[str], settings: Settings) -> int:
    if start_year > end_year:
        raise ValueError(f"start_year ({start_year}) must be <= end_year ({end_year})")
    s3 = build_client(settings)
    total = 0
    skipped = 0
    with connect(settings) as conn:
        for code in indicators:
            for year in range(start_year, end_year + 1):
                key = object_key(code, year)
                try:
                    payload = get_json(s3, settings.storage_bucket, key)
                except ClientError as error:
                    if error.response.get("Error", {}).get("Code") == "NoSuchKey":
                        logger.warning("Skipping %s/%s: object not in storage (likely archived)", code, year)
                        skipped += 1
                        continue
                    raise
                rows = list(parse_records(payload, source_object=key))
                inserted = upsert_rows(conn, rows)
                total += inserted
                logger.info("Loaded %d rows from %s", inserted, key)
    logger.info("Load complete: %d rows (%d objects skipped)", total, skipped)
    return total


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    settings = Settings.from_env()
    indicators = resolve_indicators(args.indicators)
    if not indicators:
        raise SystemExit("No indicators resolved. Pass --indicators or set INDICATORS.")
    run(args.start_year, args.end_year, indicators, settings)


if __name__ == "__main__":
    main()
