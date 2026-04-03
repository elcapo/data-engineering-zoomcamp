CREATE TABLE IF NOT EXISTS boc_metrics.year_overview (
    year                    INTEGER NOT NULL PRIMARY KEY,
    total_bulletins         INTEGER NOT NULL,
    processed_bulletins     INTEGER NOT NULL,
    bulletin_percentage     NUMERIC(5,1) NOT NULL,
    total_dispositions      INTEGER NOT NULL,
    processed_dispositions  INTEGER NOT NULL,
    disposition_percentage  NUMERIC(5,1) NOT NULL
)