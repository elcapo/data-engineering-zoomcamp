/**
 * Finds years that should be backfilled.
 */

WITH year_statistics AS (
  SELECT
    MIN(a.year) AS first_year,
    MAX(a.year) AS last_year,
    SUM(CASE WHEN dl.downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_downloads,
    SUM(CASE WHEN el.extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_extractions
  FROM boc_dataset.archive AS a
  LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'year' AND dl.year = a.year
  LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'year'AND el.year = a.year
),

year_count AS (
  SELECT
    s.first_year,
    s.last_year,
    s.last_year + 1 - s.first_year AS year_count,
    s.completed_downloads,
    s.completed_extractions
  FROM year_statistics AS s
)

SELECT
  c.*,
  c.year_count - c.completed_downloads AS missing_downloads,
  c.year_count - c.completed_extractions AS missing_extractions
FROM year_count AS c
WHERE
  c.year_count - c.completed_downloads > 0 OR
  c.year_count - c.completed_extractions > 0