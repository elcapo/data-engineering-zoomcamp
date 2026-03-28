CREATE OR REPLACE VIEW boc_log.metric_extraction_issues AS
SELECT
    dl.year,
    COUNT(*) AS total_downloaded,
    COUNT(el.issue) AS extracted,
    ROUND(100.0 * COUNT(el.issue) / NULLIF(COUNT(*), 0), 1) AS percentage
FROM boc_log.download_log dl
LEFT JOIN boc_log.extraction_log el ON
    el.entity_type = 'issue' AND
    el.year = dl.year AND
    el.issue = dl.issue
WHERE dl.entity_type = 'issue'
GROUP BY dl.year
ORDER BY dl.year