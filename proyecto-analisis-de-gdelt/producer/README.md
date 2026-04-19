# GDELT Producer

Python script that downloads the latest GDELT 2.0 update and publishes parsed records to Redpanda (Kafka API).

## Files

| File | Description |
|------|-------------|
| `main.py` | Entrypoint. Connects to Kafka, fetches the latest GDELT CSVs, publishes to `gdelt.events`, `gdelt.mentions`, and `gdelt.gkg` topics, then exits. |
| `backfill.py` | Ad-hoc CLI to recover a historical range. Iterates every 15-min slot in `[start, end]`, downloads and publishes in one process. |
| `gdelt.py` | Core logic: fetches `lastupdate.txt`, downloads and extracts ZIPs, parses tab-delimited CSVs with type coercion and GKG tone splitting. |
| `tests/test_gdelt.py` | Unit tests for parsing and coercion logic. |

## Docker

```bash
docker compose build producer
docker compose run --rm producer
```

## Tests

Requires [uv](https://docs.astral.sh/uv/):

```bash
uv run pytest tests/ -v
```

## Backfill

Recover a historical range of 15-minute slots (e.g. after a Kestra outage). Timestamps must be aligned to `:00`, `:15`, `:30` or `:45`, UTC:

```bash
docker compose run --rm producer \
  python /app/backfill.py 20260419000000 20260419003000
```

Caveat: the Flink raw ingest keeps event-time (records land in Postgres with their real `event_ts`), but the aggregation jobs window over `PROCTIME()`. The replayed slots will produce a spike in the current proc-time window and leave the original windows empty. Good enough for ad-hoc recovery; a proper fix would migrate those jobs to event-time + watermarks.