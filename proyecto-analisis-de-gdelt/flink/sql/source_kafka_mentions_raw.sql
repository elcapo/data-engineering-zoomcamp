CREATE TABLE kafka_mentions_raw (
    `global_event_id`    BIGINT,
    `event_time_date`    BIGINT,
    `mention_time_date`  BIGINT,
    `mention_source`     STRING,
    `mention_identifier` STRING,
    `sentence_id`        INT,
    `mention_doc_tone`   DOUBLE
) WITH (
    'connector'                      = 'kafka',
    'topic'                          = 'gdelt.mentions',
    'properties.bootstrap.servers'   = '$KAFKA_BROKER',
    'properties.group.id'            = 'flink-raw-ingest',
    'scan.startup.mode'              = 'earliest-offset',
    'format'                         = 'json',
    'json.ignore-parse-errors'       = 'true'
)
