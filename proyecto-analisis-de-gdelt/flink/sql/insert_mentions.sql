INSERT INTO sink_mentions
SELECT
    global_event_id,
    event_time_date,
    mention_time_date,
    mention_source,
    mention_identifier,
    sentence_id,
    mention_doc_tone
FROM kafka_mentions_raw
WHERE mention_identifier IS NOT NULL
  AND sentence_id IS NOT NULL
