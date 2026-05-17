CREATE OR REPLACE VIEW boc_log.view_followup_documents AS
WITH disposition_state AS (
  SELECT
    i.year,
    i.issue,
    id.disposition,
    -- A disposition belongs to a whole-bulletin PDF when its pdf URL is the
    -- bulletin-level file (boc-YEAR-NNN.pdf) rather than a per-disposition
    -- file (boc-a-YEAR-NNN-NUMBER.pdf). For those, the bulletin is fetched
    -- and parsed once at the issue level, so the per-disposition download
    -- and extraction are considered complete as soon as the issue row exists.
    (id.pdf ~ '/boc-[0-9]+-[0-9]+\.pdf$') AS whole_bulletin,
    dl.downloaded_at,
    el.extracted_at
  FROM boc_dataset.issue AS i
  JOIN boc_dataset.issue__dispositions AS id ON id._dlt_parent_id = i._dlt_id
  LEFT JOIN boc_log.download_log AS dl
    ON dl.entity_type = 'document'
   AND dl.year = i.year
   AND dl.issue = i.issue
   AND dl.disposition = id.disposition
  LEFT JOIN boc_log.extraction_log AS el
    ON el.entity_type = 'document'
   AND el.year = i.year
   AND el.issue = i.issue
   AND el.disposition = id.disposition
)
SELECT
  year,
  issue,
  MIN(disposition) AS first_document,
  MAX(disposition) AS last_document,
  COUNT(*) AS document_count,
  SUM(CASE WHEN whole_bulletin OR downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_downloads,
  SUM(CASE WHEN whole_bulletin OR extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_extractions,
  COUNT(*) - SUM(CASE WHEN whole_bulletin OR downloaded_at IS NOT NULL THEN 1 ELSE 0 END) AS missing_downloads,
  COUNT(*) - SUM(CASE WHEN whole_bulletin OR extracted_at IS NOT NULL THEN 1 ELSE 0 END) AS missing_extractions
FROM disposition_state
GROUP BY year, issue
ORDER BY year DESC, issue DESC
