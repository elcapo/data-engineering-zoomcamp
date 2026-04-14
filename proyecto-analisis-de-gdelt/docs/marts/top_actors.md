# `top_actors`

## Purpose

Hourly count of events per CAMEO actor (Actor 1). Feeds "most active actors" rankings in dashboards.

## Schema

| Column | Type | Description |
|---|---|---|
| `window_start` | **TIMESTAMP** (PK) | Start of the **1-hour** tumbling window. |
| `window_end` | **TIMESTAMP** | End of the window. |
| `actor_code` | **TEXT** (PK) | CAMEO actor code taken from `events.actor1_code`. |
| `event_count` | **INTEGER** | Number of events in the window where `actor1_code` equals `actor_code`. |

The primary key is composed by:

- `window_start`
- `actor_code`

## Invariants

- Window length: **1 hour** aligned to **:00**
- Rows where `actor1_code` is empty are not emitted

> **Caveat.** Observed values mix upper-case CAMEO codes (**RUS**, **HLH**) and lower-case fragments (**gin**). Downstream visualizations should normalize with `UPPER()` when grouping.

## Sample records

| window_start | window_end | actor_code | event_count |
|---|---|---|---|
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | gin | 6 |
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | RUS | 14 |
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | HLH | 20 |
