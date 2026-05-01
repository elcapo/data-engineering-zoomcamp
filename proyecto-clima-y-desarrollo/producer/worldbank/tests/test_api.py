"""Tests for the World Bank API client."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from worldbank.api import WorldBankAPIError, fetch_indicator


def _response(status: int = 200, json_payload=None):
    response = MagicMock()
    response.status_code = status
    response.raise_for_status = MagicMock()
    response.json.return_value = json_payload
    return response


class TestFetchIndicator:
    def test_returns_metadata_and_records(self):
        session = MagicMock()
        session.get.return_value = _response(json_payload=[
            {"page": 1, "pages": 1, "per_page": 20000, "total": 1},
            [{"countryiso3code": "ESP", "date": "2022", "value": 1.0}],
        ])
        result = fetch_indicator("http://api.test", "NY.GDP.PCAP.CD", 2022, session=session)
        assert result["metadata"]["total"] == 1
        assert result["records"][0]["countryiso3code"] == "ESP"
        session.get.assert_called_once()
        params = session.get.call_args.kwargs["params"]
        assert params["date"] == "2022:2022"
        assert params["per_page"] == 20000

    def test_treats_null_records_as_empty_list(self):
        session = MagicMock()
        session.get.return_value = _response(json_payload=[
            {"page": 1, "pages": 1, "per_page": 20000, "total": 0},
            None,
        ])
        result = fetch_indicator("http://api.test", "X", 2022, session=session)
        assert result["records"] == []

    def test_raises_when_more_pages_needed(self):
        session = MagicMock()
        session.get.return_value = _response(json_payload=[
            {"page": 1, "pages": 2, "per_page": 20000, "total": 30000},
            [],
        ])
        with pytest.raises(WorldBankAPIError, match="Pagination required"):
            fetch_indicator("http://api.test", "X", 2022, session=session)

    def test_raises_on_unexpected_payload_shape(self):
        session = MagicMock()
        session.get.return_value = _response(json_payload={"oops": True})
        with pytest.raises(WorldBankAPIError, match="Unexpected payload shape"):
            fetch_indicator("http://api.test", "X", 2022, session=session)

    def test_retries_then_raises_on_transient_errors(self, monkeypatch):
        import requests as requests_module

        session = MagicMock()
        session.get.side_effect = [
            requests_module.ConnectionError("boom"),
            requests_module.ConnectionError("boom-again"),
        ]
        monkeypatch.setattr("worldbank.api.time.sleep", lambda _: None)
        with pytest.raises(WorldBankAPIError, match="after 2 attempts"):
            fetch_indicator(
                "http://api.test", "X", 2022, session=session,
                retries=2, backoff_seconds=0.0,
            )
        assert session.get.call_count == 2

    def test_recovers_after_transient_failure(self, monkeypatch):
        import requests as requests_module

        session = MagicMock()
        session.get.side_effect = [
            requests_module.ConnectionError("first try"),
            _response(json_payload=[
                {"page": 1, "pages": 1, "per_page": 20000, "total": 0},
                [],
            ]),
        ]
        monkeypatch.setattr("worldbank.api.time.sleep", lambda _: None)
        result = fetch_indicator(
            "http://api.test", "X", 2022, session=session,
            retries=3, backoff_seconds=0.0,
        )
        assert result["records"] == []
        assert session.get.call_count == 2
