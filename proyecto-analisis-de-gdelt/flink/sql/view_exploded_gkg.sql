CREATE TEMPORARY VIEW exploded_gkg AS
SELECT gkg_ts, tone, theme
FROM kafka_gkg
CROSS JOIN LATERAL TABLE(split_themes(themes)) AS T(theme)
