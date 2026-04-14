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
    word_count
FROM kafka_gkg_raw
