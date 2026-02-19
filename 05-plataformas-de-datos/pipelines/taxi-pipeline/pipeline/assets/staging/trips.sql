/* @bruin

# Docs:
# - Materialización: https://getbruin.com/docs/bruin/assets/materialization
# - Comprobaciones de calidad de datos predefinidas: https://getbruin.com/docs/bruin/quality/available_checks
# - Comprobaciones de calidad de datos personalizadas: https://getbruin.com/docs/bruin/quality/custom

# Establece el nombre del artefacto.
name: staging.trips

# Establece el tipo de plataforma.
# Docs: https://getbruin.com/docs/bruin/assets/sql
type: duckdb.sql

# Declara dependencias para facilitar el funcionamiento de `bruin run ... --downstream` y del lineaje.
depends:
  - ingestion.trips
  - ingestion.payment_lookup

# Escoge una estrategia incremental basada en procesamiento temporal si el conjunto de datos está
# naturalmente organizado por ventanas temporales.
materialization:
  # La materialización le dice a Bruin cómo transformar tu consulta en un conjunto de datos persistido.
  # Docs: https://getbruin.com/docs/bruin/assets/materialization
  #
  # Tipo de materialización:
  # - table: persisted table
  # - view: persisted view (if the platform supports it)
  type: table

  # Estrategia de materialización.
  # Docs: https://getbruin.com/docs/bruin/assets/materialization

  # Estrategias incrementales:
  # Las estrategias incrementales implican que solo actualizas una parte del destino en lugar de
  # reconstruirlo entero con cada ejecución.

  # En Bruin, esto se controla con las claves `strategy`, `incremental_key` y `time_granularity`.

  # Algunas estrategias comunes son:
  # - create+replace (reconstrucción completa)
  # - truncate+insert (reconstrucción completa sin eliminar y recrear las tablas)
  # - append (solo añadir nuevos registros)
  # - delete+insert (actualizar las particiones basándose en las claves primarias)
  # - merge (actualización de registros usando la clave primaria)
  # - time_interval (actualización de datos considerando solo una ventana de tiempo)
  strategy: time_interval

  # Establece la columna que define la ventana temporal.
  incremental_key: pickup_datetime

  # Tipo de la columna anterior: `date` ó `timestamp`
  time_granularity: timestamp

# Defina las columnas de salida, marca claves primarias y añade comprobaciones básicas por columna.
columns:
  - name: pickup_datetime
    type: timestamp
    primary_key: true
    checks:
      - name: not_null

# Comprobación personalizada a aplicar al conjunto de datos.
# Docs: https://getbruin.com/docs/bruin/quality/custom
custom_checks:
  - name: row_count_greater_than_zero
    query: |
      SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
      FROM staging.trips
    value: 1

@bruin */

-- Propósito de staging:
-- - Limpiar y normalizar el esquema proveniente de ingesta
-- - Eliminar duplicados (importante si la ingesta usa la estrategia append)
-- - Enriquecer con tablas de referencia (JOINs)
-- - Filtrar filas inválidas (PKs nulas, valores negativos, etc.)
--
-- ¿Por qué filtrar por {{ start_datetime }} / {{ end_datetime }}?
-- Al usar la estrategia `time_interval`, Bruin:
--   1. ELIMINA las filas donde la `incremental_key` cae dentro de la ventana temporal de la ejecución
--   2. INSERTA el resultado de tu consulta
-- Por lo tanto, tu consulta DEBE filtrar a la misma ventana temporal para que solo se inserte ese subconjunto.
-- Si no filtras, insertarás TODOS los datos pero solo se eliminarán los de la ventana = duplicados.

SELECT
    t.pickup_datetime,
    t.dropoff_datetime,
    t.pickup_location_id,
    t.dropoff_location_id,
    t.fare_amount,
    t.taxi_type,
    p.payment_type_name
FROM ingestion.trips t
LEFT JOIN ingestion.payment_lookup p
    ON t.payment_type = p.payment_type_id
WHERE t.pickup_datetime >= '{{ start_datetime }}'
  AND t.pickup_datetime < '{{ end_datetime }}'
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.pickup_datetime, t.dropoff_datetime,
                 t.pickup_location_id, t.dropoff_location_id, t.fare_amount
    ORDER BY t.pickup_datetime
) = 1
