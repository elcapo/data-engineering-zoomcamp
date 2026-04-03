TRUNCATE boc_metrics.archive_completion;

INSERT INTO boc_metrics.archive_completion
  (total_years, downloaded_years, downloaded_at,
   downloaded_percentage, extracted_years, extracted_percentage)
SELECT
  dy.total_years,
  dy.downloaded_years,
  l.downloaded_at,
  dy.percentage AS downloaded_percentage,
  COALESCE(ey.extracted, 0) AS extracted_years,
  COALESCE(ey.percentage, 0) AS extracted_percentage
FROM boc_log.metric_download_years AS dy
LEFT JOIN boc_log.metric_extraction_years AS ey ON 1=1
LEFT JOIN boc_log.download_log AS l ON l.entity_type = 'archive'