INSERT INTO sink_mentions
SELECT
    global_event_id,
    event_time_date,
    mention_time_date,
    mention_source,
    mention_identifier,
    sentence_id,
    mention_doc_tone,
    TO_TIMESTAMP(LPAD(CAST(mention_time_date AS STRING), 14, '0'), 'yyyyMMddHHmmss') AS mention_ts
FROM kafka_mentions_raw
WHERE mention_identifier IS NOT NULL
  AND sentence_id IS NOT NULL
  AND mention_time_date IS NOT NULL
