/**
 * Refresh boc_dataset.organizations from document and issue__dispositions.
 *
 * Counts distinct dispositions (year, issue, disposition) per organization.
 * Uses COALESCE(NULLIF(...)) to prefer document.organization over
 * issue__dispositions.organization, skipping empty strings.
 * ON CONFLICT updates the count on re-runs.
 */

INSERT INTO boc_dataset.organizations (organization, dispositions)
SELECT organization, COUNT(*) AS dispositions
FROM (
    SELECT DISTINCT
        COALESCE(NULLIF(d.organization, ''), NULLIF(id.organization, '')) AS organization,
        i.year, i.issue, id.disposition
    FROM boc_dataset.issue__dispositions id
    JOIN boc_dataset.issue i ON id._dlt_root_id = i._dlt_id
    LEFT JOIN boc_dataset.document d
        ON d.year = i.year AND d.issue = i.issue
        AND CAST(d.number AS bigint) = id.disposition
) AS disps
WHERE organization IS NOT NULL
GROUP BY organization
ON CONFLICT (organization) DO UPDATE SET dispositions = EXCLUDED.dispositions;
