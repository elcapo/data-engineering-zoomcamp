# worldbank-producer

Two-step batch ingestor for the World Bank Indicators API.

1. `worldbank-ingest` — fetches each `(indicator, year)` payload from the API and writes the raw JSON to S3 at `s3://$STORAGE_BUCKET/worldbank/raw/{indicator}/{year}.json`.
2. `worldbank-load` — reads the same objects back from S3 and upserts the parsed records into Postgres `raw.worldbank_indicators_raw` (or, when `WAREHOUSE_BACKEND=bigquery`, into the equivalent BigQuery table — not implemented in slice 1).

## Usage

```bash
worldbank-ingest --start-year 2020 --end-year 2022
worldbank-load   --start-year 2020 --end-year 2022
```

Both CLIs accept the same arguments. `--indicators CODE,CODE,...` overrides the `INDICATORS` env var (default: the 8 codes listed in the project README).

## Configuration

All settings come from environment variables; see `src/worldbank/config.py` and the project-level `env.template`.
