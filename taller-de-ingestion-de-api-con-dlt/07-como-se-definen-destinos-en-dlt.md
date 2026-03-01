# Taller: **Ingestión de datos de una API con DLT**

## ¿Cómo se defininen **destinos** en DLT?

En los artículos anteriores hemos descrito el recorrido completo de los datos desde la fuente hasta el pipeline. En este artículo analizamos el último eslabón de la cadena: el **destino**.

## ¿Qué es un **destino** en DLT?

Un **destino** en **dlt** es la ubicación donde el pipeline crea y mantiene el esquema y carga los datos. Puede ser una base de datos relacional, un data warehouse, un data lake, un sistema de archivos local o en la nube, o incluso una función Python personalizada.

En el [taxi-pipeline](pipelines/taxi-pipeline/taxi_pipeline.py), el destino se declara con un string:

```python
pipeline = dlt.pipeline(
    pipeline_name="taxi_pipeline",
    destination="duckdb",
    dataset_name="taxi_data",
    dev_mode=True,
    progress="log",
)
```

El string `"duckdb"` es la forma más concisa de indicar el destino pero **dlt** ofrece otras cuatro formas según el nivel de control que necesitemos.

## Formas de declarar un destino

### 1. String abreviado

La forma más simple. Solo funciona con los destinos integrados de **dlt**:

```python
pipeline = dlt.pipeline("taxi_pipeline", destination="duckdb")
pipeline = dlt.pipeline("taxi_pipeline", destination="bigquery")
pipeline = dlt.pipeline("taxi_pipeline", destination="postgres")
```

### 2. Importando la función de fábrica

Permite pasar parámetros adicionales directamente en la declaración:

```python
from dlt.destinations import duckdb

pipeline = dlt.pipeline(
    "taxi_pipeline",
    destination=duckdb("taxi_pipeline.duckdb"),
)
```

### 3. Módulo completo como string

Útil cuando se trabaja con destinos de terceros o cuando se quiere ser muy explícito:

```python
pipeline = dlt.pipeline(
    "taxi_pipeline",
    destination="dlt.destinations.duckdb",
)
```

### 4. Destino con nombre

Permite separar completamente la configuración del código. El destino se identifica por nombre y su tipo y credenciales se leen de `.dlt/secrets.toml`:

```python
pipeline = dlt.pipeline(
    "taxi_pipeline",
    destination="my_warehouse",  # el tipo se lee de secrets.toml
)
```

```toml
# .dlt/secrets.toml
[destination.my_warehouse]
destination_type = "duckdb"
```

Esta última forma es la más flexible porque permite cambiar de destino sin tocar el código.

## Destinos disponibles

**dlt** integra más de veinte destinos agrupados por categoría:

### Almacenes de datos

| Destino | Instalación |
|---------|-------------|
| Google BigQuery | `dlt[bigquery]` |
| Amazon Redshift | `dlt[redshift]` |
| Snowflake | `dlt[snowflake]` |
| Databricks | `dlt[databricks]` |
| Azure Synapse | `dlt[synapse]` |
| Microsoft Fabric Warehouse | `dlt[fabric]` |

### Bases de datos SQL

| Destino | Instalación |
|---------|-------------|
| DuckDB | `dlt[duckdb]` |
| PostgreSQL | `dlt[postgres]` |
| Microsoft SQL Server | `dlt[mssql]` |
| ClickHouse | `dlt[clickhouse]` |
| SQLAlchemy (múltiples bases de datos) | `dlt[sqlalchemy]` |

### Lagos de datos y almacenamiento

| Destino | Instalación |
|---------|-------------|
| Filesystem (local, S3, GCS, Azure) | `dlt[filesystem]` |
| Delta Lake | `dlt[deltalake]` |
| Apache Iceberg | `dlt[iceberg]` |
| AWS Athena / Glue Catalog | `dlt[athena]` |
| MotherDuck / DuckLake | `dlt[motherduck]` |

### Almacenes vectoriales

| Destino | Instalación |
|---------|-------------|
| Weaviate | `dlt[weaviate]` |
| LanceDB | `dlt[lancedb]` |
| Qdrant | `dlt[qdrant]` |

### Otros

| Destino | Descripción |
|---------|-------------|
| Hugging Face Datasets | Para publicar datasets |
| Custom destination | Función Python personalizada (reverse ETL) |

## DuckDB: el destino del taxi-pipeline

DuckDB es la elección natural para desarrollo local porque no requiere un servidor externo: la base de datos es un único archivo en disco (o puede vivir completamente en memoria). Es el destino que usa el taxi-pipeline.

### Instalación

```bash
uv add "dlt[duckdb]"
```

### Modos de conexión

#### Archivo local (por defecto)

Cuando el pipeline se ejecuta con `destination="duckdb"`, **dlt** crea automáticamente un archivo `{pipeline_name}.duckdb` en el directorio de trabajo actual:

