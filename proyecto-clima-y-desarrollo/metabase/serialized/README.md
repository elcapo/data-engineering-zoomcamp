# Metabase Serialized Content

This directory holds the **YAML serialization** of the Metabase dashboard,
questions, models, and metrics. It is the single source of truth for the
dashboard's reproducibility — versioned in git, never edited by hand.

## Initial state

Empty (apart from this README). Populate it once the two dashboard tiles
described in the project README are built.

## How to populate

You have two equivalent paths; pick whichever fits the moment.

### Path A — UI + Metabot

1. Open Metabase at `http://localhost:${METABASE_PORT:-3000}` and log in
   with `METABASE_ADMIN_EMAIL` / `METABASE_ADMIN_PASSWORD` from `.env`.
2. Build the two tiles from the README's "Dashboard" section. Use Metabot
   (the native chat) for assistance — it sees the `marts` schema directly.
3. Run `make metabase-export` to dump the state into this directory.
4. `git add metabase/serialized && git commit`.

### Path B — Claude Code + Metabase MCP

1. Register the MCP server in your Claude Code config:

   ```bash
   claude mcp add metabase http://localhost:${METABASE_PORT:-3000}/api/mcp \
       --transport streamable-http
   ```

2. Optionally clone <https://github.com/metabase/agent-skills> for skill
   shortcuts that wrap export/import and content authoring.
3. Ask Claude Code (in this repo) to build the tiles described in the
   project README from `marts.country_year_environment`. The agent uses
   the MCP tools (`search`, `get_table`, `construct_query`, `execute_query`,
   …) plus the file-based serialization path.
4. Run `make metabase-export` and commit.

## How to restore

On a fresh checkout / clean database:

```bash
make up                # boots Metabase, creates the admin user + data source
make metabase-import   # rehydrates dashboards from this directory
```

`metabase-import` is a no-op if this directory is still empty.
