CREATE TABLE sink_openaq_daily (
    `window_start`  TIMESTAMP(3),
    `window_end`    TIMESTAMP(3),
    `country_iso`   STRING,
    `parameter`     STRING,
    `avg_value`     DOUBLE,
    `sample_count`  BIGINT,
    PRIMARY KEY (`window_start`, `country_iso`, `parameter`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'agg.openaq_daily',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
