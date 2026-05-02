"""Integration test for the ingest CLI with mocked API + real moto S3."""

from __future__ import annotations

import json

from worldbank import ingest
from worldbank.api import WorldBankIndicatorArchivedError


def test_run_writes_one_object_per_indicator_year(
    monkeypatch, s3_client, settings, sample_payload,
):
    monkeypatch.setattr(ingest, "build_client", lambda _: s3_client)
    monkeypatch.setattr(
        ingest, "fetch_indicator",
        lambda base_url, code, year: sample_payload,
    )

    written = ingest.run(
        start_year=2021,
        end_year=2022,
        indicators=["NY.GDP.PCAP.CD", "EN.GHG.CO2.PC.CE.AR5"],
        settings=settings,
    )

    assert written == [
        "worldbank/raw/NY.GDP.PCAP.CD/2021.json",
        "worldbank/raw/NY.GDP.PCAP.CD/2022.json",
        "worldbank/raw/EN.GHG.CO2.PC.CE.AR5/2021.json",
        "worldbank/raw/EN.GHG.CO2.PC.CE.AR5/2022.json",
    ]
    listing = s3_client.list_objects_v2(Bucket=settings.storage_bucket)
    keys = sorted(obj["Key"] for obj in listing["Contents"])
    assert keys == sorted(written)
    body = json.loads(
        s3_client.get_object(Bucket=settings.storage_bucket, Key=written[0])["Body"].read()
    )
    assert body["records"][0]["countryiso3code"] == "ESP"


def test_run_skips_archived_indicator(
    monkeypatch, s3_client, settings, sample_payload,
):
    archived = "OLD.ARCHIVED.CODE"

    def fake_fetch(_base_url, code, _year):
        if code == archived:
            raise WorldBankIndicatorArchivedError(f"{code}: archived")
        return sample_payload

    monkeypatch.setattr(ingest, "build_client", lambda _: s3_client)
    monkeypatch.setattr(ingest, "fetch_indicator", fake_fetch)

    written = ingest.run(
        start_year=2021,
        end_year=2021,
        indicators=["NY.GDP.PCAP.CD", archived],
        settings=settings,
    )

    assert written == ["worldbank/raw/NY.GDP.PCAP.CD/2021.json"]
    listing = s3_client.list_objects_v2(Bucket=settings.storage_bucket)
    assert [obj["Key"] for obj in listing.get("Contents", [])] == written


def test_run_rejects_inverted_year_range(monkeypatch, settings):
    monkeypatch.setattr(ingest, "build_client", lambda _: object())
    monkeypatch.setattr(ingest, "fetch_indicator", lambda *a, **kw: {"records": []})
    try:
        ingest.run(2025, 2020, ["X"], settings)
    except ValueError as error:
        assert "start_year" in str(error)
    else:
        raise AssertionError("expected ValueError")
