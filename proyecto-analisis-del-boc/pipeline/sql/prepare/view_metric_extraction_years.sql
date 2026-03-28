CREATE OR REPLACE VIEW boc_log.metric_extraction_years AS
SELECT
    COUNT(*) AS total_downloaded,
    COUNT(el.year) AS extracted,
    ROUND(100.0 * COUNT(el.year) / NULLIF(COUNT(*), 0), 1) AS percentage
FROM boc_log.download_log dl
LEFT JOIN boc_log.extraction_log el ON
    el.entity_type = 'year' AND
    el.year = dl.year
WHERE dl.entity_type = 'year'