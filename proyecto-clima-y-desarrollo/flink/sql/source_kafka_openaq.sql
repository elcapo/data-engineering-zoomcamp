CREATE TABLE kafka_openaq (
    `location_id`    BIGINT,
    `location_name`  STRING,
    `country_iso`    STRING,
    `sensor_id`      BIGINT,
    `parameter`      STRING,
    `unit`           STRING,
    `value`          DOUBLE,
    `datetime_utc`   STRING,
    `datetime_local` STRING,
    `latitude`       DOUBLE,
    `longitude`      DOUBLE,
    -- OpenAQ datetimes are ISO 8601 UTC (e.g. '2026-02-09T15:00:00Z'); Flink
    -- TIMESTAMP cast expects 'yyyy-MM-dd HH:mm:ss', so strip T / Z first.
    `event_ts` AS CAST(REPLACE(REPLACE(`datetime_utc`, 'T', ' '), 'Z', '') AS TIMESTAMP(3)),
    WATERMARK FOR `event_ts` AS `event_ts` - INTERVAL '5' MINUTE
) WITH (
    'connector'                    = 'kafka',
    'topic'                        = 'openaq.measurements',
    'properties.bootstrap.servers' = '$KAFKA_BROKER',
    'properties.group.id'          = 'flink-openaq',
    'scan.startup.mode'            = 'earliest-offset',
    'format'                       = 'json',
    'json.fail-on-missing-field'   = 'false',
    'json.ignore-parse-errors'     = 'true'
)
