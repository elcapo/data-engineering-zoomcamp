"""Tests for the load CLI: S3 → Postgres path."""

from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import MagicMock

from worldbank import load
from worldbank.storage import object_key, put_json


class _FakeConn:
    def __init__(self):
        self.cursor_obj = MagicMock()
        self.cursor_obj.__enter__ = lambda s: s
        self.cursor_obj.__exit__ = lambda *a: False
        self.commits = 0

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.commits += 1

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()


def test_run_upserts_rows_from_each_object(
    monkeypatch, s3_client, settings, sample_payload,
):
    for code in ("NY.GDP.PCAP.CD", "EN.ATM.CO2E.PC"):
        for year in (2021, 2022):
            put_json(s3_client, settings.storage_bucket, object_key(code, year), sample_payload)

    fake_conn = _FakeConn()

    @contextmanager
    def fake_connect(_settings):
        yield fake_conn

    monkeypatch.setattr(load, "build_client", lambda _: s3_client)
    monkeypatch.setattr(load, "connect", fake_connect)

    total = load.run(
        start_year=2021,
        end_year=2022,
        indicators=["NY.GDP.PCAP.CD", "EN.ATM.CO2E.PC"],
        settings=settings,
    )

    # 2 indicators × 2 years × 2 valid records (ESP + FRA) per payload
    assert total == 8
    assert fake_conn.cursor_obj.executemany.call_count == 4
    assert fake_conn.commits == 4
    first_call_rows = fake_conn.cursor_obj.executemany.call_args_list[0].args[1]
    iso3_codes = [row[1] for row in first_call_rows]
    assert iso3_codes == ["ESP", "FRA"]
