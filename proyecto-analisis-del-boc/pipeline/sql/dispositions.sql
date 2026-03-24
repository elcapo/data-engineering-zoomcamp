/**
 * List of dispositions of a given issue.
 */

SELECT
  i.year,
  i.issue,
  i.title,
  d.section,
  d.subsection,
  d.organization,
  d.summary,
  d.html,
  d.pdf
FROM boc_dataset.issue__dispositions AS d
JOIN boc_dataset.issue AS i ON i._dlt_id = d._dlt_parent_id
ORDER BY i.year, i.issue, d._dlt_list_idx