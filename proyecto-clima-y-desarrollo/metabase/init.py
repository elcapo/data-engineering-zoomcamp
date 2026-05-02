"""Bootstrap a fresh Metabase instance — idempotent across re-runs.

Steps, each gated by state detection so the script is safe to run repeatedly:
  1) Wait until /api/health returns ok.
  2) Try to log in as the configured admin. If the session is granted, the
     setup phase has already happened — skip it. Otherwise, fetch the
     setup-token from /api/session/properties and create the admin user.
  3) List the existing databases. If the warehouse is already registered,
     skip. Otherwise, POST /api/database to register the climate Postgres
     warehouse.

The two phases are POSTed separately (instead of bundling the database into
/api/setup) so each can fail loud without leaving inconsistent state.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("metabase-init")

METABASE_URL    = os.environ.get("METABASE_URL", "http://metabase:3000").rstrip("/")
ADMIN_EMAIL     = os.environ["METABASE_ADMIN_EMAIL"]
ADMIN_PASSWORD  = os.environ["METABASE_ADMIN_PASSWORD"]
ADMIN_FIRSTNAME = os.environ.get("METABASE_ADMIN_FIRSTNAME", "Climate")
ADMIN_LASTNAME  = os.environ.get("METABASE_ADMIN_LASTNAME",  "Admin")
SITE_NAME       = os.environ.get("METABASE_SITE_NAME",       "Climate Dashboard")
DB_DISPLAY_NAME = os.environ.get("METABASE_WAREHOUSE_NAME",  "climate-warehouse")
PG_HOST         = os.environ.get("POSTGRES_HOST", "postgres")
PG_PORT         = int(os.environ.get("POSTGRES_PORT", "5432"))
PG_USER         = os.environ.get("POSTGRES_USER", "climate")
PG_PASSWORD     = os.environ["POSTGRES_PASSWORD"]
PG_DB           = os.environ.get("POSTGRES_DB", "climate")

HEALTH_RETRIES        = 60
HEALTH_RETRY_DELAY_S  = 5


def _request(
    method: str,
    path: str,
    *,
    body: dict | None = None,
    headers: dict | None = None,
    timeout: float = 30.0,
    raise_on_error: bool = True,
) -> tuple[int, dict | None]:
    """Return (status_code, parsed_body or None). Raises only when raise_on_error
    is true and the response is not 2xx."""
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"{METABASE_URL}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = resp.read().decode("utf-8")
            return resp.status, json.loads(payload) if payload else None
    except urllib.error.HTTPError as err:
        body_text = err.read().decode("utf-8", errors="replace")
        if raise_on_error:
            raise SystemExit(
                f"Metabase {method} {path} failed with HTTP {err.code}: {body_text}"
            ) from None
        try:
            return err.code, json.loads(body_text) if body_text else None
        except json.JSONDecodeError:
            return err.code, {"_raw": body_text}


def wait_for_health() -> None:
    for attempt in range(1, HEALTH_RETRIES + 1):
        try:
            _, health = _request("GET", "/api/health", timeout=5.0,
                                 raise_on_error=False)
            if health and health.get("status") == "ok":
                logger.info("Metabase healthy after %d attempt(s)", attempt)
                return
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            logger.info("Metabase not ready (attempt %d/%d): %s",
                        attempt, HEALTH_RETRIES, exc)
        time.sleep(HEALTH_RETRY_DELAY_S)
    raise SystemExit(f"Metabase /api/health never returned ok after "
                     f"{HEALTH_RETRIES * HEALTH_RETRY_DELAY_S}s")


def login() -> str | None:
    status, body = _request(
        "POST", "/api/session",
        body={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        raise_on_error=False,
    )
    if status == 200 and body and "id" in body:
        return body["id"]
    if status in (400, 401):
        return None
    raise SystemExit(f"Unexpected status {status} from /api/session: {body}")


def fetch_setup_token() -> str | None:
    _, props = _request("GET", "/api/session/properties")
    token = (props or {}).get("setup-token")
    return token if token else None


def run_initial_setup(token: str) -> str:
    logger.info("Creating admin user via /api/setup (first-run path)")
    payload = {
        "token": token,
        "user": {
            "first_name": ADMIN_FIRSTNAME,
            "last_name":  ADMIN_LASTNAME,
            "email":      ADMIN_EMAIL,
            "password":   ADMIN_PASSWORD,
            "site_name":  SITE_NAME,
        },
        "prefs": {
            "site_name":      SITE_NAME,
            "allow_tracking": False,
        },
    }
    _, body = _request("POST", "/api/setup", body=payload, timeout=60.0)
    session_id = (body or {}).get("id")
    if not session_id:
        raise SystemExit("/api/setup did not return a session id")
    return session_id


def warehouse_already_registered(session_id: str) -> bool:
    _, body = _request(
        "GET", "/api/database",
        headers={"X-Metabase-Session": session_id},
    )
    databases = (body or {}).get("data", body if isinstance(body, list) else [])
    return any(db.get("name") == DB_DISPLAY_NAME for db in databases)


def remove_sample_databases(session_id: str) -> None:
    """Delete any built-in Sample Database(s) so the SQL editor doesn't
    silently fall back to one that lacks the project's `marts` schema."""
    _, body = _request(
        "GET", "/api/database",
        headers={"X-Metabase-Session": session_id},
    )
    databases = (body or {}).get("data", body if isinstance(body, list) else [])
    sample_ids = [db["id"] for db in databases if db.get("is_sample")]
    for db_id in sample_ids:
        logger.info("Removing built-in sample database id=%s", db_id)
        _request(
            "DELETE", f"/api/database/{db_id}",
            headers={"X-Metabase-Session": session_id},
            timeout=30.0,
        )


def register_warehouse(session_id: str) -> None:
    logger.info("Registering '%s' Postgres data source", DB_DISPLAY_NAME)
    payload = {
        "engine":           "postgres",
        "name":             DB_DISPLAY_NAME,
        "details": {
            "host":     PG_HOST,
            "port":     PG_PORT,
            "user":     PG_USER,
            "password": PG_PASSWORD,
            "dbname":   PG_DB,
            "ssl":      False,
        },
        "is_full_sync":     True,
        "is_on_demand":     False,
        "auto_run_queries": True,
    }
    _request(
        "POST", "/api/database",
        body=payload,
        headers={"X-Metabase-Session": session_id},
        timeout=60.0,
    )


def main() -> None:
    wait_for_health()

    session_id = login()
    if session_id:
        logger.info("Admin user already exists — skipping /api/setup")
    else:
        token = fetch_setup_token()
        if token is None:
            raise SystemExit(
                "No admin session could be obtained and no setup-token is "
                "available — Metabase is in an inconsistent state. Wipe the "
                f"'metabase_app' DB and try again."
            )
        session_id = run_initial_setup(token)
        logger.info("Admin user created")

    if warehouse_already_registered(session_id):
        logger.info("Data source '%s' already registered — skipping", DB_DISPLAY_NAME)
    else:
        register_warehouse(session_id)
        logger.info("Data source '%s' registered", DB_DISPLAY_NAME)

    remove_sample_databases(session_id)


if __name__ == "__main__":
    main()
