# Visión general -- Plataforma de Datos End-to-End

Este tutorial práctico te guía en la construcción de un **pipeline completo de datos de NYC Taxi** desde cero usando Bruin, una herramienta CLI unificada para ingestión, transformación y calidad de datos.

Aprenderás a construir un pipeline ELT listo para producción que:

* **Ingesta** datos reales de viajes de NYC Taxi desde APIs públicas usando Python
* **Transforma** y limpia datos crudos con SQL, aplicando estrategias incrementales y deduplicación
* **Reporta** analítica agregada con controles de calidad integrados
* **Despliega** en infraestructura cloud (BigQuery)

Esta es una experiencia de aprendizaje práctica con asistencia de IA disponible mediante Bruin MCP. Sigue la sección del tutorial paso a paso a continuación.

## 🎯 Objetivos

* Entender cómo se estructuran los proyectos de Bruin (`pipeline/pipeline.yml` + `pipeline/assets/`)
* Usar **estrategias de materialización** de forma intencional (`append`, `time_interval`, etc.)
* Declarar **dependencias** y explorar el linaje (`bruin lineage`)
* Aplicar **metadatos** y **controles de calidad**
* Parametrizar ejecuciones con **variables del pipeline**

# Visión General - Plataforma de Datos de Extremo a Extremo

Este tutorial práctico te guía en la construcción de un **pipeline de datos completo con los taxis de Nueva York** desde cero usando Bruin—una herramienta CLI unificada para ingestión, transformación y calidad de datos.

Aprenderás a construir un pipeline ELT listo para producción que:
- **Ingiere** datos reales de viajes en taxi de Nueva York desde APIs públicas usando Python
- **Transforma** y limpia datos en bruto con SQL, aplicando estrategias incrementales y deduplicación
- **Reporta** analíticas agregadas con comprobaciones de calidad integradas
- **Despliega** en infraestructura en la nube (BigQuery)

Esta es una experiencia de aprendizaje práctico con asistencia de IA disponible a través de Bruin MCP. Sigue el tutorial detallado paso a paso que encontrarás más abajo.

## Objetivos de Aprendizaje

- Entender cómo se estructuran los proyectos Bruin (`pipeline/pipeline.yml` + `pipeline/assets/`)
- Usar **estrategias de materialización** de forma intencionada (append, time_interval, etc.)
- Declarar **dependencias** y explorar el linaje (`bruin lineage`)
- Aplicar **metadatos** (columnas, claves primarias, descripciones) y **comprobaciones de calidad**
- Parametrizar ejecuciones con **variables de pipeline**

## Esquema del Tutorial

- **Parte 1**: ¿Qué es una Plataforma de Datos? - Aprende sobre los componentes del stack de datos moderno y dónde encaja Bruin
- **Parte 2**: Configuración de tu Primer Proyecto Bruin - Instala Bruin, inicializa un proyecto y configura entornos
- **Parte 3**: Pipeline ELT de Extremo a Extremo con Taxis de Nueva York - Construye las capas de ingestión, staging y reporting con datos reales
- **Parte 4**: Ingeniería de Datos con Agente de IA - Usa Bruin MCP para construir pipelines con asistencia de IA
- **Parte 5**: Despliegue en BigQuery - Despliega tu pipeline local en Google BigQuery

## Estructura del Pipeline

La estructura sugerida separa la ingestión, el staging y el reporting, pero puedes organizar tu pipeline como prefieras.

Las partes obligatorias de un proyecto Bruin son:
- `.bruin.yml` en el directorio raíz
- `pipeline.yml` en el directorio `pipeline/` (o en el directorio raíz si mantienes todo en un único nivel)
- La carpeta `assets/` junto a `pipeline.yml`, que contiene tus archivos de activos Python, SQL y YAML

