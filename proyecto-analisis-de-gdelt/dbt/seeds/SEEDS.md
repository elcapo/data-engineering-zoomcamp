# GDELT / CAMEO lookup tables

CSV reference tables for the categorical columns of `events`, loaded into Postgres as dbt seeds (schema `public_lookup`). Extracted from the upstream codebooks in [`../../docs/examples/codebooks/`](../../docs/examples/codebooks/).

| File | Rows | Source document | Source section |
|---|---|---|---|
| `quad_class.csv` | **4** | `GDELT-Event_Codebook-V2.0.pdf` | *QuadClass* field description |
| `event_root_code.csv` | **20** | `CAMEO.Manual.1.1b3.pdf` | Chapter 6 — CAMEO Event Codes (top-level categories) |
| `event_base_code.csv` | **149** | `CAMEO.Manual.1.1b3.pdf` | Chapter 6 — CAMEO Event Codes (3-digit subcategories) |
| `action_geo_type.csv` | **6** | `GDELT-Event_Codebook-V2.0.pdf` | *Actor1Geo_Type* field description (value **0** added for "no location resolved", not explicit in the codebook) |
| `country_code.csv` | **167** | `CAMEO.Manual.1.1b3.pdf` | Chapter 2 — CAMEO Country Codes (3-letter CAMEO code → ISO 3166-1 alpha-2 → English name) |
| `actor_role_code.csv` | **27** | `CAMEO.Manual.1.1b3.pdf` | Chapter 3, Table 3.1 — Generic Domestic Role Codes (primary, secondary, tertiary), plus the special `PTY` code defined in section 3.1.4 |
| `actor_international_code.csv` | **82** | `CAMEO.Manual.1.1b3.pdf` | Chapter 3, Table 3.4 — International/Transnational Actors with Special Codes (full pre-composed codes like `IGOUNO`, `NGOAMN`, `IGOUNOWBK`, grouped by *Africa / Middle East / Asia, Europe / Global*) |
| `actor_ethnic_code.csv` | **600** | `CAMEO.Manual.1.1b3.pdf` | Chapter 5, Table 5.1 — CAMEO Ethnic Group Codes (**lowercase** 3-letter codes — the case is meaningful and distinguishes these from country/role codes, e.g. `snd` Sindhi) |
| `actor_ethnic_group_country.csv` | **2583** | `CAMEO.Manual.1.1b3.pdf` | Chapter 5, Table 5.1 — 1-to-N mapping from `ethnic_code` to the *Selected Countries* column (ISO 3166-1 alpha-3) listing where each ethnic group has a significant presence |
| `actor_religion_code.csv` | **19** | `CAMEO.Manual.1.1b3.pdf` | Chapter 4, Table 4.1 — Religious Codes: First Three Letters (named religions, religious families, and the new-religious-movements catch-all) |
| `actor_religion_generic_code.csv` | **11** | `CAMEO.Manual.1.1b3.pdf` | Chapter 4, Table 4.2 — Religious Codes: Second Three Letters (generic terms like `OFF`, `MAY`, `PAG`, `SYN`; named denominations are not in this table — they live in the CAMEORCS directory) |

All columns are strings; numeric codes are zero-padded to the natural CAMEO width (e.g. **01**, **010**). `event_base_code.csv` includes an `event_root_code` column pointing at the parent family for easy joins.

### Resolving a GDELT `ActorCode`

GDELT's `Actor*Code` is a concatenation of up to ~5 three-letter fragments drawn from different CAMEO chapters — e.g. `USAGOVLEG` = country `USA` + role `GOV` + role `LEG`. There is no single master actor table; `country_code.csv`, `actor_role_code.csv` and `actor_religion_code.csv` each cover one dimension of the composition. Country codes are kept separate from the other actor-attribute seeds because GDELT already exposes them in the dedicated `Actor*CountryCode` column.

### Curation notes and gaps

- `country_code.csv` is a **curated initial subset** (~167 entries) transcribed from the CAMEO manual. It prioritises common countries and the CAMEO-vs-ISO3 exceptions (e.g. `UKG`, `GMY`, `NTH`, `AUL`, `SPN`, `POR`, `BNG`, `PHI`, `VIE`, `BUR`/`MYA`). It is **not exhaustive** — minor territories, historical states and micro-nations listed in the manual are not all included yet.
- `actor_role_code.csv` was extracted directly from Table 3.1 and is complete. The `priority` column mirrors the primary/secondary/tertiary grouping from the manual (`PTY` is flagged as `primary-special` because it is described apart from the main table but used in primary position, right after `OPP` or `GOV`).
- `actor_religion_code.csv` and `actor_religion_generic_code.csv` were extracted directly from Tables 4.1 and 4.2. A full CAMEO religion code is up to 9 characters: *first trio* (named religion or family) + *second trio* (denomination or generic term) + *numeric suffix 001–999*. The numeric suffix and named denominations (e.g. Catholic, Sunni, Orthodox) live in the external CAMEORCS directory, not in the manual itself.
- `actor_ethnic_code.csv` was extracted programmatically from the full Table 5.1 and is complete (all 602 rows; two codes collide in the source and are merged with a `/` separator — `moh` = Mohajirs / Mohawk, `mon` = Maonan / Mongol).
- Ethnic codes use **lowercase** by convention in the source data — this is a deliberate distinguisher, not an inconsistency, and downstream joins must be case-sensitive.
- `actor_ethnic_group_country.csv` uses **ISO 3166-1 alpha-3** country codes (as printed in the CAMEO manual), not the CAMEO country codes from `country_code.csv`. Joins between the two lookups require an ISO3↔CAMEO bridge.
