TRUNCATE boc_metrics.processed_dispositions;

INSERT INTO boc_metrics.processed_dispositions
  (group_type, year, issue, disposition, processed_at)
(SELECT 'recent', l.year, l.issue, l.disposition, e.extracted_at
 FROM boc_log.download_log AS l
 JOIN boc_log.extraction_log AS e
   ON e.entity_type = l.entity_type AND e.year = l.year
   AND e.issue = l.issue AND e.disposition = l.disposition
 WHERE l.entity_type = 'document' AND e.extracted_at IS NOT NULL
 ORDER BY l.year DESC, l.issue DESC, l.disposition DESC
 LIMIT 5)
UNION ALL
(SELECT 'oldest', l.year, l.issue, l.disposition, e.extracted_at
 FROM boc_log.download_log AS l
 JOIN boc_log.extraction_log AS e
   ON e.entity_type = l.entity_type AND e.year = l.year
   AND e.issue = l.issue AND e.disposition = l.disposition
 WHERE l.entity_type = 'document' AND e.extracted_at IS NOT NULL
 ORDER BY l.year ASC, l.issue ASC, l.disposition ASC
 LIMIT 5)