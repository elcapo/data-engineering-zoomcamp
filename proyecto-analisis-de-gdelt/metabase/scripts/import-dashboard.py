#!/usr/bin/env python3
"""Import a Metabase dashboard previously exported by export-dashboard.sh.

Remaps database, table and field ids by matching names against the target
instance. Creates new cards and a new dashboard; does not update existing.

Usage:
    ./import-dashboard.py <export-dir> [--collection-id N] [--name-suffix " (imported)"]
"""
from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

from _metabase import api, load_creds, login


def build_maps(export_dir: Path, host: str, session: str):
    """Return (db_map, table_map, field_map): source-id -> target-id."""
    db_map: dict[int, int] = {}
    table_map: dict[int, int] = {}
    field_map: dict[int, int] = {}

    meta_dir = export_dir / "metadata"
    if not meta_dir.exists():
        print("No metadata/ directory in export; nothing to remap.", file=sys.stderr)
        return db_map, table_map, field_map

    target_dbs = api("GET", "/api/database", host=host, session=session)["data"]
    tgt_by_name = {d["name"]: d["id"] for d in target_dbs}

    for meta_file in sorted(meta_dir.glob("db-*.json")):
        src = json.loads(meta_file.read_text())
        src_id, src_name = src["id"], src["name"]
        tgt_id = tgt_by_name.get(src_name)
        if tgt_id is None:
            raise RuntimeError(
                f"Target database '{src_name}' not found. Available: {sorted(tgt_by_name)}"
            )
        db_map[src_id] = tgt_id
        print(f"  db {src_id} ({src_name}) -> {tgt_id}")

        tgt_meta = api("GET", f"/api/database/{tgt_id}/metadata",
                       host=host, session=session,
                       params={"include_hidden": "true"})
        tgt_tables = {(t.get("schema"), t["name"]): t for t in tgt_meta["tables"]}

        for src_t in src["tables"]:
            key = (src_t.get("schema"), src_t["name"])
            tgt_t = tgt_tables.get(key)
            if tgt_t is None:
                print(f"  WARN: table {key} not in target db", file=sys.stderr)
                continue
            table_map[src_t["id"]] = tgt_t["id"]

            tgt_fields = {f["name"]: f for f in tgt_t["fields"]}
            for src_f in src_t["fields"]:
                tgt_f = tgt_fields.get(src_f["name"])
                if tgt_f is None:
                    print(
                        f"  WARN: field {src_t['name']}.{src_f['name']} not in target",
                        file=sys.stderr,
                    )
                    continue
                field_map[src_f["id"]] = tgt_f["id"]

    print(f"  mapped {len(db_map)} dbs, {len(table_map)} tables, {len(field_map)} fields")
    return db_map, table_map, field_map


def remap_ids(obj, db_map, table_map, field_map):
    """Recursively remap database/table/field ids in an MBQL query or dashcard JSON."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k == "database" and isinstance(v, int):
                out[k] = db_map.get(v, v)
            elif k in ("source-table", "source_table") and isinstance(v, int):
                out[k] = table_map.get(v, v)
            elif k in ("table_id", "fk_target_field_id", "parent_id") and isinstance(v, int):
                out[k] = table_map.get(v, v) if k == "table_id" else field_map.get(v, v)
            elif k == "database_id" and isinstance(v, int):
                out[k] = db_map.get(v, v)
            else:
                out[k] = remap_ids(v, db_map, table_map, field_map)
        return out
    if isinstance(obj, list):
        # MBQL v2: ["field", {opts}, <int-id>]
        # MBQL v1: ["field", <int-id>, {opts-or-null}] or ["field-id", <int-id>]
        if len(obj) >= 2 and obj[0] == "field":
            if len(obj) >= 3 and isinstance(obj[2], int):
                return [obj[0], remap_ids(obj[1], db_map, table_map, field_map),
                        field_map.get(obj[2], obj[2])] + [
                    remap_ids(x, db_map, table_map, field_map) for x in obj[3:]
                ]
            if isinstance(obj[1], int):
                return [obj[0], field_map.get(obj[1], obj[1])] + [
                    remap_ids(x, db_map, table_map, field_map) for x in obj[2:]
                ]
        if len(obj) == 2 and obj[0] == "field-id" and isinstance(obj[1], int):
            return [obj[0], field_map.get(obj[1], obj[1])]
        return [remap_ids(x, db_map, table_map, field_map) for x in obj]
    return obj


def remap_card_refs(obj, card_map: dict[int, int]):
    """Second pass: remap `source-table: 'card__<id>'` references."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in ("source-table", "source_table") and isinstance(v, str) and v.startswith("card__"):
                try:
                    old = int(v.split("__", 1)[1])
                    out[k] = f"card__{card_map.get(old, old)}"
                except ValueError:
                    out[k] = v
            else:
                out[k] = remap_card_refs(v, card_map)
        return out
    if isinstance(obj, list):
        return [remap_card_refs(x, card_map) for x in obj]
    return obj


def extract_card_deps(card_json) -> set[int]:
    """Find other card ids that this card's query depends on (card__<id> refs)."""
    deps: set[int] = set()

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("source-table", "source_table") and isinstance(v, str) and v.startswith("card__"):
                    try:
                        deps.add(int(v.split("__", 1)[1]))
                    except ValueError:
                        pass
                else:
                    walk(v)
        elif isinstance(o, list):
            for x in o:
                walk(x)

    walk(card_json.get("dataset_query"))
    return deps


