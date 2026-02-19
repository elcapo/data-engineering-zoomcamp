# Plataformas de datos

## Caso práctico: Flujo de datos completo con Bruin

* Vídeo original (en inglés): [Building an End-to-End Pipeline with NYC Taxi Data](https://www.youtube.com/watch?v=q0k_iz9kWsI&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=4)

En esta sesión vamos a continuar trabajando con Bruin, esta vez implementando un proceso ELT basado en el conjunto de datos de taxis de Nueva York organizado en tres capas:

1. Capa de **ingestión**: encargada de la descarga de los ficheros y de su almacenamiento sin procesar.
2. Capa de **preparación**: encargada de preprocesar, limpiar, transformar y unir los datos.
3. Capa de **informes**: encargada de agregar datos y realizar cálculos.

### Creación del proyecto

Siguiendo los pasos descritos en la sesión anterior de [introducción a Bruin](01-introduccion-a-bruin.md), vamos a empezar por crear el directorio para nuestro proyecto e inicializarlo como un proyecto Bruin:

```bash
cd pipelines

bruin init zoomcamp taxi-pipeline
```

En este caso, escogeremos la plantilla de proyecto **zoomcamp** creada por el equipo de Bruin específicamente para el curso.

### Configuración

Como almacén local de datos usaremos DuckDB, por lo que necesitamos crear un [`.bruin.yml`](pipelines/taxi-pipeline/.bruin.yml) para nuestro proyecto indicándolo.

```yaml
default_environment: default

environments:
  default:
    connections:
      duckdb:
        - name: duckdb-default
          path: duckdb.db
```

Tanto este fichero como el de la base de datos deberán estar fuera de nuestro repositorio Git, por lo que también añadiremos un [`.gitignore`](pipelines/taxi-pipeline/.gitignore).

```
.bruin.yml
duckdb.db
```

Finalmente, configuraremos el fichero de configuración principal de nuestro flujo de datos, [`pipeline/pipeline.yml`](pipelines/taxi-pipeline/pipeline/pipeline.yml).

```yaml
# Zoomcamp de ingeniería de datos
#
# Documentación clave:
# - Archivos de pipeline: https://getbruin.com/docs/bruin/getting-started/pipeline
# - Variables (JSON Schema): https://getbruin.com/docs/bruin/getting-started/pipeline-variables
# - Comando de ejecución: https://getbruin.com/docs/bruin/commands/run

# Define un nombre para el pipeline (string). Aparece en los logs + `BRUIN_PIPELINE` para los assets de Python.
name: nyc_taxi

# Elige una programación ("daily", "hourly", "weekly", "monthly") o una cadena cron.
schedule: daily

# Define la fecha más temprana que este pipeline debe considerar para backfills con refresh completo.
# Formato: YYYY-MM-DD
start_date: "2022-01-01"

# Configura las conexiones por defecto para que los assets puedan omitir `connection: ...`.
# Patrón común: `duckdb: duckdb-default` para desarrollo local.
# Documentación (conexiones): https://getbruin.com/docs/bruin/commands/connections
default_connections:
  duckdb: duckdb-default

# Define variables del pipeline usando JSON Schema y valores por defecto.
# - Las variables deben tener un `default` para que los assets se rendericen sin `--var`.
# - En assets SQL/YAML: referenciar como `{{ var.mi_variable }}`.
# - En assets de Python: leer el JSON desde la variable de entorno `BRUIN_VARS`.
variables:
  # Define `taxi_types` como un array de strings con un valor por defecto razonable.
  taxi_types:
    type: array
    items:
      type: string
    default: ["yellow"]
```

Cabe destacar que:

* la fecha de inicio `start_date` es la que se usará cuando se lancen refrescos completos del flujo de datos,
* las `variables` pueden ser sobreescritas en tiempo de ejecución usando el argumento `--var`,
* en particular, la variable `taxi_types` permite controlar con qué tipos de taxi se lanzará el flujo.

### Capa de **ingestión**

De la ingestión se ocupará principalmente el fichero Python [pipeline/assets/ingestion/trips.py](pipelines/taxi-pipeline/pipeline/assets/ingestion/trips.py).