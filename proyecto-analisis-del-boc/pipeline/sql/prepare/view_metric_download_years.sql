CREATE OR REPLACE VIEW boc_log.metric_download_years AS
SELECT
    COUNT(*) AS total_years,
    COUNT(dl.year) AS downloaded_years,
    ROUND(100.0 * COUNT(dl.year) / NULLIF(COUNT(*), 0), 1) AS percentage
FROM boc_dataset.archive a
LEFT JOIN boc_log.download_log dl ON
    dl.entity_type = 'year' AND
    dl.year = a.year