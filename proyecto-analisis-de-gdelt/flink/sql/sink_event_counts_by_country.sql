CREATE TABLE sink_event_counts_by_country (
    `window_start`    TIMESTAMP(3),
    `window_end`      TIMESTAMP(3),
    `country`         STRING,
    `event_root_code` STRING,
    `event_count`     BIGINT,
    `avg_goldstein`   DOUBLE,
    PRIMARY KEY (`window_start`, `country`, `event_root_code`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'event_counts_by_country',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
