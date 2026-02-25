# Pipeline de análisis de taxis de Nueva York

Pipeline de transformación de datos sobre los viajes en taxi de la ciudad de Nueva York, construida con [dbt](https://www.getdbt.com/) y [DuckDB](https://duckdb.org/).

## Descripción

El proyecto descarga los datos históricos de viajes en taxi publicados por la [NYC Taxi and Limousine Commission (TLC)](https://www.nyc.gov/site/tlc/index.page) y los transforma siguiendo una arquitectura en capas:

```
Ingesta (Python) → staging → intermediate → marts (DuckDB)
```

### Fuentes de datos

| Tipo | Años | Script de ingesta |
|------|------|-------------------|
| Yellow taxi | 2019–2020 | `nytaxi/datatalks_ingest.py` |
| Green taxi | 2019–2020 | `nytaxi/datatalks_ingest.py` |
| FHV (vehículos de alquiler) | 2019–2021 | `nytaxi/fhv_ingest.py` |

Los datos se descargan en formato CSV comprimido desde el repositorio de [DataTalksClub](https://github.com/DataTalksClub/nyc-tlc-data), se convierten a Parquet y se cargan en una base de datos DuckDB local (`nytaxi.duckdb`).

### Modelos dbt

- **staging**: estandariza y limpia los datos brutos de cada tipo de taxi.
- **intermediate**: une los viajes de taxi amarillo y verde en una sola tabla.
- **marts**:
  - `fact_trips` — tabla de hechos con todos los viajes enriquecidos.
  - `dimension_vendors` — dimensión de proveedores de tecnología.
  - `dimension_zones` — dimensión de zonas geográficas de la ciudad.

## Requisitos previos

- [Python 3.13+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/) — gestor de paquetes y entornos virtuales

## Instalación

1. Clona el repositorio y accede al directorio del proyecto:

   ```bash
   cd 04-analisis-de-datos/pipeline
   ```

2. Instala las dependencias con `uv`:

   ```bash
   uv sync
   ```

   Esto creará un entorno virtual en `.venv` e instalará `dbt-duckdb` y `duckdb`.

## Configuración

### Perfil de dbt

dbt necesita un perfil de conexión en `~/.dbt/profiles.yml`. Crea el fichero (o añade el perfil si ya existe) con el siguiente contenido:

```yaml
nytaxi:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: /ruta/absoluta/a/pipeline/nytaxi.duckdb
      schema: prod
```

Sustituye `/ruta/absoluta/a/pipeline/` por la ruta real al directorio `pipeline/` en tu máquina.

### Variables de entorno (opcional)

El fichero `service-account.json` contiene credenciales de Google Cloud y está excluido del repositorio. Si necesitas conectar con BigQuery u otros servicios de GCP, coloca tu fichero de credenciales en la raíz del proyecto con ese nombre.

## Ejecución de la pipeline

### 1. Ingesta de datos

Ejecuta los scripts de ingesta desde el directorio `nytaxi/`:

```bash
cd nytaxi

# Yellow y green taxi (2019–2020)
uv run python datatalks_ingest.py

# FHV — vehículos de alquiler (2019–2021)
uv run python fhv_ingest.py
```

Los scripts descargan los datos, los convierten a Parquet y crean las tablas `prod.yellow_tripdata`, `prod.green_tripdata` y `prod.fhv_tripdata` en `nytaxi.duckdb`.

### 2. Instalación de paquetes dbt

La primera vez, instala las dependencias del proyecto dbt desde el directorio `nytaxi/`:

```bash
cd nytaxi
uv run dbt deps
```

### 3. Carga de semillas (tablas de referencia)

```bash
uv run dbt seed
```

Carga las tablas de referencia `payment_type_lookup` y `taxi_zone_lookup`.

### 4. Ejecución de los modelos

```bash
uv run dbt run
```

Ejecuta todos los modelos en orden: staging → intermediate → marts.

### 5. Validación de los datos

```bash
uv run dbt test
```

Ejecuta los tests de calidad definidos en los ficheros `schema.yml` (unicidad, nulos, valores aceptados e integridad referencial).

### Ejecución completa

```bash
uv run dbt build
```

`dbt build` equivale a ejecutar `seed` + `run` + `test` en un solo comando.
