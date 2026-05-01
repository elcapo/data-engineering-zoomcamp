INSERT INTO sink_openaq_measurements
SELECT
    `location_id`,
    `location_name`,
    `country_iso`,
    `sensor_id`,
    `parameter`,
    `unit`,
    `value`,
    CAST(`event_ts` AS TIMESTAMP(3)) AS `datetime_utc`,
    `datetime_local`,
    `latitude`,
    `longitude`
FROM kafka_openaq
WHERE `location_id` IS NOT NULL
  AND `parameter` IS NOT NULL
  AND `event_ts` IS NOT NULL
