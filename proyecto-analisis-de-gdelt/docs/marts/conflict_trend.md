# `conflict_trend`

## Purpose

Hourly rolling indicator of the average Goldstein score per country. Used to track how cooperative or conflictive the news-reported activity around each country is over time — **positive** means cooperation, **negative** means conflict.

## Schema

| Column | Type | Description |
|---|---|---|
| `window_start` | **TIMESTAMP** (PK) | Start of the **1-hour** tumbling window. |
| `window_end` | **TIMESTAMP** | End of the window, equals `window_start` + **1 hour**. |
| `country` | **TEXT** (PK) | CAMEO 3-letter country code, from `events.actor1_country`. |
| `avg_goldstein` | **REAL** | Mean Goldstein score across all events for the country in the window, between **-10** and **10**. |

Primary key: `(window_start, country)`.

## Invariants

- Window length: exactly **1 hour**, aligned to **:00**.
- Countries without events in a window are not emitted.
- `avg_goldstein` is bounded between **-10** and **10**.

## Observed window range

| min(window_start) | max(window_end) |
|---|---|
| 2026-04-14 17:00:00 | 2026-04-14 19:30:00 |

## Sample records

| window_start | window_end | country | avg_goldstein |
|---|---|---|---|
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | RUS | 2.829 |
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | BOL | 7.000 |
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | HUN | 4.417 |
