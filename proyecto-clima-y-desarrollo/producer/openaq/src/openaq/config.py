"""Environment-driven configuration for the openaq producer."""

from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_PARAMETERS = ["pm25", "pm10", "no2", "o3", "so2"]


@dataclass(frozen=True)
class Settings:
    api_base_url: str
    api_key: str
    bootstrap_servers: str
    topic: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            api_base_url=os.getenv("OPENAQ_API_BASE_URL", "https://api.openaq.org"),
            api_key=os.getenv("OPENAQ_API_KEY", ""),
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "redpanda:9092"),
            topic=os.getenv("OPENAQ_TOPIC", "openaq.measurements"),
        )


def _split_csv(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def resolve_countries(override: str | None) -> list[str]:
    """ISO2 country codes. No default — the user must opt in."""
    return _split_csv(override) or _split_csv(os.getenv("COUNTRIES"))


def resolve_parameters(override: str | None) -> list[str]:
    """Parameter whitelist (pm25, no2, ...). Falls back to env, then defaults."""
    return _split_csv(override) or _split_csv(os.getenv("PARAMETERS")) or list(DEFAULT_PARAMETERS)
