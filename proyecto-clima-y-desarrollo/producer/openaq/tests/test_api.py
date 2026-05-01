"""Tests for the OpenAQ HTTP client."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
import requests as requests_module

from openaq.api import OpenAQAPIError, OpenAQClient


def _response(status: int = 200, json_payload=None, headers: dict | None = None):
    response = MagicMock()
    response.status_code = status
    response.headers = headers or {}
    response.raise_for_status = MagicMock()
    response.json.return_value = json_payload
    return response


class TestOpenAQClient:
    def test_requires_api_key(self):
        with pytest.raises(OpenAQAPIError, match="OPENAQ_API_KEY is required"):
            OpenAQClient("http://api.test", api_key="")

    def test_list_locations_paginates_until_meta_found(self):
        session = MagicMock()
        session.get.side_effect = [
            _response(json_payload={
                "meta": {"found": 3, "page": 1, "limit": 2},
                "results": [{"id": 1}, {"id": 2}],
            }),
            _response(json_payload={
                "meta": {"found": 3, "page": 2, "limit": 2},
                "results": [{"id": 3}],
            }),
        ]
        client = OpenAQClient("http://api.test", api_key="k", session=session)
        result = client.list_locations("ES", page_size=2)
        assert [loc["id"] for loc in result] == [1, 2, 3]
        assert session.get.call_count == 2
        assert session.get.call_args_list[0].kwargs["params"]["page"] == 1
        assert session.get.call_args_list[1].kwargs["params"]["page"] == 2

    def test_list_locations_stops_on_short_page(self):
        session = MagicMock()
        session.get.return_value = _response(json_payload={
            "meta": {"page": 1, "limit": 1000},
            "results": [{"id": 1}],
        })
        client = OpenAQClient("http://api.test", api_key="k", session=session)
        assert client.list_locations("ES") == [{"id": 1}]
        assert session.get.call_count == 1

    def test_get_latest_returns_results_field(self):
        session = MagicMock()
        session.get.return_value = _response(json_payload={
            "meta": {}, "results": [{"value": 1.0}],
        })
        client = OpenAQClient("http://api.test", api_key="k", session=session)
        assert client.get_latest(42) == [{"value": 1.0}]
        called_url = session.get.call_args.args[0]
        assert called_url.endswith("/v3/locations/42/latest")

    def test_retries_on_transient_status(self, monkeypatch):
        session = MagicMock()
        session.get.side_effect = [
            _response(status=429, headers={"Retry-After": "0"}),
            _response(json_payload={"meta": {}, "results": []}),
        ]
        monkeypatch.setattr("openaq.api.time.sleep", lambda _: None)
        client = OpenAQClient(
            "http://api.test", api_key="k", session=session,
            retries=3, backoff_seconds=0.0,
        )
        client.get_latest(1)
        assert session.get.call_count == 2

    def test_raises_after_exhausting_retries(self, monkeypatch):
        session = MagicMock()
        session.get.side_effect = requests_module.ConnectionError("boom")
        monkeypatch.setattr("openaq.api.time.sleep", lambda _: None)
        client = OpenAQClient(
            "http://api.test", api_key="k", session=session,
            retries=2, backoff_seconds=0.0,
        )
        with pytest.raises(OpenAQAPIError, match="failed after 2 attempts"):
            client.get_latest(1)
