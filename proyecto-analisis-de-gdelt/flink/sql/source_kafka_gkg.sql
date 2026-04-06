CREATE TABLE kafka_gkg (
    `gkg_record_id`   STRING,
    `gkg_date`        BIGINT,
    `source_name`     STRING,
    `document_id`     STRING,
    `themes`          STRING,
    `persons`         STRING,
    `organizations`   STRING,
    `tone`            DOUBLE,
    `positive_score`  DOUBLE,
    `negative_score`  DOUBLE,
    `word_count`      INT,
    `gkg_ts` AS TO_TIMESTAMP(CAST(`gkg_date` AS STRING), 'yyyyMMddHHmmss'),
    WATERMARK FOR `gkg_ts` AS `gkg_ts` - INTERVAL '16' MINUTE
) WITH (
    'connector'                      = 'kafka',
    'topic'                          = 'gdelt.gkg',
    'properties.bootstrap.servers'   = '$KAFKA_BROKER',
    'properties.group.id'            = 'flink-gkg-aggregations',
    'scan.startup.mode'              = 'earliest-offset',
    'format'                         = 'json',
    'json.ignore-parse-errors'       = 'true'
)
