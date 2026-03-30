CREATE OR REPLACE VIEW boc_log.view_followup_documents AS
SELECT
  i.year,
  i.issue,
  MIN(id.disposition) AS first_document,
  MAX(id.disposition) AS last_document,
  COUNT(*) AS document_count,
  SUM(CASE WHEN dl.downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_downloads,
  SUM(CASE WHEN el.extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_extractions,
  COUNT(*) - SUM(CASE WHEN dl.downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS missing_downloads,
  COUNT(*) - SUM(CASE WHEN el.extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS missing_extractions
FROM boc_dataset.issue AS i
JOIN boc_dataset.issue__dispositions AS id ON id._dlt_parent_id = i._dlt_id
LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'document' AND dl.year = i.year AND dl.issue = i.issue AND dl.disposition = id.disposition
LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'document' AND el.year = i.year AND el.issue = i.issue AND el.disposition = id.disposition
GROUP BY i.year, i.issue
ORDER BY i.year DESC, i.issue DESC
