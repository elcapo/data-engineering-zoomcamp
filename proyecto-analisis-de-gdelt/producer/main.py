"""Single-run GDELT producer: fetch latest update and publish to Redpanda."""

from __future__ import annotations

import json
import logging
import os
import sys

from kafka import KafkaProducer

from gdelt import (
    download_and_extract,
    fetch_latest_urls,
    parse_events,
    parse_gkg,
    parse_mentions,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "redpanda:9092")

TOPIC_MAP = {
    "events": "gdelt.events",
    "mentions": "gdelt.mentions",
    "gkg": "gdelt.gkg",
}

PARSER_MAP = {
    "events": parse_events,
    "mentions": parse_mentions,
    "gkg": parse_gkg,
}

KEY_FIELD = {
    "events": "global_event_id",
    "mentions": "global_event_id",
    "gkg": "gkg_record_id",
}


def main() -> None:
    logger.info("Connecting to Kafka broker at %s", BROKER)
    producer = KafkaProducer(
        bootstrap_servers=BROKER,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: str(k).encode("utf-8") if k else None,
    )

    urls = fetch_latest_urls()
    logger.info("Latest GDELT URLs: %s", urls)

    total = 0
    for file_type, url in urls.items():
        csv_text = download_and_extract(url)
        records = PARSER_MAP[file_type](csv_text)
        topic = TOPIC_MAP[file_type]
        key_field = KEY_FIELD[file_type]

        for record in records:
            producer.send(topic, key=record.get(key_field), value=record)

        logger.info("Published %d records to %s", len(records), topic)
        total += len(records)

    producer.flush()
    producer.close()
    logger.info("Done. Total records published: %d", total)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        logger.exception("Producer failed")
        sys.exit(1)
