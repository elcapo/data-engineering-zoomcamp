/**
 * Finds issues that should be backfilled.
 */

WITH issue_statistics AS (
  SELECT
    y.year,
    MIN(y.issue) AS first_issue,
    MAX(y.issue) AS last_issue,
    SUM(CASE WHEN dl.downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_downloads,
    SUM(CASE WHEN el.extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_extractions
  FROM boc_dataset.year AS y
  LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'issue' AND dl.year = y.year AND dl.issue = y.issue
  LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'issue'AND el.year = y.year AND el.issue = y.issue
  GROUP BY y.year
),

issue_count AS (
  SELECT
    s.year,
    s.first_issue,
    s.last_issue,
    s.last_issue + 1 - s.first_issue AS issue_count,
    s.completed_downloads,
    s.completed_extractions
  FROM issue_statistics AS s
)

SELECT
  c.*,
  c.issue_count - c.completed_downloads AS missing_downloads,
  c.issue_count - c.completed_extractions AS missing_extractions
FROM issue_count AS c
WHERE
  c.issue_count - c.completed_downloads > 0 OR
  c.issue_count - c.completed_extractions > 0
ORDER BY c.year DESC