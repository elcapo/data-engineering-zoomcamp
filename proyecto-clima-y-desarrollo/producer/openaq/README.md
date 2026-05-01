# openaq-producer

Polls the OpenAQ v3 API for the latest air-quality measurements at every monitoring station in the configured countries, then publishes one Kafka record per measurement to Redpanda.

## Usage

```bash
openaq-poll --countries ES,FR --parameters pm25,no2
```

Both flags are optional: they fall back to the `COUNTRIES` and `PARAMETERS` env vars. `COUNTRIES` has no default — without it, the CLI exits with a clear message.

## Topic contract

- Topic: `openaq.measurements` (compacted; partitions=1).
- Key: `<location_id>:<parameter>:<datetime_utc>` (UTF-8 string).
- Value: JSON object with `location_id`, `location_name`, `country_iso`, `sensor_id`, `parameter`, `unit`, `value`, `datetime_utc`, `datetime_local`, `latitude`, `longitude`.

Re-publishing the same key is a no-op for downstream consumers thanks to log compaction.

## Configuration

All settings come from environment variables; see `src/openaq/config.py` and the project-level `env.template`. The OpenAQ API key (`OPENAQ_API_KEY`) is required — get one at https://explore.openaq.org/register.
