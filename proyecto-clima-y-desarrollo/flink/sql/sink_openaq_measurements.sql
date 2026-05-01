CREATE TABLE sink_openaq_measurements (
    `location_id`    BIGINT,
    `location_name`  STRING,
    `country_iso`    STRING,
    `sensor_id`      BIGINT,
    `parameter`      STRING,
    `unit`           STRING,
    `value`          DOUBLE,
    `datetime_utc`   TIMESTAMP(3),
    `datetime_local` STRING,
    `latitude`       DOUBLE,
    `longitude`      DOUBLE,
    PRIMARY KEY (`location_id`, `parameter`, `datetime_utc`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'raw.openaq_measurements',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
