TRUNCATE boc_metrics.year_overview;

INSERT INTO boc_metrics.year_overview
  (year, total_bulletins, processed_bulletins, bulletin_percentage,
   total_dispositions, processed_dispositions, disposition_percentage)
SELECT
  di.year,
  di.total_issues AS total_bulletins,
  COALESCE(ei.extracted, 0) AS processed_bulletins,
  CASE WHEN di.total_issues > 0
    THEN ROUND(100.0 * COALESCE(ei.extracted, 0) / di.total_issues, 1)
    ELSE 0 END AS bulletin_percentage,
  COALESCE(dd.total_documents, 0) AS total_dispositions,
  COALESCE(ed.extracted_documents, 0) AS processed_dispositions,
  CASE WHEN COALESCE(dd.total_documents, 0) > 0
    THEN ROUND(100.0 * COALESCE(ed.extracted_documents, 0) / dd.total_documents, 1)
    ELSE 0 END AS disposition_percentage
FROM boc_log.metric_download_issues AS di
LEFT JOIN boc_log.metric_extraction_issues AS ei ON ei.year = di.year
LEFT JOIN (
  SELECT year,
    SUM(total_documents) AS total_documents
  FROM boc_log.metric_download_documents
  GROUP BY year
) AS dd ON dd.year = di.year
LEFT JOIN (
  SELECT year,
    SUM(extracted) AS extracted_documents
  FROM boc_log.metric_extraction_documents
  GROUP BY year
) AS ed ON ed.year = di.year
ORDER BY di.year DESC