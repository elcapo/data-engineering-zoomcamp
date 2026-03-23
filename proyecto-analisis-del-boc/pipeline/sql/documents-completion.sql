SELECT
  dd.year,
  dd.issue,
  dd.total_documents,
  dd.downloaded_documents,
  dd.percentage AS download_percentage,
  COALESCE(ed.extracted, 0) AS extracted_documents,
  COALESCE(ed.percentage, 0.0) AS extracted_percentage
FROM boc_dataset.metric_download_documents AS dd
LEFT JOIN boc_dataset.metric_extraction_documents AS ed ON dd.year = ed.year AND dd.issue = ed.issue
ORDER BY dd.year DESC, dd.issue DESC