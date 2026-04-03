CREATE TABLE IF NOT EXISTS boc_metrics.processed_bulletins (
    group_type   TEXT NOT NULL,
    year         INTEGER NOT NULL,
    issue        INTEGER NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL
)