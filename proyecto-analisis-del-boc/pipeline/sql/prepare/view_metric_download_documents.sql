CREATE OR REPLACE VIEW boc_log.metric_download_documents AS
SELECT
    i.year,
    i.issue,
    COUNT(*) AS total_documents,
    COUNT(dl.disposition) AS downloaded_documents,
    ROUND(100.0 * COUNT(dl.disposition) / NULLIF(COUNT(*), 0), 1) AS percentage
FROM boc_dataset.issue i
JOIN boc_dataset.issue__dispositions id ON id._dlt_parent_id = i._dlt_id
LEFT JOIN boc_log.download_log dl ON
    dl.entity_type = 'document' AND
    dl.year = i.year AND
    dl.issue = i.issue AND
    dl.disposition  = (regexp_match(id.html, '/(\d+)\.html$'))[1]::INT
GROUP BY i.year, i.issue
ORDER BY i.year, i.issue