```text
claude-pipeline/
├── .bruin.yml                              # Entornos + conexiones (DuckDB local, BigQuery, etc.)
├── README.md                               # Objetivos de aprendizaje, flujo de trabajo, buenas prácticas
└── pipeline/
    ├── pipeline.yml                        # Nombre del pipeline, programación, variables
    └── assets/
        ├── ingestion/
        │   ├── trips.py                    # Ingestión en Python
        │   ├── requirements.txt            # Dependencias Python para la ingestión
        │   ├── payment_lookup.asset.yml    # Definición del activo seed
        │   └── payment_lookup.csv          # Datos seed
        ├── staging/
        │   └── trips.sql                   # Limpieza y transformación
        └── reports/
            └── trips_report.sql            # Agregación para analíticas
```

## 📦 Ubicación del proyecto

El proyecto comparte repositorio con más proyectos y notas sobre el Zoomcamp de ingeniería de datos de DataTalksClub. Su ubicación respecto a la raíz del proyecto Git es:

* `data-engineering-zoomcamp/05-plataformas-de-datos/pipelines/claude-pipeline`

El archivo de conexiones `.bruin.yml` se generará dentro de esa carpeta.

> [!WARNING]
> Bruin busca por defecto el archivo `.bruin.yml` en la raíz del repositorio Git, por lo que todos los comandos deben ejecutarse desde `claude-pipeline` especificando su ruta.

``` bash
--config-file .bruin.yml
```

# Tutorial Paso a Paso

Este módulo presenta Bruin como una plataforma de datos unificada que combina **ingestión de datos**, **transformación** y **calidad** en una única herramienta CLI. Construirás un pipeline de datos de extremo a extremo con los taxis de Nueva York desde cero.

> **Requisitos previos**: Familiaridad con SQL, Python básico y herramientas de línea de comandos. Haber trabajado previamente con conceptos de orquestación y transformación es útil, pero no imprescindible.

---

## Parte 1: ¿Qué es una Plataforma de Datos?

### Objetivos de Aprendizaje
- Entender qué es una plataforma de datos y por qué la necesitas
- Aprender cómo encaja Bruin en el stack de datos moderno
- Comprender las abstracciones principales de Bruin: activos, pipelines, entornos, conexiones

### 1.1 Componentes del Stack de Datos Moderno
- **Extracción/ingestión de datos**: Mover datos desde las fuentes a tu almacén de datos
- **Transformación de datos**: Limpiar, modelar y agregar datos (la "T" en ELT)
- **Orquestación de datos**: Programar y gestionar las ejecuciones del pipeline
- **Calidad/gobernanza de datos**: Garantizar la precisión y consistencia de los datos
- **Gestión de metadatos**: Rastrear linaje, propiedad y documentación

### 1.2 Dónde Encaja Bruin
- Bruin = ingestión + transformación + calidad + orquestación en una sola herramienta
- Gestiona la orquestación del pipeline de forma similar a Airflow (resolución de dependencias, programación, reintentos)
- "Qué pasaría si Airbyte, Airflow, dbt y Great Expectations tuvieran un hijo"
- Se ejecuta localmente, en máquinas virtuales o en CI/CD—sin dependencia de un proveedor concreto
- Código abierto con licencia Apache

### 1.3 Principios de Diseño de Bruin (Conclusiones Clave)
- Todo es texto versionable (sin configuraciones en UI ni bases de datos)
- Los pipelines reales usan múltiples tecnologías (SQL + Python + R)
- Combina fuentes y destinos en un único pipeline
- La calidad de los datos es un elemento de primera clase, no algo que se añade al final
- Ciclo de retroalimentación rápido: CLI ágil, desarrollo local

### 1.4 Conceptos Principales
- **Activo (Asset)**: Cualquier artefacto de datos que aporte valor (tabla, vista, archivo, modelo de ML, etc.)
- **Pipeline**: Un grupo de activos que se ejecutan juntos en orden de dependencia
- **Entorno (Environment)**: Un conjunto de configuraciones de conexión con nombre (p. ej., `default`, `production`) para que el mismo pipeline pueda ejecutarse localmente y en producción
- **Conexión (Connection)**: Credenciales para autenticarse con fuentes y destinos de datos externos
- **Ejecución de pipeline (Pipeline run)**: Una instancia de ejecución concreta con fechas y configuración específicas

