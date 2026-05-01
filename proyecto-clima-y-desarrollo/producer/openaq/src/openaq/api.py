"""Minimal HTTP client for the OpenAQ v3 API."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)


class OpenAQAPIError(RuntimeError):
    pass


def _build_session(api_key: str) -> requests.Session:
    session = requests.Session()
    session.headers.update({"X-API-Key": api_key, "Accept": "application/json"})
    return session


def _request_json(
    session: requests.Session,
    url: str,
    params: dict[str, Any],
    *,
    retries: int,
    backoff_seconds: float,
    timeout_seconds: float,
) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            response = session.get(url, params=params, timeout=timeout_seconds)
            if response.status_code in (429, 500, 502, 503, 504):
                retry_after = response.headers.get("Retry-After")
                delay = float(retry_after) if retry_after else backoff_seconds * (2 ** (attempt - 1))
                last_error = OpenAQAPIError(f"transient HTTP {response.status_code}")
                if attempt == retries:
                    break
                logger.warning(
                    "OpenAQ %s on %s — retrying in %.1fs (%d/%d)",
                    response.status_code, url, delay, attempt, retries,
                )
                time.sleep(delay)
                continue
            response.raise_for_status()
            return response.json()
        except requests.RequestException as error:
            last_error = error
            if attempt == retries:
                break
            delay = backoff_seconds * (2 ** (attempt - 1))
            logger.warning(
                "OpenAQ request failed (attempt %d/%d): %s — retrying in %.1fs",
                attempt, retries, error, delay,
            )
            time.sleep(delay)
    raise OpenAQAPIError(f"OpenAQ request to {url} failed after {retries} attempts") from last_error


class OpenAQClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        *,
        session: requests.Session | None = None,
        retries: int = 4,
        backoff_seconds: float = 2.0,
        timeout_seconds: float = 30.0,
        min_request_interval_seconds: float = 0.25,
    ) -> None:
        if not api_key:
            raise OpenAQAPIError("OPENAQ_API_KEY is required")
        self._base = base_url.rstrip("/")
        self._session = session or _build_session(api_key)
        self._retries = retries
        self._backoff = backoff_seconds
        self._timeout = timeout_seconds
        self._min_interval = min_request_interval_seconds
        self._last_request_at: float = 0.0

    def _throttle(self) -> None:
        if self._min_interval <= 0:
            return
        elapsed = time.monotonic() - self._last_request_at
        wait = self._min_interval - elapsed
        if wait > 0:
            time.sleep(wait)
        self._last_request_at = time.monotonic()

    def list_locations(self, iso: str, *, page_size: int = 1000) -> list[dict[str, Any]]:
        """Return all stations in a country, paginating until `meta.found` is exhausted."""
        url = f"{self._base}/v3/locations"
        results: list[dict[str, Any]] = []
        page = 1
        while True:
            self._throttle()
            payload = _request_json(
                self._session, url,
                {"iso": iso, "limit": page_size, "page": page},
                retries=self._retries,
                backoff_seconds=self._backoff,
                timeout_seconds=self._timeout,
            )
            batch = payload.get("results") or []
            results.extend(batch)
            found = (payload.get("meta") or {}).get("found")
            if not batch or (isinstance(found, int) and len(results) >= found):
                return results
            if len(batch) < page_size:
                return results
            page += 1

    def get_latest(self, location_id: int) -> list[dict[str, Any]]:
        url = f"{self._base}/v3/locations/{location_id}/latest"
        self._throttle()
        payload = _request_json(
            self._session, url,
            {"limit": 100},
            retries=self._retries,
            backoff_seconds=self._backoff,
            timeout_seconds=self._timeout,
        )
        return payload.get("results") or []