def topo_sort_cards(cards_by_id: dict[int, dict]) -> list[int]:
    """Kahn's algorithm. Ids with no (in-set) deps first."""
    deps = {cid: extract_card_deps(c) & set(cards_by_id) for cid, c in cards_by_id.items()}
    order: list[int] = []
    remaining = dict(deps)
    while remaining:
        ready = [cid for cid, d in remaining.items() if not d]
        if not ready:
            # Cycle or unresolved ref; emit the rest in arbitrary order.
            order.extend(remaining)
            break
        ready.sort()
        for cid in ready:
            order.append(cid)
            del remaining[cid]
        for d in remaining.values():
            d.difference_update(ready)
    return order


CARD_CREATE_FIELDS = {
    "name", "description", "display", "dataset_query", "visualization_settings",
    "parameters", "parameter_mappings", "collection_id", "cache_ttl", "type",
}


def prepare_card_body(card_json: dict, collection_id: int | None, db_map, table_map, field_map):
    body = {k: v for k, v in card_json.items() if k in CARD_CREATE_FIELDS}
    body = remap_ids(body, db_map, table_map, field_map)
    body["collection_id"] = collection_id
    # result_metadata is regenerated by Metabase on first run; do not carry source ids.
    body.pop("result_metadata", None)
    return body


def prepare_dashcards(dashboard_json: dict, card_map, db_map, table_map, field_map):
    """Build the dashcards payload for PUT /api/dashboard/:id.

    Metabase convention: new dashcards use negative ids (-1, -2, ...)."""
    out = []
    for idx, dc in enumerate(dashboard_json.get("dashcards", []), start=1):
        new = remap_ids(copy.deepcopy(dc), db_map, table_map, field_map)
        new = remap_card_refs(new, card_map)
        src_card_id = dc.get("card_id")
        if src_card_id is not None:
            new["card_id"] = card_map.get(src_card_id, src_card_id)
        # Remap series references (list of cards)
        if isinstance(new.get("series"), list):
            new_series = []
            for s in new["series"]:
                if isinstance(s, dict) and "id" in s:
                    new_series.append({**s, "id": card_map.get(s["id"], s["id"])})
                else:
                    new_series.append(s)
            new["series"] = new_series
        new["id"] = -idx  # negative = new
        # Strip server-managed/irrelevant fields
        for drop in ("created_at", "updated_at", "entity_id", "dashboard_id", "card",
                     "collection_authority_level", "dashboard_tab_id"):
            new.pop(drop, None)
        out.append(new)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("export_dir", type=Path, help="Folder produced by export-dashboard.sh")
    ap.add_argument("--collection-id", type=int, default=None,
                    help="Target collection for dashboard and cards (default: root)")
    ap.add_argument("--name-suffix", default="",
                    help="String appended to dashboard/card names on import (default: none)")
    args = ap.parse_args()

    export_dir: Path = args.export_dir
    if not (export_dir / "dashboard.json").is_file():
        sys.exit(f"Missing {export_dir}/dashboard.json")

    root = Path(__file__).resolve().parents[2]
    host, user, password = load_creds(root)

    print(f"Logging in to {host} as {user}...")
    session = login(host, user, password)

    print("Building id maps from metadata...")
    db_map, table_map, field_map = build_maps(export_dir, host=host, session=session)

    dashboard_json = json.loads((export_dir / "dashboard.json").read_text())
    cards_dir = export_dir / "cards"
    cards_by_id = {
        int(p.stem): json.loads(p.read_text()) for p in sorted(cards_dir.glob("*.json"))
    }
    print(f"Loaded dashboard + {len(cards_by_id)} card(s).")

    order = topo_sort_cards(cards_by_id)
    card_map: dict[int, int] = {}

    print("Creating cards...")
    for src_id in order:
        src_card = cards_by_id[src_id]
        body = prepare_card_body(src_card, args.collection_id, db_map, table_map, field_map)
        if args.name_suffix:
            body["name"] = body.get("name", "") + args.name_suffix
        # Apply card_map for refs to cards already created in this run.
        body["dataset_query"] = remap_card_refs(body.get("dataset_query", {}), card_map)
        created = api("POST", "/api/card", host=host, session=session, body=body)
        card_map[src_id] = created["id"]
        print(f"  card {src_id} '{src_card.get('name')}' -> {created['id']}")

    print("Creating dashboard...")
    dash_body = {
        "name": dashboard_json["name"] + args.name_suffix,
        "description": dashboard_json.get("description"),
        "collection_id": args.collection_id,
    }
    created_dash = api("POST", "/api/dashboard", host=host, session=session, body=dash_body)
    new_dash_id = created_dash["id"]

    dashcards = prepare_dashcards(dashboard_json, card_map, db_map, table_map, field_map)

    # Parameters live on the dashboard itself. Carry them across (after remap).
    params = remap_ids(copy.deepcopy(dashboard_json.get("parameters", [])),
                       db_map, table_map, field_map)
    params = remap_card_refs(params, card_map)

    update_body = {
        "dashcards": dashcards,
        "parameters": params,
        "tabs": dashboard_json.get("tabs", []),
    }
    api("PUT", f"/api/dashboard/{new_dash_id}", host=host, session=session, body=update_body)

    slug = dashboard_json["name"].lower().replace(" ", "-")
    print()
    print(f"Dashboard created: id={new_dash_id}")
    print(f"Open: {host}/dashboard/{new_dash_id}-{slug}")


if __name__ == "__main__":
    main()