---

## Parte 2: Configuración de tu Primer Proyecto Bruin

### Objetivos de Aprendizaje
- Instalar el CLI de Bruin
- Inicializar un proyecto a partir de una plantilla
- Entender la estructura de archivos del proyecto
- Configurar entornos y conexiones

### 2.1 Instalación
- Instala el CLI de Bruin: `curl -LsSf https://getbruin.com/install/cli | sh`
  - Verifica la instalación: `bruin version`

Si tu terminal muestra `To use the installed binaries, please restart the shell`, haz una de las siguientes cosas:
- **Reinicia tu terminal** (cierra y vuelve a abrirla) — la opción más sencilla y fiable
- **Recarga tu shell**:
  - `exec $SHELL -l` (funciona para la mayoría de shells)
  - zsh: `source ~/.zshrc`
  - bash: `source ~/.bashrc` (o `source ~/.bash_profile` en algunas configuraciones de macOS)
  - fish: `exec fish`

#### Extensión para el IDE (VS Code, Cursor, etc.)

Consulta la página de documentación para más detalles:
  - https://getbruin.com/docs/bruin/vscode-extension/overview
  - https://getbruin.com/docs/bruin/getting-started/features#vs-code-extension

1. Instala la **extensión Bruin para VS Code**:
   - Abre VS Code → Extensiones
   - Busca: "Bruin" (editor: bruin)
   - Instálala y recarga VS Code

2. Abre esta carpeta de plantilla y ejecútala desde el panel de Bruin:
   - Abre `pipeline/pipeline.yml` o cualquier archivo de activo en `pipeline/assets/`
   - Usa el panel de Bruin para ejecutar `validate`, `run` y ver el código renderizado
   - Para abrir el panel, haz clic en el logo de Bruin en la esquina superior derecha del archivo

3. Define los parámetros de ejecución al crear una ejecución:
   - **Fechas de inicio y fin** para ventanas incrementales
   - **Variables personalizadas** como `taxi_types=["yellow"]`

### 2.2 Inicialización del Proyecto
- Inicializa la plantilla zoomcamp: `bruin init zoomcamp my-pipeline`
- Explora la estructura generada:
  - `.bruin.yml` — configuración de entornos y conexiones
  - `pipeline/pipeline.yml` — nombre del pipeline, programación, variables
  - `pipeline/assets/` — donde viven tus activos SQL/Python
  - `pipeline/assets/**/requirements.txt` — dependencias Python (con alcance a la carpeta más cercana)

**Importante**: El CLI de Bruin requiere una carpeta inicializada con git (la usa para detectar la raíz del proyecto); `bruin init` inicializa git automáticamente si es necesario

### 2.3 Análisis en Profundidad de los Archivos de Configuración

#### `.bruin.yml`
- Define los entornos (p. ej., `default`, `production`)
- Contiene las credenciales de conexión (DuckDB, BigQuery, Snowflake, etc.)
- Se encuentra en la raíz del proyecto y **debe añadirse al .gitignore** porque contiene credenciales y secretos
  - `bruin init` lo añade automáticamente al `.gitignore`, pero compruébalo antes de hacer cualquier commit

#### `pipeline.yml`
- `name`: Identificador del pipeline (aparece en los logs y en la variable de entorno `BRUIN_PIPELINE`)
- `schedule`: Cuándo ejecutarlo (`daily`, `hourly`, `weekly` o una expresión cron)
- `start_date`: Fecha más antigua para los backfills
- `default_connections`: Mapeos de plataforma a conexión
- `variables`: Variables definidas por el usuario con validación JSON Schema

