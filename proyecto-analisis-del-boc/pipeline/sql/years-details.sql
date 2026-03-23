SELECT
  a.year,
  a.absolute_link,
  dl.object_key,
  dl.downloaded_at,
  el.extracted_at
FROM boc_dataset.archive AS a
LEFT JOIN boc_dataset.download_log AS dl ON dl.entity_type = 'year' AND dl.year = a.year::INT
LEFT JOIN boc_dataset.extraction_log AS el ON el.entity_type = 'year' AND el.year = a.year::INT
ORDER BY a.year::INT DESC