```python
# Crea taxi_pipeline.duckdb en el directorio actual
pipeline = dlt.pipeline("taxi_pipeline", destination="duckdb")
```

Para especificar una ruta concreta:

```python
from dlt.destinations import duckdb

pipeline = dlt.pipeline(
    "taxi_pipeline",
    destination=duckdb("data/taxi_pipeline.duckdb"),
)
```

#### En memoria

Útil para pruebas y para transformaciones intermedias que no necesitan persistencia:

```python
import duckdb
from dlt.destinations import duckdb as duckdb_dest

db = duckdb.connect(":memory:")

pipeline = dlt.pipeline(
    "taxi_pipeline",
    destination=duckdb_dest(db),
    dataset_name="taxi_data",
)
```

#### Mediante URL de conexión

```toml
# .dlt/config.toml
[destination.duckdb.credentials]
database = "duckdb:///data/taxi_pipeline.duckdb"
```

### Capacidades de DuckDB

| Característica | Valor |
|---|---|
| Formato de archivo preferido | `insert_values` |
| Formatos soportados | `insert_values`, `parquet`, `jsonl` |
| Estrategias de merge | `delete-insert`, `upsert`, `scd2` |
| Estrategias de replace | `truncate-and-insert`, `insert-from-staging` |
| Sensible a mayúsculas | No |
| Timestamps con zona horaria | Sí |

> [!TIP]
> Si instalas `pyarrow` (`uv add pyarrow`), DuckDB puede usar el formato `parquet` para la carga, que es significativamente más rápido que el formato predeterminado `insert_values` para volúmenes grandes de datos.

## Configuración de credenciales

**dlt** sigue un orden de prioridad al buscar las credenciales de un destino:

1. Parámetros pasados explícitamente en el código.
2. Variables de entorno.
3. Archivos `.dlt/secrets.toml` y `.dlt/config.toml`.

### Con `secrets.toml`

La forma recomendada para credenciales es el archivo `.dlt/secrets.toml`, que **nunca debe subirse al repositorio**:

```toml
# .dlt/secrets.toml — para PostgreSQL
[destination.postgres.credentials]
host = "localhost"
port = 5432
database = "taxi_db"
username = "loader"
password = "mi-contraseña-segura"
```

```toml
# .dlt/secrets.toml — para BigQuery
[destination.bigquery.credentials]
project_id = "mi-proyecto-gcp"
private_key = "-----BEGIN RSA PRIVATE KEY-----\n..."
client_email = "dlt-loader@mi-proyecto-gcp.iam.gserviceaccount.com"
```

### Con variables de entorno

La misma configuración usando variables de entorno (el doble guion bajo `__` actúa como separador de sección):

```bash
# PostgreSQL
DESTINATION__POSTGRES__CREDENTIALS__HOST=localhost
DESTINATION__POSTGRES__CREDENTIALS__PORT=5432
DESTINATION__POSTGRES__CREDENTIALS__DATABASE=taxi_db
DESTINATION__POSTGRES__CREDENTIALS__USERNAME=loader
DESTINATION__POSTGRES__CREDENTIALS__PASSWORD=mi-contraseña-segura
```

Las variables de entorno son especialmente útiles en entornos CI/CD y orquestadores como Kestra o Airflow, donde las credenciales se gestionan como secretos del sistema.

### Con credenciales explícitas en el código

Para PostgreSQL, **dlt** acepta también una cadena de conexión completa:

```python
from dlt.destinations import postgres

pipeline = dlt.pipeline(
    "taxi_pipeline",
    destination=postgres(
        credentials="postgresql://loader:mi-contraseña@localhost:5432/taxi_db"
    ),
)
```

## El patrón de destino con nombre: cambiando de entorno sin tocar el código

Una de las funcionalidades más útiles de los destinos en **dlt** es la posibilidad de cambiar completamente de destino entre entornos (desarrollo, staging, producción) sin modificar ni una sola línea de código Python.

El código siempre hace referencia al mismo nombre:

```python
# taxi_pipeline.py — igual en todos los entornos
pipeline = dlt.pipeline(
    pipeline_name="taxi_pipeline",
    destination="taxi_dest",
    dataset_name="taxi_data",
)
```

Y la configuración en `.dlt/secrets.toml` varía según el entorno:

```toml
# Desarrollo: DuckDB local
[destination.taxi_dest]
destination_type = "duckdb"
```

```toml
# Producción: BigQuery
[destination.taxi_dest]
destination_type = "bigquery"

[destination.taxi_dest.credentials]
project_id = "mi-proyecto-gcp"
private_key = "-----BEGIN RSA PRIVATE KEY-----\n..."
client_email = "dlt-loader@mi-proyecto-gcp.iam.gserviceaccount.com"
location = "EU"
```

