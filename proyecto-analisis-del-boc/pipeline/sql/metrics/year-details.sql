/**
 * Details of the download and extraction completion of each year.
 */

SELECT
  y.year,
  y.issue,
  y.url,
  dl.object_key,
  dl.downloaded_at,
  el.extracted_at
FROM boc_dataset.year AS y
LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'issue' AND dl.year = y.year AND dl.issue = y.issue
LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'issue'AND el.year = y.year AND el.issue = y.issue
ORDER BY y.year DESC, y.issue DESC