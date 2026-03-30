/**
 * Refresh boc_dataset.sections from document and issue__dispositions.
 *
 * Uses INSERT ... ON CONFLICT to be idempotent.
 * Excludes NULL and empty-string values.
 */

INSERT INTO boc_dataset.sections (section)
SELECT DISTINCT section
FROM (
    SELECT section FROM boc_dataset.document
    WHERE section IS NOT NULL AND section != ''
    UNION
    SELECT section FROM boc_dataset.issue__dispositions
    WHERE section IS NOT NULL AND section != ''
) AS all_sections
ON CONFLICT (section) DO NOTHING;