### 2.4 Conexiones
- Lista las conexiones: `bruin connections list`
- Añade una conexión: `bruin connections add`
- Comprueba la conectividad: `bruin connections ping <connection-name>`
- Las conexiones predeterminadas reducen la repetición entre activos

---

## Parte 3: Pipeline ELT de Extremo a Extremo con Taxis de Nueva York

### Objetivos de Aprendizaje
- Construir un pipeline ELT completo: ingestión → staging → reports
- Entender los tres tipos de activos: Python, SQL y Seed
- Aplicar estrategias de materialización para el procesamiento incremental
- Añadir comprobaciones de calidad y declarar dependencias

### 3.1 Arquitectura del Pipeline
- **Ingestión**: Extrae datos en bruto de fuentes externas (activos Python, CSVs seed)
- **Staging**: Limpia, normaliza, deduplica y enriquece (activos SQL)
- **Reports**: Agrega para dashboards y analíticas (activos SQL)
- Los activos forman un DAG—Bruin los ejecuta en orden de dependencia

### 3.2 Capa de Ingestión
- Activo Python para obtener datos de taxis de Nueva York desde el endpoint público de TLC
- Activo seed para cargar una tabla de búsqueda estática de tipos de pago desde CSV
- Usa la estrategia `append` para la ingestión en bruto (gestiona los duplicados en capas posteriores)
- Sigue las instrucciones TODO en `pipeline/assets/ingestion/trips.py` y `pipeline/assets/ingestion/payment_lookup.asset.yml`

### 3.3 Capa de Staging
- Activo SQL para limpiar, deduplicar y unir con la tabla de búsqueda para enriquecer los datos de viajes en bruto
- Usa la estrategia `time_interval` para el procesamiento incremental
- Sigue las instrucciones TODO en `pipeline/assets/staging/trips.sql`

### 3.4 Capa de Reports
- Activo SQL para agregar los datos de staging en métricas listas para analíticas
- Usa la estrategia `time_interval` y el mismo `incremental_key` que en staging para mantener la consistencia
- Sigue las instrucciones TODO en `pipeline/assets/reports/trips_report.sql`

### 3.5 Ejecución y Validación

Documentación de comandos CLI: https://getbruin.com/docs/bruin/commands/run

```bash
# Abre una sesión shell en el directorio
cd claude-pipeline

# Valida la estructura y las definiciones
bruin validate \
    --environment default \
    --config-file .bruin.yml \
    ./pipeline/pipeline.yml

# Consejo para la primera ejecución:
# Usa --full-refresh para crear/reemplazar tablas desde cero (útil con un archivo DuckDB nuevo).
bruin run \
    --environment default \
    --config-file .bruin.yml \
    --full-refresh \
    ./pipeline/pipeline.yml

# Ejecuta un activo de ingestión y luego los activos descendentes (para pruebas incrementales)
bruin run ./pipeline/assets/ingestion/trips.py \
    --environment default \
    --config-file .bruin.yml \
    --start-date 2021-01-01 \
    --end-date 2021-01-31 \
    --var taxi_types='["yellow"]' \
    --downstream

# Consulta tus tablas usando `bruin query`
# Docs: https://getbruin.com/docs/bruin/commands/query
bruin query \
    --connection duckdb-default \
    --config-file .bruin.yml \
    --query "SELECT COUNT(*) FROM ingestion.trips"

# Abre la interfaz de DuckDB (útil para explorar tablas de forma interactiva)
# Requiere el CLI de DuckDB instalado localmente.
duckdb duckdb.db -ui

# Comprueba el linaje para entender las dependencias entre activos
bruin lineage ./pipeline/pipeline.yml
```

---

## Parte 4: Ingeniería de Datos con Agente de IA

### Objetivos de Aprendizaje
- Configurar Bruin MCP para extender los asistentes de IA con el contexto de Bruin
- Usar un agente de IA para construir el pipeline completo de extremo a extremo
- Aprovechar la IA para buscar documentación, generar código y ejecutar pipelines

