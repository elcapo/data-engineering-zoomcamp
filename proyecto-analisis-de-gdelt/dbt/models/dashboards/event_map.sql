-- Global Event Map: one geolocated event per row with Goldstein score for colouring.
SELECT
    e.global_event_id,
    e.action_geo_lat AS latitude,
    e.action_geo_long AS longitude,
    e.goldstein_scale,
    e.event_root_code,
    erc.description AS event_root_description,
    e.actor1_name,
    e.actor2_name,
    to_timestamp(e.date_added::text, 'YYYYMMDDHH24MISS') AS event_time
FROM {{ source('gdelt', 'events') }} AS e
LEFT JOIN {{ ref('event_root_code') }} AS erc USING (event_root_code)
WHERE e.action_geo_lat IS NOT NULL
  AND e.action_geo_long IS NOT NULL
  AND e.goldstein_scale IS NOT NULL
