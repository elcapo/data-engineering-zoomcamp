-- Unified CAMEO label dictionary: one row per (code, kind) across every seed.
-- `priority` drives tie-breaking when the same 3-char fragment matches several kinds.
-- Lower priority wins. Ethnic codes are lowercase; the rest are uppercase, so
-- case-sensitive equality already avoids most collisions.

SELECT cameo_code AS code,
       'country_cameo'::text AS kind,
       name AS label,
       1 AS priority
FROM {{ ref('country_code') }}

UNION ALL
SELECT iso3, 'country_iso3', name, 2
FROM {{ ref('un_country_code') }}

UNION ALL
SELECT region_code, 'region', name, 3
FROM {{ ref('region_code') }}

UNION ALL
SELECT generic_code, 'intl_generic', actor_type, 4
FROM {{ ref('actor_international_generic_code') }}

UNION ALL
SELECT role_code, 'role', label, 5
FROM {{ ref('actor_role_code') }}

UNION ALL
SELECT religion_code, 'religion_family', description, 6
FROM {{ ref('actor_religion_code') }}

UNION ALL
SELECT religion_code, 'religion_full', description, 7
FROM {{ ref('actor_religion_directory') }}

UNION ALL
SELECT generic_code, 'religion_generic', description, 8
FROM {{ ref('actor_religion_generic_code') }}

UNION ALL
SELECT ethnic_code, 'ethnic', description, 9
FROM {{ ref('actor_ethnic_code') }}
