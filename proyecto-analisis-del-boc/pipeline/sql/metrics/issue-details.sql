/**
 * Details of the download and extraction completion of each issue.
 */

SELECT
  i.year,
  i.issue,
  d.disposition,
  dl.object_key,
  dl.downloaded_at,
  el.extracted_at
FROM boc_dataset.issue__dispositions AS d
JOIN boc_dataset.issue AS i ON i._dlt_id = d._dlt_parent_id
LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'document' AND dl.year = i.year AND dl.issue = i.issue AND dl.disposition = d.disposition
LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'document'AND el.year = i.year AND el.issue = i.issue AND el.disposition = d.disposition
ORDER BY i.year DESC, i.issue DESC, d.disposition DESC