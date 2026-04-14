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
    `proc_time` AS PROCTIME()
) WITH (
    'connector'                      = 'kafka',
    'topic'                          = 'gdelt.gkg',
    'properties.bootstrap.servers'   = '$KAFKA_BROKER',
    'properties.group.id'            = 'flink-gkg-aggregations',
    'scan.startup.mode'              = 'earliest-offset',
    'format'                         = 'json',
    'json.ignore-parse-errors'       = 'true'
)
