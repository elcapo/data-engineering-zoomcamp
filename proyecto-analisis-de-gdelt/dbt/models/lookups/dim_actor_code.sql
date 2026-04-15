-- One row per distinct CAMEO actor code seen in events.
-- Resolution order:
--   1. Whole-code match against pre-composed actors (Table 3.4 + KEDS) — captures
--      things like NGOICG, IGOBUSBIS, AFGGOVTAL.
--   2. Split into 3-char fragments and resolve each via cameo_label, picking the
--      lowest-priority match per position.
--   3. Fragments with no match stay raw between brackets in label_full.

WITH distinct_codes AS (
    SELECT DISTINCT actor1_code AS actor_code
    FROM {{ source('gdelt', 'events') }}
    WHERE actor1_code IS NOT NULL AND actor1_code <> ''
    UNION
    SELECT DISTINCT actor2_code
    FROM {{ source('gdelt', 'events') }}
    WHERE actor2_code IS NOT NULL AND actor2_code <> ''
),

special_codes AS (
    SELECT full_code AS code, actor_name AS label
    FROM {{ ref('actor_international_code') }}
    UNION ALL
    SELECT code, actor_name
    FROM {{ ref('keds_actor_code') }}
),

whole_match AS (
    SELECT DISTINCT dc.actor_code, s.label
    FROM distinct_codes dc
    JOIN special_codes s ON s.code = dc.actor_code
),

chunked AS (
    SELECT dc.actor_code,
           gs.pos AS position,
           substring(dc.actor_code FROM (gs.pos - 1) * 3 + 1 FOR 3) AS fragment
    FROM distinct_codes dc
    CROSS JOIN LATERAL generate_series(1, length(dc.actor_code) / 3) AS gs(pos)
    WHERE dc.actor_code NOT IN (SELECT actor_code FROM whole_match)
      AND length(dc.actor_code) % 3 = 0
      AND length(dc.actor_code) >= 3
),

chunk_ranked AS (
    SELECT c.actor_code,
           c.position,
           c.fragment,
           cl.kind,
           cl.label,
           ROW_NUMBER() OVER (
               PARTITION BY c.actor_code, c.position
               ORDER BY cl.priority NULLS LAST, cl.kind
           ) AS rn
    FROM chunked c
    LEFT JOIN {{ ref('cameo_label') }} cl ON cl.code = c.fragment
),

chunk_best AS (
    SELECT actor_code, position, fragment, kind, label
    FROM chunk_ranked
    WHERE rn = 1
),

chunk_agg AS (
    SELECT actor_code,
           string_agg(
               COALESCE(label, '[' || fragment || ']'),
               ' · ' ORDER BY position
           ) AS label_full,
           jsonb_agg(
               jsonb_build_object(
                   'position', position,
                   'fragment', fragment,
                   'kind', COALESCE(kind, 'unresolved'),
                   'label', label
               ) ORDER BY position
           ) AS parts
    FROM chunk_best
    GROUP BY actor_code
),

unresolved AS (
    SELECT dc.actor_code
    FROM distinct_codes dc
    WHERE dc.actor_code NOT IN (SELECT actor_code FROM whole_match)
      AND (length(dc.actor_code) % 3 <> 0 OR length(dc.actor_code) = 0)
)

SELECT actor_code,
       label AS label_full,
       jsonb_build_array(
           jsonb_build_object(
               'position', 1,
               'fragment', actor_code,
               'kind', 'special',
               'label', label
           )
       ) AS parts
FROM whole_match

UNION ALL

SELECT actor_code, label_full, parts
FROM chunk_agg

UNION ALL

SELECT actor_code,
       '[' || actor_code || ']' AS label_full,
       jsonb_build_array(
           jsonb_build_object(
               'position', 1,
               'fragment', actor_code,
               'kind', 'unresolved',
               'label', NULL
           )
       ) AS parts
FROM unresolved
