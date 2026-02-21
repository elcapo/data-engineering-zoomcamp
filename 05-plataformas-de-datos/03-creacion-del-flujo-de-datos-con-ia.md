# Plataformas de datos

## Creación del flujo de datos con IA

* Vídeo original (en inglés): [Using Bruin MCP with AI Agents](https://www.youtube.com/watch?v=224xH7h8OaQ&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=5)

Esta sesión es un poco especial porque vamos a repetir la implementación del flujo de datos de taxis con Bruin pero esta vez, en lugar de hacer nosotros la implementación a mano, pediremos a una IA que lo haga por nosotros:

* [Implementación manual](pipelines/taxi-pipeline/): versión del flujo de datos que completamos durante la sesión anterior,
* [Implementación con IA](pipelines/claude-pipeline/): versión del flujo de datos implementada por Claude Code.

### Preparación

Como única preparación, hemos lanzado el comando `bruin init`:

```bash
cd pipelines/
bruin init zoomcamp claude-pipeline
cd claude-pipeline/
```

Y a continuación hemos traducido el [README](pipelines/claude-pipeline/README.md) a español, aprovechando para explicar que en este caso en particular, el proyecto Bruin comparte repositorio Git con otros proyectos y advirtiendo que, por lo tanto, debe añadirse `--config-file .bruin,yml` a cada comando.

### Implementación

En cuanto a la interacción con Claude Code, ha sido bastante sencilla. Primero, hemos instalado el MCP de Bruin:

```bash
claude mcp add bruin -- bruin mcp
```

Y a continuación, hemos usado el _prompt_ que incluimos como parte de la documentación:

```text
Construye un flujo de datos de datos de extremo a extremo con los taxis de Nueva York usando Bruin.

El proyecto ya fue inicializado ejecutando `bruin init zoomcamp` y comparte repositorio Git con más proyectos. Su ubicación respecto a la raíz del proyecto Git es:

* `data-engineering-zoomcamp/05-plataformas-de-datos/pipelines/claude-pipeline`

... pero tú debes trabajar sin salir de `claude-pipeline`.

El archivo de conexiones `.bruin.yml` se generará dentro de esa carpeta.

> [!WARNING]
> Bruin busca por defecto el archivo `.bruin.yml` en la raíz del repositorio Git, por lo que todos los comandos deben ejecutarse desde `claude-pipeline` especificando su ruta mediante el argumento `--config-file`.

`
# Ejemplo de uso de --config-file
bruin run ./pipeline/assets/ingestion/trips.py \
    --environment default \
    --config-file .bruin.yml \
    --start-date 2021-01-01 \
    --end-date 2021-01-31 \
    --var taxi_types='["yellow"]' \
    --downstream
`

## Contexto

- Carpeta del proyecto: @zoomcamp/pipeline
- Documentación de referencia: @zoomcamp/README.md
- Usa las herramientas de Bruin MCP para buscar documentación y ejecutar comandos

## Instrucciones

### 1. Configuración (hacer esto primero)

- Crea `.bruin.yml` con una conexión DuckDB llamada `duckdb-default`
- Configura `pipeline.yml`: establece el nombre, la programación (mensual), `start_date`, `default_connections` y la variable `taxi_types` (array de strings)

### 2. Construir los artefactos (sigue los TODOs de cada archivo)

Detalles de la fuente de datos de viajes en bruto de los taxis de Nueva York:

- **URL**: `https://d37ci6vzurychx.cloudfront.net/trip-data/`
- **Formato**: Archivos Parquet, uno por tipo de taxi por mes
- **Nomenclatura**: `<taxi_type>_tripdata_<year>-<month>.parquet`
- **Ejemplos**:
  - `yellow_tripdata_2022-03.parquet`
  - `green_tripdata_2025-01.parquet`
- **Tipos de taxi**: `yellow` (por defecto), `green`

Construye en este orden, validando cada artefacto con `bruin validate` antes de continuar:

a) **pipeline/assets/ingestion/payment_lookup.asset.yml** - Artefacto seed para cargar la tabla de búsqueda desde CSV
b) **pipeline/assets/ingestion/trips.py** - Artefacto Python para obtener datos Parquet de los taxis de Nueva York desde el endpoint de TLC
   - Usa la variable `taxi_types` y el rango de fechas de BRUIN_START_DATE/BRUIN_END_DATE
   - Añade requirements.txt con: pandas, requests, pyarrow, python-dateutil
   - Conserva los datos en su formato más bruto, sin ninguna limpieza ni transformación
c) **pipeline/assets/staging/trips.sql** - Artefacto SQL para limpiar, deduplicar (ROW_NUMBER) y enriquecer con la tabla de búsqueda de pagos
   - Usa la estrategia `time_interval` con `pickup_datetime` como incremental_key
