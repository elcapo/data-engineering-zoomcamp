CREATE OR REPLACE VIEW boc_log.metric_download_issues AS
SELECT
    y.year,
    COUNT(*) AS total_issues,
    COUNT(dl.issue) AS downloaded_issues,
    ROUND(100.0 * COUNT(dl.issue) / NULLIF(COUNT(*), 0), 1) AS percentage
FROM boc_dataset.year y
LEFT JOIN boc_log.download_log dl ON
    dl.entity_type = 'issue' AND
    dl.year = y.year AND
    dl.issue = y.issue
GROUP BY y.year
ORDER BY y.year