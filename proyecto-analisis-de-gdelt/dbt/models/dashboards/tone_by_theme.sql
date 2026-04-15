-- Tone Analysis: average tone per GKG theme, per 15-minute window.
SELECT
    window_start,
    window_end,
    theme,
    avg_tone
FROM {{ source('gdelt', 'tone_by_theme') }}
WHERE theme IS NOT NULL
  AND theme <> ''
