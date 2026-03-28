CREATE TABLE IF NOT EXISTS boc_log.download_log (
    object_key TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    year INTEGER,
    issue INTEGER,
    disposition INTEGER,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    file_size_bytes BIGINT,
    CONSTRAINT download_log_pkey PRIMARY KEY (object_key)
);

CREATE INDEX IF NOT EXISTS download_log_year_idx
    ON boc_log.download_log (entity_type, year);

CREATE INDEX IF NOT EXISTS download_log_issue_idx
    ON boc_log.download_log (entity_type, year, issue);