### 4.1 ¿Qué es Bruin MCP?
- MCP (Model Context Protocol) conecta los asistentes de IA con las capacidades de Bruin
- La IA accede a la documentación de Bruin, sus comandos y el contexto de tu pipeline
- Compatible con Cursor, Claude Code y otras herramientas compatibles con MCP

### 4.2 Configuración de Bruin MCP

**Cursor IDE:**
- Ve a Configuración de Cursor → MCP & Integrations → Add Custom MCP
- Añade la configuración del servidor Bruin MCP:
  ```json
  {
    "mcpServers": {
      "bruin": {
        "command": "bruin",
        "args": ["mcp"]
      }
    }
  }
  ```

**Claude Code:**
```bash
claude mcp add bruin -- bruin mcp
```

Documentación de Bruin MCP: https://getbruin.com/docs/bruin/getting-started/bruin-mcp

### 4.3 Construyendo el Pipeline con IA
- Pide a la IA que ayude a configurar `.bruin.yml` y `pipeline.yml`
- Solicita el scaffolding de activos: "Crea un activo de ingestión Python para los datos de taxis de Nueva York"
- Obtén ayuda con la materialización: "¿Qué estrategia debería usar para cargas incrementales?"
- Depura problemas: "¿Por qué falla mi comprobación de calidad?"
- Ejecuta comandos: "Ejecuta el activo staging.trips con --full-refresh"

### 4.4 Ejemplos de Prompts

**Preguntas sobre la documentación de Bruin:**
- "¿Cómo creo una conexión DuckDB en Bruin?"
- "¿Qué hace la estrategia de materialización time_interval?"
- "¿Qué estrategias de materialización admite Bruin?"

**Comandos para construir o modificar el pipeline:**
- "Escribe un activo Python que obtenga datos de este endpoint de la API"
- "Genera el SQL para deduplicar viajes usando una clave compuesta"
- "Añade una comprobación de calidad not_null a la columna pickup_datetime"

**Comandos para probar y validar el pipeline:**
- "Valida el pipeline completo"
- "Ejecuta el activo staging.trips con --full-refresh"
- "Comprueba el linaje de mi activo reports.trips_report"

**Comandos para consultar y analizar los datos:**
- "Ejecuta una consulta para mostrar el recuento de filas de todas mis tablas"
- "Consulta la tabla de reports para mostrar los 10 principales tipos de pago por número de viajes"
- "Muéstrame el esquema de datos de staging.trips"

### 4.5 Flujo de Trabajo Asistido por IA
- Empieza por la configuración: deja que la IA ayude a configurar `.bruin.yml` y `pipeline.yml`
- Construye de forma incremental: crea un activo a la vez, valida, ejecuta e itera
- Usa la IA para la documentación: pregunta sobre las funcionalidades de Bruin en lugar de buscar en los docs
- Depura en conjunto: comparte los mensajes de error y deja que la IA sugiera soluciones
- Aprende haciendo: haz preguntas del tipo "¿por qué?" para entender los conceptos de Bruin

Ejemplo de prompt para crear el pipeline completo de extremo a extremo y probarlo:

```text
Build an end-to-end NYC Taxi data pipeline using Bruin.

Start with running `bruin init zoomcamp` to initialize the project.

## Context
- Project folder: @zoomcamp/pipeline
- Reference docs: @zoomcamp/README.md
- Use Bruin MCP tools for documentation lookup and command execution

## Instructions

### 1. Configuration (do this first)
- Create `.bruin.yml` with a DuckDB connection named `duckdb-default`
- Configure `pipeline.yml`: set name, schedule (monthly), start_date, default_connections, and the `taxi_types` variable (array of strings)

### 2. Build Assets (follow TODOs in each file)

NYC Taxi Raw Trip Source Details:
- **URL**: `https://d37ci6vzurychx.cloudfront.net/trip-data/`
- **Format**: Parquet files, one per taxi type per month
- **Naming**: `<taxi_type>_tripdata_<year>-<month>.parquet`
- **Examples**:
  - `yellow_tripdata_2022-03.parquet`
  - `green_tripdata_2025-01.parquet`
