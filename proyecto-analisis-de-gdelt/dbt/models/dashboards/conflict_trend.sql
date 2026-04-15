-- Conflict Trend: rolling average Goldstein score by country, per 15-minute window.
SELECT
    window_start,
    window_end,
    country,
    avg_goldstein
FROM {{ source('gdelt', 'conflict_trend') }}
WHERE country IS NOT NULL
  AND country <> ''
