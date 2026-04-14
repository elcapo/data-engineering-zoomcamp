# GDELT / CAMEO lookup tables

CSV reference tables for the categorical columns of `events`. Extracted from the upstream codebooks in [`../codebooks/`](../codebooks/).

| File | Rows | Source document | Source section |
|---|---|---|---|
| `quad_class.csv` | **4** | `GDELT-Event_Codebook-V2.0.pdf` | *QuadClass* field description |
| `event_root_code.csv` | **20** | `CAMEO.Manual.1.1b3.pdf` | Chapter 6 — CAMEO Event Codes (top-level categories) |
| `event_base_code.csv` | **149** | `CAMEO.Manual.1.1b3.pdf` | Chapter 6 — CAMEO Event Codes (3-digit subcategories) |
| `action_geo_type.csv` | **6** | `GDELT-Event_Codebook-V2.0.pdf` | *Actor1Geo_Type* field description (value **0** added for "no location resolved", not explicit in the codebook) |

All columns are strings; numeric codes are zero-padded to the natural CAMEO width (e.g. **01**, **010**). `event_base_code.csv` includes an `event_root_code` column pointing at the parent family for easy joins.
