# `tone_by_theme`

## Purpose

Hourly average article tone per GDELT theme, derived from the `gkg` stream. Enables thematic sentiment tracking — e.g. *how negative is coverage around **ARMEDCONFLICT** this hour?*

## Schema

| Column | Type | Description |
|---|---|---|
| `window_start` | **TIMESTAMP** (PK) | Start of the **1-hour** tumbling window. |
| `window_end` | **TIMESTAMP** | End of the window. |
| `theme` | **TEXT** (PK) | A single GDELT theme code, obtained by splitting `gkg.themes` on **;**. Examples: **ARMEDCONFLICT**, **WB_2071_COMMON_LAW**, **TAX_WORLDLANGUAGES_CIARA**. |
| `avg_tone` | **REAL** | Mean `gkg.tone` across all articles tagged with the theme in the window, between **-100** and **100**. |

Primary key: `(window_start, theme)`.

## Invariants

- Window length: **1 hour** aligned to **:00**
- In theory, `avg_tone` is bounded between **-100** and **100**
  - In practice, observed tones are concentrated between **-30** and **30**
- An article tagged with **N** themes contributes to **N** rows — themes are not mutually exclusive.
- Empty theme tokens (trailing **;**) must be filtered upstream before aggregation.

## Sample records

| window_start | window_end | theme | avg_tone |
|---|---|---|---|
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | WB_2071_COMMON_LAW | -5.181 |
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | WB_2100_ADMINSTRATIVE_SIMPLIFICATION | -2.611 |
| 2026-04-14 17:00:00 | 2026-04-14 18:00:00 | TAX_WORLDLANGUAGES_CIARA | 4.348 |
