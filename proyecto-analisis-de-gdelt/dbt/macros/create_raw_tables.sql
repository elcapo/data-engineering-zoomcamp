{#
  Creates the tables populated by Flink (raw ingest + windowed aggregations).
  dbt does not own these tables as models because they are written by an
  external process. We just ensure the schema exists before Flink starts.
  Runs on every `dbt run`/`dbt seed` via the on-run-start hook.

  Raw tables (events, mentions, gkg) are RANGE-partitioned by month on a
  TIMESTAMP column derived by Flink from the GDELT 14-digit timestamp.
  Partitions for the surrounding months are ensured at the end.

  Window size is configurable via dbt vars:
    raw_partitions_months_back    (default 1)
    raw_partitions_months_forward (default 2)
#}

{% macro create_raw_tables() %}

{% set months_back = var('raw_partitions_months_back', 1) %}
{% set months_forward = var('raw_partitions_months_forward', 2) %}

{% set ddl %}

CREATE TABLE IF NOT EXISTS events (
    global_event_id BIGINT NOT NULL,
    sql_date INTEGER,
    actor1_code TEXT,
    actor1_name TEXT,
    actor1_country TEXT,
    actor2_code TEXT,
    actor2_name TEXT,
    actor2_country TEXT,
    event_root_code TEXT,
    quad_class SMALLINT,
    goldstein_scale REAL,
    num_mentions INTEGER,
    num_sources INTEGER,
    num_articles INTEGER,
    action_geo_type SMALLINT,
    action_geo_name TEXT,
    action_geo_lat REAL,
    action_geo_long REAL,
    date_added BIGINT,
    source_url TEXT,
    event_ts TIMESTAMP NOT NULL,
    PRIMARY KEY (global_event_id, event_ts)
) PARTITION BY RANGE (event_ts);
CREATE INDEX IF NOT EXISTS idx_events_date_added ON events (date_added);
CREATE INDEX IF NOT EXISTS idx_events_country ON events (actor1_country);

CREATE TABLE IF NOT EXISTS mentions (
    global_event_id BIGINT NOT NULL,
    event_time_date BIGINT,
    mention_time_date BIGINT,
    mention_source TEXT,
    mention_identifier TEXT NOT NULL,
    sentence_id INTEGER NOT NULL,
    mention_doc_tone REAL,
    mention_ts TIMESTAMP NOT NULL,
    PRIMARY KEY (global_event_id, mention_identifier, sentence_id, mention_ts)
) PARTITION BY RANGE (mention_ts);
CREATE INDEX IF NOT EXISTS idx_mentions_event_time ON mentions (event_time_date);

CREATE TABLE IF NOT EXISTS gkg (
    gkg_record_id TEXT NOT NULL,
    gkg_date BIGINT,
    source_name TEXT,
    document_id TEXT,
    themes TEXT,
    persons TEXT,
    organizations TEXT,
    tone REAL,
    positive_score REAL,
    negative_score REAL,
    word_count INTEGER,
    gkg_ts TIMESTAMP NOT NULL,
    PRIMARY KEY (gkg_record_id, gkg_ts)
) PARTITION BY RANGE (gkg_ts);
CREATE INDEX IF NOT EXISTS idx_gkg_date ON gkg (gkg_date);

CREATE TABLE IF NOT EXISTS event_counts_by_country (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    country TEXT NOT NULL,
    event_root_code TEXT NOT NULL,
    event_count INTEGER,
    avg_goldstein REAL,
    PRIMARY KEY (window_start, country, event_root_code)
);

CREATE TABLE IF NOT EXISTS conflict_trend (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    country TEXT NOT NULL,
    avg_goldstein REAL,
    PRIMARY KEY (window_start, country)
);

CREATE TABLE IF NOT EXISTS top_actors (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    actor_code TEXT NOT NULL,
    event_count INTEGER,
    PRIMARY KEY (window_start, actor_code)
);

CREATE TABLE IF NOT EXISTS media_attention (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    global_event_id BIGINT NOT NULL,
    mention_count INTEGER,
    PRIMARY KEY (window_start, global_event_id)
);

CREATE TABLE IF NOT EXISTS tone_by_theme (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    theme TEXT NOT NULL,
    avg_tone REAL,
    PRIMARY KEY (window_start, theme)
);

{% endset %}

{% do run_query(ddl) %}

{% do ensure_monthly_partitions('events', months_back, months_forward) %}
{% do ensure_monthly_partitions('mentions', months_back, months_forward) %}
{% do ensure_monthly_partitions('gkg', months_back, months_forward) %}

{% do log("Raw tables ensured (events, mentions, gkg, aggregations).", info=true) %}

{% endmacro %}
