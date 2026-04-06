INSERT INTO sink_conflict_trend
SELECT
    window_start,
    window_end,
    actor1_country   AS country,
    AVG(goldstein_scale) AS avg_goldstein
FROM TABLE(
    TUMBLE(TABLE kafka_events, DESCRIPTOR(event_ts), INTERVAL '1' HOUR)
)
WHERE actor1_country IS NOT NULL
GROUP BY window_start, window_end, actor1_country
