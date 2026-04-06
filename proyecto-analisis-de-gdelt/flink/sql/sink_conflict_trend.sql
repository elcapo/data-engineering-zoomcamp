CREATE TABLE sink_conflict_trend (
    `window_start`    TIMESTAMP(3),
    `window_end`      TIMESTAMP(3),
    `country`         STRING,
    `avg_goldstein`   DOUBLE,
    PRIMARY KEY (`window_start`, `country`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'conflict_trend',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
