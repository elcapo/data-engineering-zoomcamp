# `gkg`

## Purpose

One row per article processed by GDELT, with extracted themes, named entities, tone scores and document metadata. Used for semantic and thematic analytics.

## Source schema

The source GKG file has **27 columns** in a tab-delimited format with no header row. The [producer](../../producer/gdelt.py) projects **8** of them into the local schema below (one of which, `V2Tone`, splits into 4 local columns).

See [`docs/examples/headers/gkg.tsv`](../../docs/examples/headers/gkg.tsv) for the full list of available columns.

| idx | GDELT name | Local column |
|---|---|---|
| 0 | `GKGRECORDID` | `gkg_record_id` |
| 1 | `DATE` | `gkg_date` |
| 3 | `SourceCommonName` | `source_name` |
| 4 | `DocumentIdentifier` | `document_id` |
| 7 | `Themes` | `themes` |
| 11 | `Persons` | `persons` |
| 13 | `Organizations` | `organizations` |
| 15 | `V2Tone` | split into `tone`, `positive_score`, `negative_score`, `word_count` |

## Local schema

| Column | Type | Description |
|---|---|---|
| `gkg_record_id` | **TEXT** (PK) | Unique GKG record id, formatted **YYYYMMDDHHMMSS-X** or **YYYYMMDDHHMMSS-TX**. |
| `gkg_date` | **BIGINT** | Publication timestamp of the GKG file in **YYYYMMDDHHMMSS** format, aligned to a 15-min window. |
| `source_name` | **TEXT** | Domain of the article (e.g. **stereogum.com**). Comes from `SourceCommonName`. |
| `document_id` | **TEXT** | URL of the source document (`DocumentIdentifier`). |
| `themes` | **TEXT** | Semicolon-separated list of GDELT V1 theme codes. |
| `persons` | **TEXT** | Semicolon-separated list of person names extracted from the article. |
| `organizations` | **TEXT** | Semicolon-separated list of company and organization names extracted from the article. |
| `tone` | **REAL** | First field of `V2Tone`: average document tone, between **-100** and **100**. |
| `positive_score` | **REAL** | Second field of `V2Tone`: percentage of words with positive polarity. |
| `negative_score` | **REAL** | Third field of `V2Tone`: percentage of words with negative polarity. |
| `word_count` | **INTEGER** | Seventh field of `V2Tone`: article word count. |

The table is indexed by:

- `idx_gkg_date` on `gkg_date`

## Invariants and conventions

- Multi-valued fields (`themes`, `persons`, `organizations`) are denormalized strings separated by **;**.
- Despite the **.CSV** extension, GDELT files are tab-delimited.

## Sample records (truncated)

| gkg_record_id | gkg_date | source_name | tone | positive_score | negative_score | word_count |
|---|---|---|---|---|---|---|
| 20260414174500-29 | 20260414174500 | stereogum.com | -3.559 | 0.712 | 4.270 | 249 |
| 20260414174500-12 | 20260414174500 | bgr.com | -0.647 | 2.773 | 3.420 | 953 |

Example `themes` payload:

```
DRONES;TAX_FNCACT;TAX_FNCACT_MAN;UNGP_FORESTS_RIVERS_OCEANS;ARMEDCONFLICT;...
```

Example `persons` payload:

```
vladimir putin;volodymyr zelensky;olaf scholz;...
```

Example `organizations` payload:

```
united nations;nato;european union;...
```
