# `mentions`

## Purpose

Every re-citation of an event in a news article monitored by GDELT. A single `global_event_id` produces one row in `events` but many rows in `mentions` — one per article mention, re-emitted by GDELT for up to **~60 days** after the event first appears. Used to measure media attention over time and per-source sentiment.

## Source schema

The source mentions file has **16 columns** in a tab-delimited format with no header row. The [producer](../../producer/gdelt.py) projects **7** of them into the local schema below.

See [`docs/examples/headers/mentions.tsv`](../../docs/examples/headers/mentions.tsv) for the full list of available columns.

| idx | GDELT name | Local column | Kept? |
|---|---|---|---|
| 0 | `GlobalEventID` | `global_event_id` | **Yes** |
| 1 | `EventTimeDate` | `event_time_date` | **Yes** |
| 2 | `MentionTimeDate` | `mention_time_date` | **Yes** |
| 3 | `MentionType` | — | No |
| 4 | `MentionSourceName` | `mention_source` | **Yes** |
| 5 | `MentionIdentifier` | `mention_identifier` | **Yes** |
| 6 | `SentenceID` | `sentence_id` | **Yes** |
| 7–9 | `Actor1CharOffset`, `Actor2CharOffset`, `ActionCharOffset` | — | No |
| 10 | `InRawText` | — | No |
| 11 | `Confidence` | — | No |
| 12 | `MentionDocLen` | — | No |
| 13 | `MentionDocTone` | `mention_doc_tone` | **Yes** |
| 14 | `MentionDocTranslationInfo` | — | No |
| 15 | `Extras` | — | No |

The natural key of a mention combines:

- `GlobalEventID`
- `MentionIdentifier`
- `SentenceID`

## Local schema

| Column | Type | Description |
|---|---|---|
| `global_event_id` | **BIGINT** (PK) | Foreign key to `events.global_event_id`. Not enforced as FK: mentions can reference events that were never ingested (see *Invariants*). |
| `event_time_date` | **BIGINT** | Timestamp **YYYYMMDDHHMMSS** of the 15-min window in which the event was first published. |
| `mention_time_date` | **BIGINT** | Timestamp **YYYYMMDDHHMMSS** of the 15-min window in which this mention was captured. |
| `mention_source` | **TEXT** | Domain of the article (e.g. **jdsupra.com**). |
| `mention_identifier` | **TEXT** (PK) | Unique external identifier for the source document. A fully qualified URL when `MentionType` is **1** (web), otherwise a textual citation or DOI. |
| `sentence_id` | **INTEGER** (PK) | **1-indexed** position of the sentence within the article where the event was mentioned. |
| `mention_doc_tone` | **REAL** | Average tone of the article, between **-100** and **100**. Negative means negative sentiment. Observed range in practice is much narrower (see *Invariants*). |

The primary key is composed by:

- `global_event_id`
- `mention_identifier`
- `sentence_id`

The Flink JDBC sink declares the same key as **NOT ENFORCED**, which switches the connector to UPSERT mode.

The table is indexed by:

- `idx_mentions_event_time` on `event_time_date`
- `mentions_pkey` (implicit, on the primary key)

## Invariants and observed behavior

- GDELT reemits mentions continuously for up to **~60 days** after the event.
- **Orphan mentions are expected.** A mention may reference an event that was never ingested. This is expected when the pipeline is started mid-stream, since GDELT keeps reemitting mentions for old events. No FK is enforced for this reason.

## Sample record

| global_event_id | event_time_date | mention_time_date | mention_source | mention_identifier | sentence_id | mention_doc_tone |
|---|---|---|---|---|---|---|
| 1299173776 | 20260414174500 | 20260414174500 | hindustantimes.com | https://www.hindustantimes.com/... | 3 | -7.073 |

> Table freshly reseeded on **2026-04-14** — sample stats will be regenerated from live data once the next ingest cycles complete.
