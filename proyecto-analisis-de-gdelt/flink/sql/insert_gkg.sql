INSERT INTO sink_gkg
SELECT
    gkg_record_id,
    gkg_date,
    source_name,
    document_id,
    themes,
    persons,
    organizations,
    tone,
    positive_score,
    negative_score,
    word_count,
    TO_TIMESTAMP(LPAD(CAST(gkg_date AS STRING), 14, '0'), 'yyyyMMddHHmmss') AS gkg_ts
FROM kafka_gkg_raw
WHERE gkg_date IS NOT NULL
