-- Índices trigram GIN para búsquedas ILIKE sobre el campo organization
-- del buscador (`COALESCE(d.organization, id.organization) ILIKE '%…%'`).
-- Un BTREE no sirve aquí porque el filtro lleva wildcard inicial.
--
-- Requiere la extensión pg_trgm. Si el usuario `boc` no es superuser y
-- la extensión no estaba instalada, la sentencia CREATE EXTENSION
-- fallará con InsufficientPrivilege; el task apply_indexes lo captura
-- y continúa, pero hay que lanzarla a mano una vez con un superuser:
--
--   psql -U postgres -d boc -c 'CREATE EXTENSION pg_trgm;'
--
-- Tras eso, re-ejecutar prepare_database crea los índices.

-- @statement
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- @statement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_organization_trgm
  ON boc_dataset.document
  USING gin (organization gin_trgm_ops)
  WHERE organization IS NOT NULL;

-- @statement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issue_dispositions_organization_trgm
  ON boc_dataset.issue__dispositions
  USING gin (organization gin_trgm_ops)
  WHERE organization IS NOT NULL;
