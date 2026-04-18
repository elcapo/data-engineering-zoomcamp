#!/usr/bin/env python3
"""Export a Metabase dashboard (and the cards it references) as JSON files.

Also dumps schema metadata for every referenced database so that
import-dashboard.py can remap db/table/field ids by name.

Usage:
    ./export-dashboard.py <id | name | url-slug>
    e.g. 2, "GDELT Analysis", 2-gdelt-analysis
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from _metabase import api, load_creds, login, slugify


def resolve_dashboard_id(ref: str, host: str, session: str) -> int:
    if ref.isdigit():
        return int(ref)
    m = re.match(r"^(\d+)-", ref)
    if m:
        return int(m.group(1))
    resp = api("GET", "/api/search", host=host, session=session,
               params={"q": ref, "models": "dashboard"})
    for d in resp.get("data", []):
        if d.get("name") == ref:
            return d["id"]
    sys.exit(f"Dashboard '{ref}' not found")


def extract_card_ids(dashboard: dict) -> list[int]:
    ids: set[int] = set()
    for dc in dashboard.get("dashcards") or []:
        if dc.get("card_id") is not None:
            ids.add(dc["card_id"])
        for s in dc.get("series") or []:
            if isinstance(s, dict) and s.get("id") is not None:
                ids.add(s["id"])
    for p in dashboard.get("parameters") or []:
        cfg = p.get("values_source_config") or {}
        cid = cfg.get("card_id")
        if cid is not None:
            ids.add(cid)
    return sorted(ids)


def trim_db_metadata(meta: dict) -> dict:
    return {
        "id": meta["id"],
        "name": meta["name"],
        "engine": meta.get("engine"),
        "tables": [
            {
                "id": t["id"],
                "name": t["name"],
                "schema": t.get("schema"),
                "fields": [
                    {"id": f["id"], "name": f["name"], "parent_id": f.get("parent_id")}
                    for f in t.get("fields") or []
                ],
            }
            for t in meta.get("tables") or []
        ],
    }


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ref", help="Dashboard id, exact name, or url-slug (e.g. 2-gdelt-analysis)")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[2]
    host, user, password = load_creds(root)

    print(f"Logging in to {host} as {user}...")
    session = login(host, user, password)

    dash_id = resolve_dashboard_id(args.ref, host, session)
    print(f"Fetching dashboard id={dash_id}...")
    dashboard = api("GET", f"/api/dashboard/{dash_id}", host=host, session=session)

    slug = f"{dashboard['id']}-{slugify(dashboard['name'])}"
    out_dir = root / "metabase" / "export" / slug
    (out_dir / "cards").mkdir(parents=True, exist_ok=True)
    write_json(out_dir / "dashboard.json", dashboard)

    card_ids = extract_card_ids(dashboard)
    cards = []
    if card_ids:
        print(f"Exporting {len(card_ids)} referenced card(s)...")
        for cid in card_ids:
            c = api("GET", f"/api/card/{cid}", host=host, session=session)
            write_json(out_dir / "cards" / f"{cid}.json", c)
            cards.append(c)
    else:
        print("No cards referenced.")

    db_ids = sorted({c["database_id"] for c in cards if c.get("database_id") is not None})
    if db_ids:
        meta_dir = out_dir / "metadata"
        meta_dir.mkdir(exist_ok=True)
        for db_id in db_ids:
            print(f"Exporting metadata for database id={db_id}...")
            meta = api("GET", f"/api/database/{db_id}/metadata",
                       host=host, session=session,
                       params={"include_hidden": "true"})
            write_json(meta_dir / f"db-{db_id}.json", trim_db_metadata(meta))

    print(f"Done -> {out_dir}")


if __name__ == "__main__":
    main()
