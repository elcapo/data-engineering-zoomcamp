CREATE TABLE sink_gkg (
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
    PRIMARY KEY (`gkg_record_id`) NOT ENFORCED
) WITH (
    'connector'   = 'jdbc',
    'url'         = '$PG_URL',
    'table-name'  = 'gkg',
    'username'    = '$PG_USER',
    'password'    = '$PG_PASS',
    'driver'      = 'org.postgresql.Driver'
)
