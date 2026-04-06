INSERT INTO sink_event_counts_by_country
SELECT
    window_start,
    window_end,
    actor1_country  AS country,
    event_root_code,
    COUNT(*)        AS event_count,
    AVG(goldstein_scale) AS avg_goldstein
FROM TABLE(
    TUMBLE(TABLE kafka_events, DESCRIPTOR(event_ts), INTERVAL '15' MINUTE)
)
WHERE actor1_country IS NOT NULL
  AND event_root_code IS NOT NULL
GROUP BY window_start, window_end, actor1_country, event_root_code
