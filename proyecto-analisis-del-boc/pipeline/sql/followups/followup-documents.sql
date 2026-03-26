/**
 * Finds documents that should be backfilled.
 */

WITH document_statistics AS (
  SELECT
    i.year,
    i.issue,
    MIN(d.disposition) AS first_document,
    MAX(d.disposition) AS last_document,
    SUM(CASE WHEN dl.downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_downloads,
    SUM(CASE WHEN el.extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_extractions
  FROM boc_dataset.issue__dispositions AS d
  JOIN boc_dataset.issue AS i ON i._dlt_id = d._dlt_parent_id
  LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'document' AND dl.year = i.year AND dl.issue = i.issue AND dl.disposition = d.disposition
  LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'document'AND el.year = i.year AND el.issue = i.issue AND el.disposition = d.disposition
  GROUP BY i.year, i.issue
),

document_count AS (
  SELECT
    s.year,
    s.issue,
    s.first_document,
    s.last_document,
    s.last_document + 1 - s.first_document AS document_count,
    s.completed_downloads,
    s.completed_extractions
  FROM document_statistics AS s
)

SELECT
  c.*,
  c.document_count - c.completed_downloads AS missing_downloads,
  c.document_count - c.completed_extractions AS missing_extractions
FROM document_count AS c
WHERE
  c.document_count - c.completed_downloads > 0 OR
  c.document_count - c.completed_extractions > 0
ORDER BY c.year DESC, c.issue DESC