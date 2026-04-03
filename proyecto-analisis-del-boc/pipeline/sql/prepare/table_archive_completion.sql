CREATE TABLE IF NOT EXISTS boc_metrics.archive_completion (
    total_years          INTEGER NOT NULL,
    downloaded_years     INTEGER NOT NULL,
    downloaded_at        TIMESTAMPTZ,
    downloaded_percentage NUMERIC(5,1) NOT NULL,
    extracted_years      INTEGER NOT NULL,
    extracted_percentage NUMERIC(5,1) NOT NULL
)