- **Taxi Types**: `yellow` (default), `green`

Build in this order, validating each with `bruin validate` before moving on:

a) **pipeline/assets/ingestion/payment_lookup.asset.yml** - Seed asset to load CSV lookup table
b) **pipeline/assets/ingestion/trips.py** - Python asset to fetch NYC taxi parquet data from TLC endpoint
   - Use `taxi_types` variable and date range from BRUIN_START_DATE/BRUIN_END_DATE
   - Add requirements.txt with: pandas, requests, pyarrow, python-dateutil
   - Keep the data in its rawest format without any cleaning or transformations
c) **pipeline/assets/staging/trips.sql** - SQL asset to clean, deduplicate (ROW_NUMBER), and enrich with payment lookup
   - Use `time_interval` strategy with `pickup_datetime` as incremental_key
d) **pipeline/assets/reports/trips_report.sql** - SQL asset to aggregate by date, taxi_type, payment_type
   - Use `time_interval` strategy for consistency

### 3. Validate & Run
- Validate entire pipeline: `bruin validate ./pipeline/pipeline.yml`
- Run with: `bruin run ./pipeline/pipeline.yml --full-refresh --start-date 2022-01-01 --end-date 2022-02-01`
- For faster testing, use `--var 'taxi_types=["yellow"]'` (skip green taxis)

### 4. Verify Results
- Check row counts across all tables
- Query the reports table to confirm aggregations look correct
- Verify all quality checks passed (24 checks expected)
```

---

## Parte 5: Despliegue en BigQuery

Esta parte toma lo que construiste localmente y lo ejecuta en **Google BigQuery**.

> **Nota sobre dialectos SQL**: El SQL de BigQuery no es idéntico al de DuckDB. La estructura de tu pipeline se mantiene igual, pero puede que necesites actualizar la sintaxis SQL y los tipos de datos al cambiar de motor.

### 5.1 Crear un Proyecto GCP + Conjuntos de Datos en BigQuery
1. Crea (o selecciona) un proyecto GCP y activa la API de BigQuery
2. Crea conjuntos de datos que coincidan con los schemas de tus activos (recomendado para este módulo):
   - `ingestion`
   - `staging`
   - `reports`

### 5.2 Crear Credenciales (Elige una Opción)
- **Opción A (recomendada para desarrollo local)**: Credenciales Predeterminadas de Aplicación (ADC)
  - Instala gcloud y autentícate: `gcloud auth application-default login`
- **Opción B**: JSON de cuenta de servicio (para CI/CD)
  - Crea una cuenta de servicio con permisos de BigQuery y descarga la clave JSON

### 5.3 Añadir la Conexión a `.bruin.yml`
```yaml
environments:
  default:
    connections:
      google_cloud_platform:
        - name: "gcp-default"
          project_id: "your-gcp-project-id"
          location: "US" # o "EU", o tu región
          # Opciones de autenticación (elige una):
          use_application_default_credentials: true
          # service_account_file: "/path/to/service-account.json"
          # service_account_json: |
          #   { "type": "service_account", ... }
