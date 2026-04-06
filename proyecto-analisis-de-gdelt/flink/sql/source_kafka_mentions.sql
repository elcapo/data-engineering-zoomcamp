CREATE TABLE kafka_mentions (
    `global_event_id`    BIGINT,
    `event_time_date`    BIGINT,
    `mention_time_date`  BIGINT,
    `mention_source`     STRING,
    `mention_doc_tone`   DOUBLE,
    `mention_ts` AS TO_TIMESTAMP(CAST(`mention_time_date` AS STRING), 'yyyyMMddHHmmss'),
    WATERMARK FOR `mention_ts` AS `mention_ts`
) WITH (
    'connector'                      = 'kafka',
    'topic'                          = 'gdelt.mentions',
    'properties.bootstrap.servers'   = '$KAFKA_BROKER',
    'properties.group.id'            = 'flink-event-aggregations',
    'scan.startup.mode'              = 'earliest-offset',
    'format'                         = 'json',
    'json.ignore-parse-errors'       = 'true'
)
