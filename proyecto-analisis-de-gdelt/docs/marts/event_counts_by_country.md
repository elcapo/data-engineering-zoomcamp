# `event_counts_by_country`

## Purpose

Aggregated count of events per country and CAMEO root code within **15-minute** tumbling windows. Written by a Flink windowed job consuming the `gdelt.events` Kafka topic. Powers per-country event-volume dashboards and comparative conflict / cooperation views.

## Schema

| Column | Type | Description |
|---|---|---|
| `window_start` | **TIMESTAMP** (PK) | Start of the 15-min tumbling window (inclusive). |
| `window_end` | **TIMESTAMP** | End of the window (exclusive), equals `window_start` + **15 min**. |
| `country` | **TEXT** (PK) | CAMEO 3-letter country code taken from `events.actor1_country`. |
| `event_root_code` | **TEXT** (PK) | CAMEO event root code, from **01** to **20**. |
| `event_count` | **INTEGER** | Number of events in the window for `(country, event_root_code)`. |
| `avg_goldstein` | **REAL** | Mean `goldstein_scale` of those events, between **-10** and **10**. |

Primary key: `(window_start, country, event_root_code)`.

## Invariants

- Every 15-min window is aligned to **:00**, **:15**, **:30**, **:45**.
- `window_end` − `window_start` = **15 minutes** by construction.
- `event_count` ≥ **1**; empty groups are not emitted.
- `avg_goldstein` inherits the **[-10, 10]** bound from `events.goldstein_scale`.

## Observed window range

| min(window_start) | max(window_end) |
|---|---|
| 2026-04-14 17:45:00 | 2026-04-14 19:30:00 |

## Sample records

| window_start | window_end | country | event_root_code | event_count | avg_goldstein |
|---|---|---|---|---|---|
| 2026-04-14 17:45:00 | 2026-04-14 18:00:00 | ZWE | 07 | 2 | 7.0 |
| 2026-04-14 17:45:00 | 2026-04-14 18:00:00 | PSE | 04 | 2 | 1.9 |
| 2026-04-14 17:45:00 | 2026-04-14 18:00:00 | KGZ | 05 | 2 | 3.5 |
