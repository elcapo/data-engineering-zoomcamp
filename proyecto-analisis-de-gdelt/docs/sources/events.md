# `events`

## Purpose

Each row is a single geopolitical or socio-economic event extracted by GDELT from one or more news articles, published every 15 minutes.

## Source schema

The source events file has **61 columns** in a tab-delimited format with no header row. The [producer](../../producer/gdelt.py) projects **20** of them into the local schema below.

See [`examples/headers/events.csv`](../../examples/headers/events.csv) for the full list of available columns.

Notable columns that are **not** ingested:

- `AvgTone` (idx **34**) — average tone of articles about the event.
- `Actor*Geo_*` (idx **36–50**) — per-actor geographic resolution.
- `Actor*KnownGroupCode`, `Actor*EthnicCode`, `Actor*Religion1/2Code`, `Actor*Type1/2/3Code` — actor attribute detail.
- `EventCode`, `EventBaseCode`, `IsRootEvent` — finer CAMEO taxonomy; we only keep `EventRootCode`.
- `ActionGeo_ADM1Code`, `ActionGeo_ADM2Code`, `ActionGeo_FeatureID` — sub-national geocoding.

## Local schema

| Column | Type | Description |
|---|---|---|
| `global_event_id` | **BIGINT** (PK) | Globally unique identifier assigned by GDELT to the event. Stable across all GDELT 2.0 files. |
| `sql_date` | **INTEGER** | Date the event took place, encoded as **YYYYMMDD**. May differ from `date_added` if the event is historic. |
| `actor1_code` | **TEXT** | CAMEO code of Actor 1 (initiator). May be empty when the extractor could not identify a subject. |
| `actor1_name` | **TEXT** | Human-readable name of Actor 1 (e.g. **CONGRESS**, **PARIS**). |
| `actor1_country` | **TEXT** | 3-letter CAMEO country code for Actor 1 (e.g. **USA**, **FRA**). May be empty. |
| `actor2_code` | **TEXT** | CAMEO code of Actor 2 (target). |
| `actor2_name` | **TEXT** | Human-readable name of Actor 2. |
| `actor2_country` | **TEXT** | 3-letter CAMEO country code for Actor 2. |
| `event_root_code` | **TEXT** | Top-level CAMEO event category, zero-padded from **01** to **20**. See categorical reference below. |
| `quad_class` | **SMALLINT** | Rollup into 4 primary interaction classes. See categorical reference below. |
| `goldstein_scale` | **REAL** | Theoretical impact on country stability, between **-10** and **10**. Negative means conflict or harm; positive means cooperation. |
| `num_mentions` | **INTEGER** | Total number of mentions of this event across all monitored sources (running count at ingest time). |
| `num_sources` | **INTEGER** | Number of distinct information sources mentioning the event. |
| `num_articles` | **INTEGER** | Number of source documents containing at least one mention of the event. |
| `action_geo_type` | **SMALLINT** | Geographic resolution of the action location. See categorical reference below. |
| `action_geo_name` | **TEXT** | Full text name of the location where the action took place. |
| `action_geo_lat` | **REAL** | Latitude of the action location. |
| `action_geo_long` | **REAL** | Longitude of the action location. |
| `date_added` | **BIGINT** | Timestamp encoded as **YYYYMMDDHHMMSS** when GDELT published the event in its 15-min export file. |
| `source_url` | **TEXT** | URL of the article that first generated the event. |

The table is indexed by:

- `idx_events_date_added` on `date_added`
- `idx_events_country` on `actor1_country`

## Categorical reference

### `quad_class`

| Value | Meaning |
|---|---|
| **1** | Verbal Cooperation |
| **2** | Material Cooperation |
| **3** | Verbal Conflict |
| **4** | Material Conflict |

### `event_root_code`

| Value | CAMEO family |
|---|---|
| **01** | Make public statement |
| **02** | Appeal |
| **03** | Express intent to cooperate |
| **04** | Consult |
| **05** | Engage in diplomatic cooperation |
| **07** | Provide aid |
| **08** | Yield |
| **11** | Disapprove |
| **17** | Coerce |
| **19** | Fight |

### `action_geo_type`

| Value | Meaning |
|---|---|
| **0** | No location resolved |
| **1** | Country |
| **2** | US state |
| **3** | US city |
| **4** | World city |
| **5** | World state |

## Invariants and observed ranges

- `goldstein_scale` is bounded between **-10** and **10**.
  - Observed average ≈ **0.69** — slight cooperation bias.
- `date_added` is always populated and increases monotonically with the 15-min publication window.
- `num_mentions` ≥ `num_articles` ≥ `num_sources` holds by construction in GDELT.

## Sample records

| global_event_id | sql_date | actor1_name | actor2_name | event_root_code | quad_class | goldstein_scale | action_geo_name | date_added |
|---|---|---|---|---|---|---|---|---|
| 1299173789 | 20260413 | *(empty)* | CONGRESS | 11 | 3 | -2.0 | China | 20260414174500 |
| 1299173788 | 20260407 | LEGISLATOR | LOS ANGELES | 05 | 1 | 3.4 | Los Angeles, California, United States | 20260414174500 |
| 1299173787 | 20260407 | PARIS | FRANCE | 12 | 3 | -4.0 | Paris, France (general), France | 20260414174500 |