Esto es lo que en el artículo sobre Kestra (artículo 03) hacíamos manualmente con variables de entorno: **dlt** lo centraliza en el sistema de configuración.

## Múltiples instancias del mismo destino

Cuando necesitamos cargar datos en dos instancias diferentes del mismo tipo de destino (por ejemplo, dos proyectos distintos de BigQuery), podemos declarar tantos destinos con nombre como necesitemos:

```toml
# .dlt/secrets.toml
[destination.bigquery_eu]
destination_type = "bigquery"
location = "EU"

[destination.bigquery_eu.credentials]
project_id = "proyecto-europa"
private_key = "..."
client_email = "loader@proyecto-europa.iam.gserviceaccount.com"

[destination.bigquery_us]
destination_type = "bigquery"
location = "US"

[destination.bigquery_us.credentials]
project_id = "proyecto-usa"
private_key = "..."
client_email = "loader@proyecto-usa.iam.gserviceaccount.com"
```

```python
pipeline_eu = dlt.pipeline(
    "taxi_eu",
    destination=dlt.destination("bigquery_eu", destination_type="bigquery"),
    dataset_name="taxi_data",
)

pipeline_us = dlt.pipeline(
    "taxi_us",
    destination=dlt.destination("bigquery_us", destination_type="bigquery"),
    dataset_name="taxi_data",
)
```

## Inspeccionar las capacidades del destino

Cada destino expone un objeto de capacidades que describe qué formatos, estrategias y tipos de datos soporta:

```python
pipeline = dlt.pipeline("taxi_pipeline", destination="duckdb")
print(dict(pipeline.destination.capabilities()))
```

Esto es especialmente útil al migrar de un destino a otro para identificar diferencias de comportamiento antes de hacer el cambio.

## Convención de nombres de columnas

Cada destino aplica una convención de nombres para normalizar los identificadores de las columnas. La convención por defecto es `snake_case`, que convierte `tripDistance` a `trip_distance`. DuckDB también admite la convención `duck_case`, que permite emojis y otros caracteres especiales en los nombres:

```toml
# .dlt/config.toml
[schema]
naming = "duck_case"
```

Snowflake, por su parte, requiere la convención `sql_cs_v1` cuando se trabaja con identificadores sensibles a mayúsculas:

```python
from dlt.destinations import snowflake

pipeline = dlt.pipeline(
    "taxi_pipeline",
    destination=snowflake(naming_convention="sql_cs_v1"),
)
```

## El taxi-pipeline con PostgreSQL

El taxi-pipeline usa DuckDB para desarrollo local, pero migrarlo a PostgreSQL para producción solo requiere cambiar el destino y proporcionar las credenciales. El código del pipeline permanece igual:

```python
import dlt
from dlt.sources.rest_api import rest_api_source

source = rest_api_source({
    "client": {
        "base_url": "https://us-central1-dlthub-analytics.cloudfunctions.net/data_engineering_zoomcamp_api",
    },
    "resources": [
        {
            "name": "rides",
            "endpoint": {
                "path": "",
                "paginator": {
                    "type": "page_number",
                    "page_param": "page",
                    "base_page": 1,
                    "total_path": None,
                    "stop_after_empty_page": True,
                },
            },
        }
    ],
})

if __name__ == "__main__":
    pipeline = dlt.pipeline(
        pipeline_name="taxi_pipeline",
        destination="taxi_dest",   # el tipo se lee de secrets.toml
        dataset_name="taxi_data",
        progress="log",
    )
    load_info = pipeline.run(source)
    print(load_info)
```

Con este código, basta con cambiar `.dlt/secrets.toml` para mover el pipeline de DuckDB a PostgreSQL (o a cualquier otro destino) sin tocar el script:

```toml
# Desarrollo
[destination.taxi_dest]
destination_type = "duckdb"
```

```toml
# Producción
[destination.taxi_dest]
destination_type = "postgres"

[destination.taxi_dest.credentials]
host = "db.produccion.ejemplo.com"
port = 5432
database = "taxi_db"
username = "loader"
password = "contraseña-segura"
```

## Resumen

Los destinos en **dlt** son el punto de llegada de los datos. Sus capacidades más importantes son:

| Capacidad | Mecanismo |
|-----------|-----------|
| Declarar el destino de forma simple | String: `destination="duckdb"` |
| Pasar parámetros al destino | Función de fábrica: `duckdb("ruta.duckdb")` |
| Configurar credenciales de forma segura | `.dlt/secrets.toml` o variables de entorno |
| Cambiar de entorno sin tocar el código | Destinos con nombre (`named destinations`) |
| Usar múltiples instancias del mismo tipo | Un nombre distinto por instancia en `secrets.toml` |
| Inspeccionar las capacidades del destino | `pipeline.destination.capabilities()` |

Para más información, consulta la documentación oficial de **dlt** sobre [destinos](https://dlthub.com/docs/general-usage/destination) (en inglés).
