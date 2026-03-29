/**
 * Normalize the `section` column in issue__dispositions:
 *   1. Remove leading Roman-numeral prefixes (e.g. "IV. ", "III.-").
 *   2. Convert to title case, keeping Spanish prepositions lowercase.
 *
 * This is a one-time migration for data already downloaded.
 * Future extractions are normalized in Python at parse time.
 */

-- Temporary function that mirrors the Python normalize_section() logic.
CREATE OR REPLACE FUNCTION pg_temp.normalize_section(s text) RETURNS text AS $$
DECLARE
    stripped text;
    words   text[];
    result  text[];
    w       text;
    lowercase_words text[] := ARRAY['de','del','la','las','los','y','el','en'];
BEGIN
    stripped := trim(regexp_replace(s, '^([IVXLC]+[\.\-]+\s*)+', ''));
    stripped := regexp_replace(stripped, '\s+', ' ', 'g');

    IF stripped = '' THEN
        RETURN s;
    END IF;

    words  := string_to_array(lower(stripped), ' ');
    result := ARRAY[]::text[];

    FOR i IN 1..array_length(words, 1) LOOP
        w := words[i];
        IF i = 1 OR NOT (w = ANY(lowercase_words)) THEN
            w := upper(left(w, 1)) || substring(w from 2);
        END IF;
        result := array_append(result, w);
    END LOOP;

    RETURN array_to_string(result, ' ');
END;
$$ LANGUAGE plpgsql;

-- Apply the normalization.
UPDATE boc_dataset.issue__dispositions
SET section = pg_temp.normalize_section(section)
WHERE section IS NOT NULL AND section != '';
