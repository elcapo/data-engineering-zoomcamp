/**
 * Summary of the download and extraction completion of each issue.
 */

SELECT
  dd.year,
  dd.issue,
  l.downloaded_at,
  dd.total_documents,
  dd.downloaded_documents,
  dd.percentage AS download_percentage,
  COALESCE(ed.extracted, 0) AS extracted_documents,
  COALESCE(ed.percentage, 0.0) AS extracted_percentage
FROM boc_log.metric_download_documents AS dd
LEFT JOIN boc_log.metric_extraction_documents AS ed ON dd.year = ed.year AND dd.issue = ed.issue
LEFT JOIN boc_log.download_log AS l ON l.entity_type = 'issue' AND l.year = dd.year AND l.issue = dd.issue
ORDER BY dd.year DESC, dd.issue DESC