INSERT INTO sink_events
SELECT
    global_event_id,
    sql_date,
    actor1_code,
    actor1_name,
    actor1_country,
    actor2_code,
    actor2_name,
    actor2_country,
    event_root_code,
    quad_class,
    goldstein_scale,
    num_mentions,
    num_sources,
    num_articles,
    action_geo_type,
    action_geo_name,
    action_geo_lat,
    action_geo_long,
    date_added,
    source_url,
    TO_TIMESTAMP(LPAD(CAST(date_added AS STRING), 14, '0'), 'yyyyMMddHHmmss') AS event_ts
FROM kafka_events_raw
WHERE date_added IS NOT NULL
