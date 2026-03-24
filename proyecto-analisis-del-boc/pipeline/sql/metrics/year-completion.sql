/**
 * Summary of the download and extraction completion of each year.
 */

SELECT
  di.year,
  di.total_issues,
  di.downloaded_issues,
  di.percentage AS download_percentage,
  COALESCE(ei.extracted, 0) AS extracted_issues,
  COALESCE(ei.percentage, 0.0) AS extracted_percentage
FROM boc_log.metric_download_issues AS di
LEFT JOIN boc_log.metric_extraction_issues AS ei ON di.year = ei.year
ORDER BY di.year DESC