# Metabase Serialized Content

This directory holds **JSON exports** of Metabase dashboards and the cards they
reference, plus a small `metadata/` map that the importer uses to remap
database/table/field ids by name. It is the single source of truth for the
dashboard's reproducibility — versioned in git, never edited by hand.

The serializer is a pair of pure-Python scripts under `metabase/scripts/`
(`export-dashboard.py`, `import-dashboard.py`). Metabase ships its own
`bin/metabase export|import` but it is Enterprise-only; the scripts work on
the Community edition we run in Docker.

## Layout

```
metabase/serialized/
├── README.md                              ← this file
└── <dashboard_id>-<dashboard_slug>/
    ├── dashboard.json                     ← full dashboard payload
    ├── cards/<card_id>.json               ← one file per referenced card
    └── metadata/db-<source_db_id>.json    ← schema map for id remapping
```

## How to populate

You have two equivalent paths; pick whichever fits the moment.

### Path A — UI + Metabot

1. Open Metabase at `http://localhost:${METABASE_PORT:-3000}` and log in
   with `METABASE_ADMIN_EMAIL` / `METABASE_ADMIN_PASSWORD` from `.env`.
2. Build the dashboard tiles from the project README. Metabot (the native
   chat) sees the `marts` schema directly.
3. Run `make metabase-export DASHBOARD="<dashboard name|id|slug>"` to dump
   it into a new `metabase/serialized/<id>-<slug>/` folder.
4. `git add metabase/serialized && git commit`.

### Path B — Claude Code + Metabase MCP

1. Register the MCP server in your Claude Code config:

   ```bash
   claude mcp add metabase http://localhost:${METABASE_PORT:-3000}/api/mcp \
       --transport streamable-http
   ```

2. Optionally clone <https://github.com/metabase/agent-skills> for skill
   shortcuts that wrap export/import and content authoring.
3. Ask Claude Code (in this repo) to build the tiles from
   `marts.country_year_environment`. The agent uses the MCP tools plus
   direct calls to `/api/card` and `/api/dashboard` to assemble the layout.
4. Run `make metabase-export DASHBOARD="..."` and commit the result.

## How to restore

On a fresh checkout / clean database:

```bash
make up                                                          # boots Metabase + data source
make metabase-import DIR=metabase/serialized/<id>-<slug>         # rehydrates
```

Optional flags:

- `COLLECTION=<id>` — drop the imported dashboard/cards into a specific
  collection instead of the root.
- `SUFFIX=" (imported)"` — append a tag to the new names. Useful when
  re-importing alongside an existing copy without overwriting it.

The importer remaps database/table/field ids by name, so the `<id>` in the
folder name is documentary — the export from one machine imports cleanly
on another even if Postgres / table ids differ.
