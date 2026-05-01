"""Thin wrapper around KafkaProducer that publishes openaq records."""

from __future__ import annotations

import json
import logging
from typing import Iterable

from kafka import KafkaProducer

from openaq.transform import record_key

logger = logging.getLogger(__name__)


def build_producer(bootstrap_servers: str) -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=bootstrap_servers,
        value_serializer=lambda value: json.dumps(value, ensure_ascii=False).encode("utf-8"),
        key_serializer=lambda key: key.encode("utf-8") if key is not None else None,
        acks="all",
        linger_ms=20,
    )


def publish(producer: KafkaProducer, topic: str, records: Iterable[dict]) -> int:
    sent = 0
    for record in records:
        producer.send(topic, key=record_key(record), value=record)
        sent += 1
    producer.flush()
    return sent
