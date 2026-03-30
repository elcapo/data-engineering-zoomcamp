/**
 * Refresh boc_dataset.sections from document and issue__dispositions.
 *
 * Counts distinct dispositions (year, issue, disposition) per section.
 * Uses COALESCE(NULLIF(...)) to prefer document.section over
 * issue__dispositions.section, skipping empty strings.
 * ON CONFLICT updates the count on re-runs.
 */

INSERT INTO boc_dataset.sections (section, dispositions)
SELECT section, COUNT(*) AS dispositions
FROM (
    SELECT DISTINCT
        COALESCE(NULLIF(d.section, ''), NULLIF(id.section, '')) AS section,
        i.year, i.issue, id.disposition
    FROM boc_dataset.issue__dispositions id
    JOIN boc_dataset.issue i ON id._dlt_root_id = i._dlt_id
    LEFT JOIN boc_dataset.document d
        ON d.year = i.year AND d.issue = i.issue
        AND CAST(d.number AS bigint) = id.disposition
) AS disps
WHERE section IS NOT NULL
GROUP BY section
ON CONFLICT (section) DO UPDATE SET dispositions = EXCLUDED.dispositions;
