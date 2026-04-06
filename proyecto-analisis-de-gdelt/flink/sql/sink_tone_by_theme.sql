CREATE TABLE sink_tone_by_theme (
    `window_start`  TIMESTAMP(3),
    `window_end`    TIMESTAMP(3),
    `theme`         STRING,
    `avg_tone`      DOUBLE,
    PRIMARY KEY (`window_start`, `theme`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'tone_by_theme',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
