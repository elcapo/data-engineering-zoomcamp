TRUNCATE boc_metrics.processed_bulletins;

INSERT INTO boc_metrics.processed_bulletins
  (group_type, year, issue, processed_at)
(SELECT 'recent', l.year, l.issue, e.extracted_at
 FROM boc_log.download_log AS l
 JOIN boc_log.extraction_log AS e
   ON e.entity_type = l.entity_type AND e.year = l.year AND e.issue = l.issue
 WHERE l.entity_type = 'issue' AND e.extracted_at IS NOT NULL
 ORDER BY l.year DESC, l.issue DESC
 LIMIT 5)
UNION ALL
(SELECT 'oldest', l.year, l.issue, e.extracted_at
 FROM boc_log.download_log AS l
 JOIN boc_log.extraction_log AS e
   ON e.entity_type = l.entity_type AND e.year = l.year AND e.issue = l.issue
 WHERE l.entity_type = 'issue' AND e.extracted_at IS NOT NULL
 ORDER BY l.year ASC, l.issue ASC
 LIMIT 5)