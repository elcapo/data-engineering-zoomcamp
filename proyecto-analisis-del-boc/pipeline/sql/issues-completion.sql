SELECT
  di.year,
  di.total_issues,
  di.downloaded_issues,
  di.percentage AS download_percentage,
  COALESCE(ei.extracted, 0) AS extracted_issues,
  COALESCE(ei.percentage, 0.0) AS extracted_percentage
FROM boc_dataset.metric_download_issues AS di
LEFT JOIN boc_dataset.metric_extraction_issues AS ei ON di.year = ei.year
ORDER BY di.year DESC