"""Load SQL templates from disk and render them with sanitized config values."""

import os
import re
from pathlib import Path
from string import Template

_SAFE_VALUE = re.compile(r"^[A-Za-z0-9_./:@\-]+$")

SQL_DIR = Path(__file__).resolve().parent.parent / "sql"


def _sanitize(value: str, name: str) -> str:
    if not _SAFE_VALUE.match(value):
        raise ValueError(
            f"Unsafe character in config '{name}': only alphanumerics, "
            f"dots, colons, slashes, underscores, hyphens and @ are allowed"
        )
    return value


def load_config() -> dict[str, str]:
    """Read connection settings from env vars and validate them."""
    raw = {
        "KAFKA_BROKER": os.getenv("KAFKA_BOOTSTRAP_SERVERS", "redpanda:9092"),
        "PG_URL": os.getenv("PG_JDBC_URL", "jdbc:postgresql://postgres:5432/gdelt"),
        "PG_USER": os.getenv("POSTGRES_USER", "gdelt"),
        "PG_PASS": os.getenv("POSTGRES_PASSWORD", "gdelt"),
    }
    return {k: _sanitize(v, k) for k, v in raw.items()}


def load_sql(filename: str, config: dict[str, str] | None = None) -> str:
    """Read a .sql template and substitute $placeholders with config values."""
    text = (SQL_DIR / filename).read_text()
    if config:
        text = Template(text).substitute(config)
    return text
