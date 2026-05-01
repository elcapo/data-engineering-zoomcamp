"""Tests for the S3 storage wrapper."""

from __future__ import annotations

import json

from worldbank.storage import get_json, object_key, put_json


def test_object_key_format():
    assert object_key("NY.GDP.PCAP.CD", 2022) == "worldbank/raw/NY.GDP.PCAP.CD/2022.json"


class TestPutJson:
    def test_writes_object_and_cleans_tmp(self, s3_client, settings):
        payload = {"hello": "world"}
        key = "worldbank/raw/X/2022.json"
        put_json(s3_client, settings.storage_bucket, key, payload)

        listing = s3_client.list_objects_v2(Bucket=settings.storage_bucket)
        keys = [obj["Key"] for obj in listing.get("Contents", [])]
        assert key in keys
        assert f"{key}.tmp" not in keys

        retrieved = json.loads(
            s3_client.get_object(Bucket=settings.storage_bucket, Key=key)["Body"].read()
        )
        assert retrieved == payload

    def test_get_json_round_trip(self, s3_client, settings):
        payload = {"records": [1, 2, 3]}
        key = "worldbank/raw/X/2022.json"
        put_json(s3_client, settings.storage_bucket, key, payload)
        assert get_json(s3_client, settings.storage_bucket, key) == payload
