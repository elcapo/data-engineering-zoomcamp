CREATE TABLE sink_media_attention (
    `window_start`     TIMESTAMP(3),
    `window_end`       TIMESTAMP(3),
    `global_event_id`  BIGINT,
    `mention_count`    BIGINT,
    PRIMARY KEY (`window_start`, `global_event_id`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'media_attention',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
