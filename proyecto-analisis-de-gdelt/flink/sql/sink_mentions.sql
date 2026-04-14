CREATE TABLE sink_mentions (
    `global_event_id`    BIGINT,
    `event_time_date`    BIGINT,
    `mention_time_date`  BIGINT,
    `mention_source`     STRING,
    `mention_identifier` STRING,
    `sentence_id`        INT,
    `mention_doc_tone`   DOUBLE,
    PRIMARY KEY (`global_event_id`, `mention_identifier`, `sentence_id`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'mentions',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
