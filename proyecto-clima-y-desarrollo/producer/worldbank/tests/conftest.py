"""Shared fixtures for the worldbank producer test suite."""

from __future__ import annotations

import boto3
import pytest
from moto import mock_aws

from worldbank.config import Settings


@pytest.fixture
def settings(monkeypatch) -> Settings:
    monkeypatch.setenv("WORLDBANK_API_BASE_URL", "http://api.test")
    monkeypatch.setenv("STORAGE_ENDPOINT", "http://localhost:9999")
    monkeypatch.setenv("STORAGE_BUCKET", "test-bucket")
    monkeypatch.setenv("STORAGE_ACCESS_KEY", "test")
    monkeypatch.setenv("STORAGE_SECRET_KEY", "test-secret")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test-secret")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    return Settings.from_env()


@pytest.fixture
def s3_client(settings):
    with mock_aws():
        client = boto3.client("s3", region_name=settings.storage_region)
        client.create_bucket(Bucket=settings.storage_bucket)
        yield client


@pytest.fixture
def sample_payload() -> dict:
    return {
        "metadata": {"page": 1, "pages": 1, "per_page": 20000, "total": 3},
        "records": [
            {
                "indicator": {"id": "NY.GDP.PCAP.CD", "value": "GDP per capita"},
                "country": {"id": "ES", "value": "Spain"},
                "countryiso3code": "ESP",
                "date": "2022",
                "value": 30115.7,
                "unit": "",
                "obs_status": "",
                "decimal": 1,
            },
            {
                "indicator": {"id": "NY.GDP.PCAP.CD", "value": "GDP per capita"},
                "country": {"id": "1A", "value": "Arab World"},
                "countryiso3code": "",  # aggregate without ISO3 — must be skipped
                "date": "2022",
                "value": 7000.0,
                "unit": "",
                "obs_status": "",
                "decimal": 1,
            },
            {
                "indicator": {"id": "NY.GDP.PCAP.CD", "value": "GDP per capita"},
                "country": {"id": "FR", "value": "France"},
                "countryiso3code": "FRA",
                "date": "2022",
                "value": None,  # missing observation
                "unit": "",
                "obs_status": "",
                "decimal": 1,
            },
        ],
    }
