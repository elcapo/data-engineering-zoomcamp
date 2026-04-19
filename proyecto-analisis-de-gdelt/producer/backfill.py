"""Backfill historical GDELT slots over a timestamp range.

Unlike download.py + publish.py, which chase the latest GDELT update,
this script constructs the historical URLs directly from each 15-minute
slot in [start, end] and publishes to Kafka in one process.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timedelta

from kafka import KafkaProducer

from gdelt import download_and_extract, parse_events, parse_gkg, parse_mentions
from publish import KEY_FIELD, TOPIC_MAP

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "redpanda:9092")
BASE_URL = "http://data.gdeltproject.org/gdeltv2"
SLOT = timedelta(minutes=15)
TS_FORMAT = "%Y%m%d%H%M%S"

PARSER_MAP = {
    "events": parse_events,
    "mentions": parse_mentions,
    "gkg": parse_gkg,
}

URL_SUFFIX = {
    "events": "export.CSV.zip",
    "mentions": "mentions.CSV.zip",
    "gkg": "gkg.csv.zip",
}


def parse_slot(value: str) -> datetime:
    """Parse YYYYMMDDHHMMSS and require alignment to a 15-minute boundary."""
    ts = datetime.strptime(value, TS_FORMAT)
    if ts.second != 0 or ts.minute not in (0, 15, 30, 45):
        raise ValueError(
            f"Timestamp {value} is not aligned to a 15-minute slot (:00, :15, :30, :45)"
        )
    return ts


def iter_slots(start: datetime, end: datetime):
    """Yield every 15-minute slot from start to end, inclusive."""
    if start > end:
        raise ValueError(f"start {start} must be <= end {end}")
    current = start
    while current <= end:
        yield current
        current += SLOT


def urls_for(slot: datetime) -> dict[str, str]:
    stamp = slot.strftime(TS_FORMAT)
    return {name: f"{BASE_URL}/{stamp}.{suffix}" for name, suffix in URL_SUFFIX.items()}


def process_slot(slot: datetime, producer: KafkaProducer) -> dict[str, int]:
    counts: dict[str, int] = {}
    for file_type, url in urls_for(slot).items():
        csv_text = download_and_extract(url)
        records = PARSER_MAP[file_type](csv_text)
        topic = TOPIC_MAP[file_type]
        key_field = KEY_FIELD[file_type]
        for record in records:
            producer.send(topic, key=record.get(key_field), value=record)
        counts[file_type] = len(records)
    return counts


def main(argv: list[str] | None = None) -> None:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 2:
        raise SystemExit("Usage: backfill.py <start YYYYMMDDHHMMSS> <end YYYYMMDDHHMMSS>")

    start = parse_slot(args[0])
    end = parse_slot(args[1])
    slots = list(iter_slots(start, end))

    logger.info("Connecting to Kafka broker at %s", BROKER)
    producer = KafkaProducer(
        bootstrap_servers=BROKER,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: str(k).encode("utf-8") if k else None,
    )

    try:
        for idx, slot in enumerate(slots, start=1):
            stamp = slot.strftime(TS_FORMAT)
            counts = process_slot(slot, producer)
            logger.info(
                "[%d/%d] %s — events: %d, mentions: %d, gkg: %d",
                idx, len(slots), stamp,
                counts["events"], counts["mentions"], counts["gkg"],
            )
        producer.flush()
    finally:
        producer.close()

    logger.info("Backfill done: %d slots", len(slots))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        logger.exception("Backfill failed")
        sys.exit(1)
