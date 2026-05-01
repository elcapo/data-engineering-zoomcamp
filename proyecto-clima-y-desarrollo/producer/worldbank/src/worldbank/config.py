"""Environment-driven configuration for the worldbank producer."""

from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_INDICATORS = [
    "NY.GDP.PCAP.CD",
    "NY.GDP.MKTP.KD.ZG",
    "EN.ATM.CO2E.PC",
    "EG.USE.PCAP.KG.OE",
    "EG.FEC.RNEW.ZS",
    "SP.URB.TOTL.IN.ZS",
    "NV.IND.TOTL.ZS",
    "EN.POP.DNST",
]


@dataclass(frozen=True)
class Settings:
    api_base_url: str
    storage_endpoint: str
    storage_bucket: str
    storage_region: str
    storage_access_key: str
    storage_secret_key: str
    postgres_host: str
    postgres_port: int
    postgres_user: str
    postgres_password: str
    postgres_db: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            api_base_url=os.getenv("WORLDBANK_API_BASE_URL", "https://api.worldbank.org/v2"),
            storage_endpoint=os.getenv("STORAGE_ENDPOINT", "http://minio:9000"),
            storage_bucket=os.getenv("STORAGE_BUCKET", "climate"),
            storage_region=os.getenv("STORAGE_REGION", "us-east-1"),
            storage_access_key=os.getenv("STORAGE_ACCESS_KEY", "minio"),
            storage_secret_key=os.getenv("STORAGE_SECRET_KEY", "minioadmin"),
            postgres_host=os.getenv("POSTGRES_HOST", "postgres"),
            postgres_port=int(os.getenv("POSTGRES_PORT", "5432")),
            postgres_user=os.getenv("POSTGRES_USER", "climate"),
            postgres_password=os.getenv("POSTGRES_PASSWORD", "climate"),
            postgres_db=os.getenv("POSTGRES_DB", "climate"),
        )


def resolve_indicators(override: str | None) -> list[str]:
    raw = override if override else os.getenv("INDICATORS")
    if not raw:
        return list(DEFAULT_INDICATORS)
    return [code.strip() for code in raw.split(",") if code.strip()]
