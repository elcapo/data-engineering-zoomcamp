# GDELT Producer

Python script that downloads the latest GDELT 2.0 update and publishes parsed records to Redpanda (Kafka API).

## Files

| File | Description |
|------|-------------|
| `main.py` | Entrypoint. Connects to Kafka, fetches the latest GDELT CSVs, publishes to `gdelt.events`, `gdelt.mentions`, and `gdelt.gkg` topics, then exits. |
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