d) **pipeline/assets/reports/trips_report.sql** - Artefacto SQL para agregar por fecha, taxi_type y payment_type
   - Usa la estrategia `time_interval` para mantener la consistencia

### 3. Validar y Ejecutar

- Valida el flujo de datos completo: `bruin validate ./pipeline/pipeline.yml`
- Ejecuta con: `bruin run ./pipeline/pipeline.yml --full-refresh --start-date 2022-01-01 --end-date 2022-02-01`
- Para pruebas más rápidas, usa `--var 'taxi_types=["yellow"]'` (omite los taxis verdes)

### 4. Verificar los Resultados

- Comprueba el número de filas en todas las tablas
- Consulta la tabla de reports para confirmar que las agregaciones son correctas
- Verifica que todas las comprobaciones de calidad han pasado (se esperan 24 comprobaciones)
```

Lo más sorprendente es que después de unos 20 minutos, sin ninguna intervención adicional, Claude Code respondió con una pipeline plenamente funcional.

```
● Resumen del pipeline completado           

  El pipeline está funcionando perfectamente. Aquí el estado final:

  Resultados de la ejecución (enero 2022, taxis amarillos)

  ┌──────────────────────────┬───────────┐
  │          Tabla           │   Filas   │
  ├──────────────────────────┼───────────┤
  │ ingestion.payment_lookup │ 7         │
  ├──────────────────────────┼───────────┤
  │ ingestion.trips          │ 2.463.931 │
  ├──────────────────────────┼───────────┤
  │ staging.trips            │ 2.450.940 │
  ├──────────────────────────┼───────────┤
  │ reports.trips_report     │ 156       │
  └──────────────────────────┴───────────┘

  La diferencia entre ingestión y staging (~13.000 filas) corresponde a registros filtrados con fare_amount < 0 o total_amount < 0 (reembolsos/correcciones en los datos crudos) y
  deduplicados.

  Comprobaciones de calidad: 24/24 ✓

  ┌──────────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐
  │          Activo          │                                       Checks                                       │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ ingestion.payment_lookup │ 3 (not_null ×2, unique ×1)                                                         │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ ingestion.trips          │ 6 (not_null ×3, accepted_values ×1, non_negative ×1, not_null extracted_at ×1)     │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ staging.trips            │ 8 (not_null ×3, accepted_values ×1, non_negative ×3, custom no_duplicate_trips ×1) │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ reports.trips_report     │ 7 (not_null ×3, non_negative ×4)                                                   │
  └──────────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘

  Arquitectura construida

  ingestion.payment_lookup  (duckdb.seed)
           ↓
  ingestion.trips  (python, append)  ──→  staging.trips  (time_interval)  ──→  reports.trips_report  (time_interval)

  - .bruin.yml: conexión DuckDB en duckdb.db
  - pipeline.yml: pipeline mensual, variable taxi_types, start_date: 2022-01-01
  - Ingestión: descarga parquet del TLC por mes/tipo, normaliza columnas (tpep/lpep → pickup_datetime), añade taxi_type y extracted_at
  - Staging: deduplica con ROW_NUMBER por clave compuesta, filtra negativos, enriquece con lookup de pagos
  - Reports: agrega por día × tipo de taxi × tipo de pago

✻ Baked for 20m 17s
```

### Revisión

#### Artefactos de **ingestión**

En cuanto al código generado, no difiere mucho del que generamos en la sesión anterior manualmente. Y en las pocas cuestiones en que es diferente, lo es para mejor. Por ejemplo, en la implementación de la materialización de los trayectos, [assets/ingestion/trips.py](pipelines/claude-pipeline/assets/ingestion/trips.py), Claude Code implementó gestión de errores:

```python
try:
    # Descarga y procesa los ficheros
    # ...
    print(f"Loaded {len(df):,} rows for {taxi_type} {year_month}")

except requests.HTTPError as e:
    print(f"Warning: Could not fetch {url}: {e}")
```

Lo que significa que su versión de ese artefacto es, de hecho, más robusta que la que hicimos a mano.

#### Artefactos de **staging** y **reports**

Otra diferencia que resulta llamativa es que Claude Code añadió descripciones para cada una de las columnas en los artefactos SQL. Por ejemplo, en [assets/staging/trips.sql](pipelines/claude-pipeline/pipeline/assets/staging/trips.sql), documentó cada columna incluyendo comprobaciones de calidad de datos:

```yml
columns:
  - name: taxi_type
    type: string
    description: "Type of taxi: yellow or green"
    checks:
      - name: not_null
      - name: accepted_values
        value: ["yellow", "green"]
  - name: pickup_datetime
    type: timestamp
    description: "Trip pickup datetime"
    primary_key: true
    nullable: false
    checks:
      - name: not_null
    # ...
```
