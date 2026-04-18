"""Shared helpers for the Metabase export/import scripts."""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def load_env(root: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    f = root / ".env"
    if f.exists():
        for raw in f.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    env.update(os.environ)
    return env


def load_creds(root: Path) -> tuple[str, str, str]:
    env = load_env(root)
    host = f"http://localhost:{env.get('METABASE_PORT', '8084')}"
    user = env.get("METABASE_USER", "admin@admin.com")
    password = env.get("METABASE_PASSWORD")
    if not password:
        sys.exit("METABASE_PASSWORD not set (in .env or environment)")
    return host, user, password


def api(method: str, path: str, *, host: str, session: str | None = None,
        body=None, params: dict | None = None):
    if params:
        path = f"{path}?{urllib.parse.urlencode(params, doseq=True)}"
    headers = {"Content-Type": "application/json"}
    if session:
        headers["X-Metabase-Session"] = session
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(host + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise RuntimeError(f"{method} {path} -> HTTP {e.code}: {detail}") from None


def login(host: str, user: str, password: str) -> str:
    resp = api("POST", "/api/session", host=host,
               body={"username": user, "password": password})
    return resp["id"]


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return s.strip("-")
