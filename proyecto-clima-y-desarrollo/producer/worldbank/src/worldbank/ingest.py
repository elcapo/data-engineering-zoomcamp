"""CLI: World Bank API → MinIO/S3 raw JSON."""

from __future__ import annotations

import argparse
import logging
import sys

from worldbank.api import fetch_indicator
from worldbank.config import Settings, resolve_indicators
from worldbank.storage import build_client, object_key, put_json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch World Bank indicators into object storage.")
    parser.add_argument("--start-year", type=int, required=True)
    parser.add_argument("--end-year", type=int, required=True)
    parser.add_argument(
        "--indicators",
        type=str,
        default=None,
        help="Comma-separated indicator codes; falls back to INDICATORS env var.",
    )
    return parser.parse_args(argv)


def run(start_year: int, end_year: int, indicators: list[str], settings: Settings) -> list[str]:
    if start_year > end_year:
        raise ValueError(f"start_year ({start_year}) must be <= end_year ({end_year})")
    client = build_client(settings)
    written: list[str] = []
    for code in indicators:
        for year in range(start_year, end_year + 1):
            payload = fetch_indicator(settings.api_base_url, code, year)
            key = object_key(code, year)
            put_json(client, settings.storage_bucket, key, payload)
            count = len(payload["records"])
            logger.info("Wrote s3://%s/%s (%d records)", settings.storage_bucket, key, count)
            written.append(key)
    logger.info("Ingest complete: %d objects", len(written))
    return written


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    settings = Settings.from_env()
    indicators = resolve_indicators(args.indicators)
    if not indicators:
        raise SystemExit("No indicators resolved. Pass --indicators or set INDICATORS.")
    run(args.start_year, args.end_year, indicators, settings)


if __name__ == "__main__":
    main()
