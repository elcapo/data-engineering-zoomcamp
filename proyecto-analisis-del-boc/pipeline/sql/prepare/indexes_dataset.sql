-- Índices sobre las tablas que alimenta dlt en boc_dataset, pensados
-- para los patrones de consulta del frontend (búsqueda, listados por
-- año/boletín, detalle de disposición).
--
-- Reglas:
--   · Cada sentencia va separada por el sentinel `-- @statement`. El
--     task apply_indexes del flow prepare_database las ejecuta una a
--     una con autocommit, que es requisito de CREATE INDEX CONCURRENTLY.
--   · CONCURRENTLY + IF NOT EXISTS → no bloquea lectura/escritura y es
--     idempotente; seguro de re-ejecutar sobre una BBDD ya poblada.

-- @statement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_year_issue_disposition
  ON boc_dataset.document (year, issue, disposition)
  WHERE year IS NOT NULL AND issue IS NOT NULL AND disposition IS NOT NULL;

-- @statement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_dispositions_dlt_root_id
  ON boc_dataset.issue__dispositions (_dlt_root_id);

-- @statement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_year_issue
  ON boc_dataset.issue (year, issue);

-- @statement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_section
  ON boc_dataset.document (section)
  WHERE section IS NOT NULL;

-- @statement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_dispositions_section
  ON boc_dataset.issue__dispositions (section)
  WHERE section IS NOT NULL;

-- @statement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_date
  ON boc_dataset.document (date)
  WHERE date IS NOT NULL;

-- @statement
ANALYZE boc_dataset.issue;

-- @statement
ANALYZE boc_dataset.issue__dispositions;

-- @statement
ANALYZE boc_dataset.document;