```

### 5.4 Actualizar el Pipeline y los Activos
- En `pipeline/pipeline.yml`: cambia `default_connections.duckdb` → `default_connections.bigquery`
  - Ejemplo: `duckdb: duckdb-default` → `bigquery: gcp-default`
- En los activos SQL: cambia el `type` a BigQuery:
  - `duckdb.sql` → `bq.sql`
- En los activos seed: cambia el `type` a BigQuery:
  - `duckdb.seed` → `bq.seed`
- En los activos Python que usan materialización: establece/actualiza `connection:` a `gcp-default`
- Corrige cualquier problema de dialecto SQL:
  - Los tipos de datos pueden diferir (p. ej., `INTEGER` vs `INT64`, manejo de timestamps, comillas)
  - Algunas funciones/operadores pueden requerir un equivalente en BigQuery

Documentación:
- Plataforma BigQuery: https://getbruin.com/docs/bruin/platforms/bigquery
- Backend de secretos `.bruin.yml`: https://getbruin.com/docs/bruin/secrets/bruinyml

---

## Referencia de Comandos Principales

| Comando | Propósito |
|---------|-----------|
| `bruin init <template> <folder>` | Inicializa un nuevo proyecto |
| `bruin validate <path>` | Valida la estructura del pipeline/activo |
| `bruin run <path>` | Ejecuta el pipeline o el activo |
| `bruin run --downstream` | Ejecuta el activo y todos los activos descendentes |
| `bruin run --full-refresh` | Trunca y reconstruye desde cero |
| `bruin run --only checks` | Ejecuta las comprobaciones de calidad sin ejecutar el activo |
| `bruin query --connection <conn> --query "..."` | Ejecuta consultas ad-hoc |
| `bruin lineage <path>` | Visualiza las dependencias entre activos |
| `bruin render <path>` | Muestra la salida de la plantilla renderizada |
| `bruin format <path>` | Formatea el código |
| `bruin connections list` | Lista las conexiones configuradas |
| `bruin connections ping <n>` | Comprueba la conectividad de una conexión |

---

## Buenas Prácticas y Consejos

### Elegir el `incremental_key` Correcto

Al usar la estrategia `time_interval`, el `incremental_key` determina qué filas se eliminan y se reinsertan en cada ejecución.

**Principios clave:**
1. **Usa la misma clave en todos los activos** — Si staging usa `pickup_datetime` como clave incremental, reports también debería hacerlo. Esto asegura que los datos fluyan de forma consistente a través del pipeline.

2. **Adapta la clave a tu lógica de extracción de datos** — En este ejemplo, los archivos de datos de taxis de Nueva York están organizados por mes según el inicio del viaje. Como cada archivo contiene viajes cuyo `pickup_datetime` cae en ese mes, `pickup_datetime` es la clave incremental natural.

3. **La clave debe ser inmutable** — Una vez que se extrae una fila, el valor de su clave incremental no debería cambiar. Los timestamps de eventos (como `pickup_datetime`) son mejores que los timestamps de procesamiento por esta razón.

### Estrategia de Deduplicación

Como los datos de taxis no tienen un ID único por fila, necesitarás una **clave compuesta** para la deduplicación:

- Combina columnas que juntas identifiquen un viaje único
- Ejemplo: `(pickup_datetime, dropoff_datetime, pickup_location_id, dropoff_location_id, fare_amount)`
- Usa estas columnas con `primary_key: true` en las definiciones de tus columnas
- En SQL, deduplica usando `ROW_NUMBER()` o `QUALIFY` para conservar un registro por clave compuesta

### Desarrollo con Calidad desde el Principio

- Añade comprobaciones desde el inicio, no como algo que se añade al final
- Usa las comprobaciones integradas: `not_null`, `unique`, `positive`, `non_negative`, `accepted_values`
- Añade comprobaciones personalizadas para invariantes específicos del negocio

### Organización del Proyecto

- Mantén los activos en `pipeline/assets/`
- Usa schemas para organizar las capas: `ingestion.`, `staging.`, `reports.`
- Coloca el SQL que no sea de activos en carpetas separadas (`/analyses`, `/queries`)

### Desarrollo Local

- Valida siempre antes de ejecutar: `bruin validate ./pipeline/pipeline.yml`
- Usa `--full-refresh` para las primeras ejecuciones en bases de datos nuevas
- Consulta las tablas directamente para verificar los resultados: `bruin query --connection duckdb-default --query "..."`
- Comprueba el linaje para entender el impacto de los cambios: `bruin lineage <asset>`