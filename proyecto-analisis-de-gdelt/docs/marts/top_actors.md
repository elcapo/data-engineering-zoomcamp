# `top_actors`

## Purpose

Hourly count of events per CAMEO actor (Actor 1). Feeds "most active actors" rankings in dashboards.

## Schema

| Column | Type | Description |
|---|---|---|
| `window_start` | `TIMESTAMP` (PK) | Start of the 1-hour tumbling window. |
| `window_end` | `TIMESTAMP` | End of the window. |
| `actor_code` | `TEXT` (PK) | CAMEO actor code taken from `events.actor1_code`. Note: observed values mix upper-case CAMEO codes (`RUS`, `HLH`) and lower-case fragments (`gin`) — downstream visualizations should `UPPER()` when grouping. |
| `event_count` | `INTEGER` | Number of events in the window where `actor1_code = actor_code`. |

Primary key: `(window_start, actor_code)`.

## Invariants

- Window length: 1 hour, aligned to `:00`.
- `event_count >= 1`.
- Rows where `actor1_code` is empty are not emitted.

## Sample records

| window_start | window_end | actor_code | event_count |
|---|---|---|---|
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | gin | 6 |
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | RUS | 14 |
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | HLH | 20 |
