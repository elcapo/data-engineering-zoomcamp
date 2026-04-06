INSERT INTO sink_media_attention
SELECT
    window_start,
    window_end,
    global_event_id,
    COUNT(*) AS mention_count
FROM TABLE(
    TUMBLE(TABLE kafka_mentions, DESCRIPTOR(mention_ts), INTERVAL '15' MINUTE)
)
WHERE global_event_id IS NOT NULL
GROUP BY window_start, window_end, global_event_id
