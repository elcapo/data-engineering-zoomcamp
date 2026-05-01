"""Tests for the SQL template loader."""

from __future__ import annotations

import pytest

from sql_loader import _sanitize, load_config, load_sql


class TestSanitize:
    @pytest.mark.parametrize("safe", [
        "redpanda:9092",
        "jdbc:postgresql://postgres:5432/climate",
        "user@host",
        "abc-123_def.gh",
    ])
    def test_accepts_safe_values(self, safe):
        assert _sanitize(safe, "X") == safe

    @pytest.mark.parametrize("unsafe", [
        "value with space",
        "drop'table",
        "$injection",
        "back`tick",
        "semi;colon",
    ])
    def test_rejects_unsafe_values(self, unsafe):
        with pytest.raises(ValueError, match="Unsafe character"):
            _sanitize(unsafe, "X")


class TestLoadConfig:
    def test_reads_env_with_defaults(self, monkeypatch):
        for key in ("KAFKA_BOOTSTRAP_SERVERS", "PG_JDBC_URL", "POSTGRES_USER", "POSTGRES_PASSWORD"):
            monkeypatch.delenv(key, raising=False)
        cfg = load_config()
        assert cfg["KAFKA_BROKER"] == "redpanda:9092"
        assert cfg["PG_URL"] == "jdbc:postgresql://postgres:5432/climate"
        assert cfg["PG_USER"] == "climate"
        assert cfg["PG_PASS"] == "climate"

    def test_overrides_via_env(self, monkeypatch):
        monkeypatch.setenv("KAFKA_BOOTSTRAP_SERVERS", "broker:19092")
        monkeypatch.setenv("PG_JDBC_URL", "jdbc:postgresql://db:5432/foo")
        monkeypatch.setenv("POSTGRES_USER", "alice")
        monkeypatch.setenv("POSTGRES_PASSWORD", "secret_token-1")
        cfg = load_config()
        assert cfg["KAFKA_BROKER"] == "broker:19092"
        assert cfg["PG_USER"] == "alice"
        assert cfg["PG_PASS"] == "secret_token-1"

    def test_rejects_unsafe_password(self, monkeypatch):
        monkeypatch.setenv("POSTGRES_PASSWORD", "p w d")
        with pytest.raises(ValueError, match="POSTGRES_PASSWORD|PG_PASS"):
            load_config()


class TestLoadSql:
    def test_substitutes_placeholders(self):
        sql = load_sql("source_kafka_openaq.sql", {
            "KAFKA_BROKER": "redpanda:9092",
            "PG_URL": "jdbc:postgresql://postgres:5432/climate",
            "PG_USER": "climate",
            "PG_PASS": "climate",
        })
        assert "$KAFKA_BROKER" not in sql
        assert "redpanda:9092" in sql

    def test_returns_raw_when_no_config(self):
        sql = load_sql("insert_openaq_hourly.sql")
        assert "TUMBLE" in sql
        assert "$" not in sql  # this template has no placeholders
