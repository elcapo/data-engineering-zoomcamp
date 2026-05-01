"""CLI: poll OpenAQ /latest for the configured countries and publish to Redpanda."""

from __future__ import annotations

import argparse
import logging
import sys

from openaq.api import OpenAQClient
from openaq.config import Settings, resolve_countries, resolve_parameters
from openaq.kafka_sink import build_producer, publish
from openaq.transform import build_sensor_lookup, to_records

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Poll OpenAQ /latest and publish to Redpanda.")
    parser.add_argument(
        "--countries",
        type=str,
        default=None,
        help="Comma-separated ISO2 codes; falls back to COUNTRIES env var.",
    )
    parser.add_argument(
        "--parameters",
        type=str,
        default=None,
        help="Comma-separated parameter names; falls back to PARAMETERS env var.",
    )
    parser.add_argument(
        "--max-locations",
        type=int,
        default=None,
        help="Optional cap on locations polled per country (useful for smoke tests).",
    )
    return parser.parse_args(argv)


def run(
    countries: list[str],
    parameters: list[str],
    settings: Settings,
    *,
    max_locations: int | None = None,
) -> tuple[int, int]:
    if not settings.api_key:
        raise SystemExit("OPENAQ_API_KEY is required. Get one at https://explore.openaq.org/register.")
    client = OpenAQClient(settings.api_base_url, settings.api_key)
    producer = build_producer(settings.bootstrap_servers)
    parameters_set = set(parameters)
    total_published = 0
    total_skipped = 0
    try:
        for iso in countries:
            locations = client.list_locations(iso)
            lookup = build_sensor_lookup(locations)
            if max_locations is not None and len(locations) > max_locations:
                logger.info(
                    "Country %s: capping %d locations to first %d (--max-locations)",
                    iso, len(locations), max_locations,
                )
                locations = locations[:max_locations]
            logger.info("Country %s: %d locations, %d sensors", iso, len(locations), len(lookup))
            for loc in locations:
                loc_id = loc.get("id")
                if loc_id is None:
                    continue
                latest = client.get_latest(int(loc_id))
                records, skipped = to_records(latest, lookup, parameters_set)
                published = publish(producer, settings.topic, records)
                total_published += published
                total_skipped += skipped
        logger.info(
            "Poll complete: published=%d skipped=%d countries=%s",
            total_published, total_skipped, ",".join(countries),
        )
    finally:
        producer.close()
    return total_published, total_skipped


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    settings = Settings.from_env()
    countries = resolve_countries(args.countries)
    if not countries:
        raise SystemExit("No countries resolved. Pass --countries or set COUNTRIES.")
    parameters = resolve_parameters(args.parameters)
    run(countries, parameters, settings, max_locations=args.max_locations)


if __name__ == "__main__":
    main()
