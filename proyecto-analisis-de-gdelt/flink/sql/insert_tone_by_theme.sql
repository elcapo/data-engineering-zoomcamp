INSERT INTO sink_tone_by_theme
SELECT
    window_start,
    window_end,
    theme,
    AVG(tone) AS avg_tone
FROM TABLE(
    TUMBLE(TABLE exploded_gkg, DESCRIPTOR(gkg_ts), INTERVAL '1' HOUR)
)
WHERE theme IS NOT NULL
GROUP BY window_start, window_end, theme
