CREATE TABLE events (
    global_event_id BIGINT PRIMARY KEY,
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
    source_url TEXT
);

CREATE INDEX idx_events_date_added ON events (date_added);
CREATE INDEX idx_events_country ON events (actor1_country);

CREATE TABLE mentions (
    global_event_id BIGINT,
    event_time_date BIGINT,
    mention_time_date BIGINT,
    mention_source TEXT,
    mention_identifier TEXT,
    sentence_id INTEGER,
    mention_doc_tone REAL,
    PRIMARY KEY (global_event_id, mention_identifier, sentence_id)
);

CREATE INDEX idx_mentions_event_time ON mentions (event_time_date);

CREATE TABLE gkg (
    gkg_record_id TEXT PRIMARY KEY,
    gkg_date BIGINT,
    source_name TEXT,
    document_id TEXT,
    themes TEXT,
    persons TEXT,
    organizations TEXT,
    tone REAL,
    positive_score REAL,
    negative_score REAL,
    word_count INTEGER
);

CREATE INDEX idx_gkg_date ON gkg (gkg_date);

-- Aggregated tables (written by Flink windowed jobs)

CREATE TABLE event_counts_by_country (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    country TEXT NOT NULL,
    event_root_code TEXT NOT NULL,
    event_count INTEGER,
    avg_goldstein REAL,
    PRIMARY KEY (window_start, country, event_root_code)
);

CREATE TABLE conflict_trend (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    country TEXT NOT NULL,
    avg_goldstein REAL,
    PRIMARY KEY (window_start, country)
);

CREATE TABLE top_actors (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    actor_code TEXT NOT NULL,
    event_count INTEGER,
    PRIMARY KEY (window_start, actor_code)
);

CREATE TABLE media_attention (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    global_event_id BIGINT NOT NULL,
    mention_count INTEGER,
    PRIMARY KEY (window_start, global_event_id)
);

CREATE TABLE tone_by_theme (
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    theme TEXT NOT NULL,
    avg_tone REAL,
    PRIMARY KEY (window_start, theme)
);
