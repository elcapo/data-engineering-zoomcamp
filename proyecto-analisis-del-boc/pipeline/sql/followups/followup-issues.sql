/**
 * Finds issues that should be backfilled.
 */

SELECT
  y.year,
  MIN(y.issue) AS first_issue,
  MAX(y.issue) AS last_issue,
  MAX(y.issue) + 1 - MIN(y.issue) AS issue_count,
  SUM(CASE WHEN dl.downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_downloads,
  SUM(CASE WHEN el.extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_extractions,
  MAX(y.issue) + 1 - MIN(y.issue) - SUM(CASE WHEN dl.downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS missing_downloads,
  MAX(y.issue) + 1 - MIN(y.issue) - SUM(CASE WHEN el.extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS missing_extractions
FROM boc_dataset.year AS y
LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'issue' AND dl.year = y.year AND dl.issue = y.issue
LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'issue'AND el.year = y.year AND el.issue = y.issue
GROUP BY y.year
ORDER BY y.year DESC