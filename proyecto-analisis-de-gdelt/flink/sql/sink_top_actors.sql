CREATE TABLE sink_top_actors (
    `window_start`  TIMESTAMP(3),
    `window_end`    TIMESTAMP(3),
    `actor_code`    STRING,
    `event_count`   BIGINT,
    PRIMARY KEY (`window_start`, `actor_code`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'top_actors',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
