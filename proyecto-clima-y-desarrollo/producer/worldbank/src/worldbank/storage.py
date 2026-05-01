"""S3-compatible object storage wrapper (MinIO locally, GCS via S3 API in cloud)."""

from __future__ import annotations

import json
from typing import Any

import boto3
from botocore.client import Config

from worldbank.config import Settings


def object_key(indicator_code: str, year: int) -> str:
    return f"worldbank/raw/{indicator_code}/{year}.json"


def build_client(settings: Settings):
    return boto3.client(
        "s3",
        endpoint_url=settings.storage_endpoint,
        aws_access_key_id=settings.storage_access_key,
        aws_secret_access_key=settings.storage_secret_key,
        region_name=settings.storage_region,
        config=Config(signature_version="s3v4"),
    )


def put_json(client, bucket: str, key: str, payload: Any) -> None:
    """Upload `payload` as pretty JSON. Atomic via temp key + copy + delete."""
    tmp_key = f"{key}.tmp"
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    client.put_object(Bucket=bucket, Key=tmp_key, Body=body, ContentType="application/json")
    client.copy_object(Bucket=bucket, Key=key, CopySource={"Bucket": bucket, "Key": tmp_key})
    client.delete_object(Bucket=bucket, Key=tmp_key)


def get_json(client, bucket: str, key: str) -> Any:
    response = client.get_object(Bucket=bucket, Key=key)
    return json.loads(response["Body"].read().decode("utf-8"))
