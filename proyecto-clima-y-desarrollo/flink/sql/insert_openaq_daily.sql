INSERT INTO sink_openaq_daily
SELECT
    `window_start`,
    `window_end`,
    `country_iso`,
    `parameter`,
    AVG(`value`) AS `avg_value`,
    COUNT(*)     AS `sample_count`
FROM TABLE(
    TUMBLE(TABLE kafka_openaq, DESCRIPTOR(`event_ts`), INTERVAL '1' DAY)
)
WHERE `country_iso` IS NOT NULL
  AND `parameter` IS NOT NULL
  AND `value` IS NOT NULL
GROUP BY `window_start`, `window_end`, `country_iso`, `parameter`
