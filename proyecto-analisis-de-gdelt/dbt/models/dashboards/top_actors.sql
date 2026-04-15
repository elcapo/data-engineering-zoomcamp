-- Top Actors: most active actors per 15-minute window.
-- Metabase can filter on `window_start` (e.g. "latest window") or aggregate across a range.
SELECT
    window_start,
    window_end,
    actor_code,
    event_count
FROM {{ source('gdelt', 'top_actors') }}
WHERE actor_code IS NOT NULL
  AND actor_code <> ''
