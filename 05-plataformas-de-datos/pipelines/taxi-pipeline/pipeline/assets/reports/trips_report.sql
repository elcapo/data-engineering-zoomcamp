/* @bruin

# Documentación:
# - Assets SQL: https://getbruin.com/docs/bruin/assets/sql
# - Materialización: https://getbruin.com/docs/bruin/assets/materialization
# - Checks de calidad: https://getbruin.com/docs/bruin/quality/available_checks

# Define el nombre del asset.
name: reports.trips_report

# Define el tipo de plataforma.
# Documentación: https://getbruin.com/docs/bruin/assets/sql
type: duckdb.sql

# Declara la dependencia del/los asset(s) de staging de los que lee este informe.
depends:
  - staging.trips

# Elige la estrategia de materialización.
# Para informes, `time_interval` es una buena opción para reconstruir solo la ventana temporal relevante.
# Importante: usa la misma `incremental_key` que en staging (por ejemplo, pickup_datetime) para mantener la consistencia.
materialization:
  type: table
  strategy: time_interval
  incremental_key: trip_date
  time_granularity: date

# Define las columnas del informe + la(s) clave(s) primaria(s) en el nivel de agregación elegido.
columns:
  - name: trip_date
    type: date
    primary_key: true
  - name: taxi_type
    type: string
    primary_key: true
  - name: payment_type
    type: string
    primary_key: true
  - name: trip_count
    type: bigint
    checks:
      - name: non_negative

@bruin */

-- Propósito de los informes:
-- - Agregar los datos de staging para dashboards y analítica
-- Conceptos de Bruin requeridos:
-- - Filtrar usando `{{ start_datetime }}` / `{{ end_datetime }}` para ejecuciones incrementales
-- - Aplicar GROUP BY a tus columnas de dimensión + fecha

SELECT
    CAST(pickup_datetime AS DATE) AS trip_date,
    taxi_type,
    payment_type_name AS payment_type,
    COUNT(*) AS trip_count,
    SUM(fare_amount) AS total_fare,
    AVG(fare_amount) AS avg_fare
FROM staging.trips
WHERE pickup_datetime >= '{{ start_datetime }}'
  AND pickup_datetime < '{{ end_datetime }}'
GROUP BY 1, 2, 3