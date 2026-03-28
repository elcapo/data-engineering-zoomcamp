CREATE OR REPLACE VIEW boc_log.metric_extraction_documents AS
SELECT
    dl.year,
    dl.issue,
    COUNT(*) AS total_downloaded,
    COUNT(el.disposition) AS extracted,
    ROUND(100.0 * COUNT(el.disposition) / NULLIF(COUNT(*), 0), 1) AS percentage
FROM boc_log.download_log dl
LEFT JOIN boc_log.extraction_log el ON
    el.entity_type  = 'document' AND
    el.year = dl.year AND
    el.issue = dl.issue AND
    el.disposition  = dl.disposition
WHERE dl.entity_type = 'document'
GROUP BY dl.year, dl.issue
ORDER BY dl.year, dl.issue