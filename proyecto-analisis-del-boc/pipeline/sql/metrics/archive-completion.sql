/**
 * Summary of the download and extraction completion of the archive.
 */

SELECT
  dy.total_years,
  dy.downloaded_years,
  dy.percentage AS downloaded_percentage,
  ey.extracted AS extracted_years,
  ey.percentage AS extracted_percentage
FROM boc_dataset.metric_download_years AS dy
LEFT JOIN boc_dataset.metric_extraction_years AS ey ON 1=1