"""Minimal client for the World Bank Indicators API."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)


class WorldBankAPIError(RuntimeError):
    pass


class WorldBankIndicatorArchivedError(WorldBankAPIError):
    """The indicator was deleted/archived on the World Bank side."""


def fetch_indicator(
    base_url: str,
    indicator_code: str,
    year: int,
    *,
    session: requests.Session | None = None,
    retries: int = 4,
    backoff_seconds: float = 2.0,
    timeout_seconds: float = 60.0,
) -> dict[str, Any]:
    """Fetch a single (indicator, year) page from the World Bank API.

    Normal responses are a 2-element JSON array: `[metadata, records]`. The
    API also returns a 1-element list `[{"message": [...]}]` when the
    indicator has been archived/deleted or a parameter is invalid — those
    are surfaced as :class:`WorldBankIndicatorArchivedError` so callers can
    decide whether to skip or fail. With `per_page=20000` and a single-year
    date filter the result fits in one page for every supported indicator.
    """
    url = f"{base_url.rstrip('/')}/country/all/indicator/{indicator_code}"
    params = {"format": "json", "per_page": 20000, "date": f"{year}:{year}"}
    http = session or requests
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            response = http.get(url, params=params, timeout=timeout_seconds)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, list) or len(payload) not in (1, 2):
                raise WorldBankAPIError(
                    f"Unexpected payload shape for {indicator_code}/{year}: "
                    f"{type(payload).__name__}"
                )
            if len(payload) == 1:
                message = (payload[0] or {}).get("message")
                detail = message[0].get("value") if message else "no detail"
                raise WorldBankIndicatorArchivedError(
                    f"{indicator_code}/{year}: {detail}"
                )
            metadata, records = payload
            if metadata.get("pages", 1) > 1:
                raise WorldBankAPIError(
                    f"Pagination required for {indicator_code}/{year} but only one page is fetched"
                )
            return {"metadata": metadata, "records": records or []}
        except (requests.RequestException, ValueError) as error:
            last_error = error
            if attempt == retries:
                break
            delay = backoff_seconds * (2 ** (attempt - 1))
            logger.warning(
                "Fetch failed for %s/%s (attempt %d/%d): %s — retrying in %.1fs",
                indicator_code, year, attempt, retries, error, delay,
            )
            time.sleep(delay)
    raise WorldBankAPIError(
        f"Failed to fetch {indicator_code}/{year} after {retries} attempts"
    ) from last_error
