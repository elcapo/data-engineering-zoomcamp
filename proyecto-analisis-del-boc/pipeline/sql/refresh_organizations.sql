/**
 * Refresh boc_dataset.organizations from document and issue__dispositions.
 *
 * Uses INSERT ... ON CONFLICT to be idempotent.
 * Excludes NULL and empty-string values.
 */

INSERT INTO boc_dataset.organizations (organization)
SELECT DISTINCT organization
FROM (
    SELECT organization FROM boc_dataset.document
    WHERE organization IS NOT NULL AND organization != ''
    UNION
    SELECT organization FROM boc_dataset.issue__dispositions
    WHERE organization IS NOT NULL AND organization != ''
) AS all_orgs
ON CONFLICT (organization) DO NOTHING;
