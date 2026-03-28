CREATE TABLE IF NOT EXISTS boc_log.extraction_log (
    object_key TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    year INTEGER,
    issue INTEGER,
    disposition INTEGER,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT extraction_log_pkey PRIMARY KEY (object_key)
);

CREATE INDEX IF NOT EXISTS extraction_log_year_idx
    ON boc_log.extraction_log (entity_type, year);

CREATE INDEX IF NOT EXISTS extraction_log_issue_idx
    ON boc_log.extraction_log (entity_type, year, issue);