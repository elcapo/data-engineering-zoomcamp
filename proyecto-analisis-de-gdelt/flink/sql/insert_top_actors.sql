INSERT INTO sink_top_actors
SELECT
    window_start,
    window_end,
    actor1_code  AS actor_code,
    COUNT(*)     AS event_count
FROM TABLE(
    TUMBLE(TABLE kafka_events, DESCRIPTOR(event_ts), INTERVAL '1' HOUR)
)
WHERE actor1_code IS NOT NULL
GROUP BY window_start, window_end, actor1_code
