"""Tests for env-driven config helpers."""

from __future__ import annotations

from openaq.config import DEFAULT_PARAMETERS, resolve_countries, resolve_parameters


def test_resolve_countries_uses_override(monkeypatch):
    monkeypatch.delenv("COUNTRIES", raising=False)
    assert resolve_countries("ES, FR ,DE") == ["ES", "FR", "DE"]


def test_resolve_countries_falls_back_to_env(monkeypatch):
    monkeypatch.setenv("COUNTRIES", "IT,ES")
    assert resolve_countries(None) == ["IT", "ES"]


def test_resolve_countries_returns_empty_when_unset(monkeypatch):
    monkeypatch.delenv("COUNTRIES", raising=False)
    assert resolve_countries(None) == []


def test_resolve_parameters_falls_back_to_default(monkeypatch):
    monkeypatch.delenv("PARAMETERS", raising=False)
    assert resolve_parameters(None) == DEFAULT_PARAMETERS


def test_resolve_parameters_override(monkeypatch):
    monkeypatch.setenv("PARAMETERS", "ignored")
    assert resolve_parameters("pm25,no2") == ["pm25", "no2"]
