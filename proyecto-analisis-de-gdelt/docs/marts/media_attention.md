# `media_attention`

## Purpose

Per-event mention count within 15-min windows, used to surface events that are "trending" — receiving disproportionate coverage in monitored media. Built from the `gdelt.mentions` Kafka topic.

## Schema

| Column | Type | Description |
|---|---|---|
| `window_start` | `TIMESTAMP` (PK) | Start of the 15-min tumbling window. |
| `window_end` | `TIMESTAMP` | End of the window. |
| `global_event_id` | `BIGINT` (PK) | Event identifier (same namespace as `events.global_event_id`). Not a FK: the referenced event may be an orphan (see `sources/mentions.md`). |
| `mention_count` | `INTEGER` | Number of rows observed in `mentions` for the event within the window. |

Primary key: `(window_start, global_event_id)`.

## Invariants

- Window length: 15 minutes, aligned to `:00`, `:15`, `:30`, `:45`.
- `mention_count >= 1`.
- Since the raw `mentions` stream contains duplicates (see `sources/mentions.md`), `mention_count` reflects raw mention rows, not necessarily unique articles. Deduplicate upstream if article-level counts are required.

## Sample records

| window_start | window_end | global_event_id | mention_count |
|---|---|---|---|
| 2026-04-14 17:45:00 | 2026-04-14 18:00:00 | 1299155709 | 4 |
| 2026-04-14 17:45:00 | 2026-04-14 18:00:00 | 1299153415 | 2 |
| 2026-04-14 17:45:00 | 2026-04-14 18:00:00 | 1299122416 | 4 |
