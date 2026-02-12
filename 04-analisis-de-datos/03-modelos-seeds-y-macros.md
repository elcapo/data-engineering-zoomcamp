# Análisis de datos

## Modelos `dbt`

* Vídeo original (en inglés): [dbt Models](https://www.youtube.com/watch?v=JQYz-8sl1aQ)

Hasta ahora hemos visto cómo crear un proyecto **dbt** (tanto en su versión **dbt Code** como **dbt Cloud**) y cómo crear nuestras primeras fuentes de datos. En las fases del proyecto que vamos a ver a partir de ahora, vamos a necesitar entender muy bien la lógica que hay detrás de los datos con los que estamos trabajando. En un caso real, a partir de este momento tendríamos que empezar a hablar de forma contínua con las personas responsables del "negocio".

### Modelos `mart`

Durante la sesión anterior vimos cómo crear nuestras primeras fuentes en **dbt** y creamos dos modelos, [staging_green_tripdata](pipeline/nytaxi/models/staging/staging_green_tripdata.sql) y [staging_yellow_tripdata](pipeline/nytaxi/models/staging/staging_yellow_tripdata.sql). Durante esa sesión también explicamos que el paso natural que siguen nuestros datos en un proyecto **dbt** tras `staging` es `intermediate`. Sin embargo, vamos a seguir una metodología cuyo orden de implementación es diferente es del orden que siguen los datos.

Antes de saber de qué manera transformaremos nuestros modelos fuente, resulta útil que pensemos en cómo vamos a querer consumirlos. ¿Qué consultas vamos a querer ejecutar sobre ellos? ¿Qué métricas querremos observar? ¿Qué criterios querremos usar para agruparlas? ¿Y ordenarlas? Responder a estas preguntas primero nos ayudará a, más adelante, saber exactamente qué transformaciones necesitaremos implementar en la capa `intermediate`.

> [!NOTE]
>
> Un ejemplo de respuesta que podríamos ir anticipando ya, es que querremos poder consultar los ingresos mensuales por ubicación, de manera que crearemos un [models/marts/reporting/monthly_revenue_per_locations.sql](pipeline/nytaxi/models/marts/reporting/monthly_revenue_per_locations.sql).
>
> Por el momento crearemos el fichero vacío, a modo de recordatorio de lo que queremos hacer.

#### Esquema estrella

Volviendo al esquema estrella que también mencionamos en las sesiones anteriores de este mismo módulo, los dos tipos de entidades que tenemos que tener en mente a la hora de estructurar nuestros `marts` son:

- las tablas de hechos: trips,
- las tablas de dimensiones: vendors, locations, etc.

> [!NOTE]
>
> Algunos ejemplos de modelos que podríamos ir anticipando son:
>
> - [models/marts/dimension_vendors.sql](pipeline/nytaxi/models/marts/dimension_vendors.sql)
> - [models/marts/dimension_zones.sql](pipeline/nytaxi/models/marts/dimension_zones.sql)
> - [models/marts/facts_trips.sql](pipeline/nytaxi/models/marts/fact_trips.sql)
>
> Por el momento también crearemos estos ficheros vacíos, a modo de recordatorio de lo que queremos hacer.

### Modelos `intermediate`

Aunque aún no hemos empezado a implementar ninguno de nuestros `marts`, nuestra metodología nos ha permitido anticipar algunas necesidades. Por ejemplo, sabiendo que vamos a querer trabajar con una tabla de hechos para los trayectos (trips), nos da a entender que necesitaremos un paso de preparación de datos previo a nuestros `marts`, que unifique los trayectos de taxis verdes y amarillos.

Para esto, crearemos un [models/intermediate/intermediate_trips_union.sql](pipeline/nytaxi/models/intermediate/intermediate_trips_union.sql):

```sql
WITH green_tripdata AS (
    SELECT * FROM {{ ref('staging_green_tripdata') }}
),
yellow_tripdata AS (
    SELECT * FROM {{ ref('staging_yellow_tripdata') }}
),
trips_unioned AS (
    SELECT * FROM green_tripdata
    UNION ALL
    SELECT * FROM yellow_tripdata
)
SELECT * FROM trips_unioned
```

Para que esto funcione correctamente tenemos que ajustar nuestros modelos para que tengas columnas idénticas en número, nombre y tipos. Para eso, agregamos algunas columnas al modelo de `staging` de taxis amarillos que solo están presentes en los taxis verdes:

```sql
1 AS trip_type, -- Los taxis amarillos no pueden ser reservados
0 AS enhail_fee, -- Esta tasa no aplica a los taxis amarillos
```

Ahora, antes de poder lanzar nuestra consulta intermedia de unión de trayectos, tenemos que lanzar:

```bash
cd nytaxi
uv run dbt run
```

Que debería de generar algo parecido a:

```
19:27:18  Running with dbt=1.11.4
19:27:20  Registered adapter: duckdb=1.10.0
19:27:21  Found 7 models, 1 seed, 2 sources, 472 macros
19:27:21  
19:27:21  Concurrency: 1 threads (target='dev')
19:27:21  
19:27:21  1 of 5 START sql view model dev.dimension_vendors .............................. [RUN]
19:27:22  1 of 5 OK created sql view model dev.dimension_vendors ......................... [OK in 0.30s]
19:27:22  2 of 5 START sql view model dev.dimension_zones ................................ [RUN]
19:27:22  2 of 5 OK created sql view model dev.dimension_zones ........................... [OK in 0.12s]
19:27:22  3 of 5 START sql view model dev.staging_green_tripdata ......................... [RUN]
19:27:22  3 of 5 OK created sql view model dev.staging_green_tripdata .................... [OK in 0.25s]
19:27:22  4 of 5 START sql view model dev.staging_yellow_tripdata ........................ [RUN]
19:27:22  4 of 5 OK created sql view model dev.staging_yellow_tripdata ................... [OK in 0.11s]
19:27:22  5 of 5 START sql view model dev.intermediate_trips_unioned ..................... [RUN]
19:27:22  5 of 5 OK created sql view model dev.intermediate_trips_unioned ................ [OK in 0.11s]
19:27:22  
19:27:22  Finished running 5 view models in 0 hours 0 minutes and 1.39 seconds (1.39s).
19:27:22  
19:27:22  Completed successfully
19:27:22  
19:27:22  Done. PASS=5 WARN=0 ERROR=0 SKIP=0 NO-OP=0 TOTAL=5
```

## Seeds y macros

* Vídeo original (en inglés): [Seeds and Macros](https://www.youtube.com/watch?v=lT4fmTDEqVk)

Para poder alimentar nuestras tablas de dimensiones de vendedores y ubicaciones, vamos a examinar varias de las opciones que ofrece **dbt**.

### Seeds

Una manera rápida de hacer disponibles las localizaciones, es descargarlas en formato CSV en la carpeta `seeds`: [seeds/taxi_zone_lookup.csv](pipeline/nytaxi/seeds/taxi_zone_lookup.csv) y luego lanzar:

```bash
uv run dbt seed
```

Que debería de generar algo parecido a:

```
19:27:48  Running with dbt=1.11.4
19:27:49  Registered adapter: duckdb=1.10.0
19:27:51  Found 7 models, 1 seed, 2 sources, 472 macros
19:27:51  
19:27:51  Concurrency: 1 threads (target='dev')
19:27:51  
19:27:51  1 of 1 START seed file dev.taxi_zone_lookup .................................... [RUN]
19:27:51  1 of 1 OK loaded seed file dev.taxi_zone_lookup ................................ [INSERT 265 in 0.27s]
19:27:51  
19:27:51  Finished running 1 seed in 0 hours 0 minutes and 0.72 seconds (0.72s).
19:27:52  
19:27:52  Completed successfully
19:27:52  
19:27:52  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 TOTAL=1
```

> [!WARNING]
>
> Si nuestra tabla fuese grande, o previésemos que va a cambiar mucho, este método no sería conveniente, dado que implica subir ficheros a nuestro repositorio Git. Por el mismo motivo, es importante no usar esta técnica para ingerir datos confidenciales.

Ahora, podremos usar `taxi_zone_lookup` como un modelo más de nuestro proyecto. Así que aprovechémoslo para implementar la tabla de la dimensión de localizaciones:

```sql
WITH taxi_zone_lookup AS (
    SELECT * FROM {{ ref('taxi_zone_lookup') }}
),
renamed AS (
    SELECT
        locationid AS location_id,
        borough AS borough,
        zone AS zone,
        service_zone
    FROM taxi_zone_lookup
)
SELECT * FROM renamed
```

### Macros

En cuanto a los vendedores, no disponemos de una tabla y hay únicamente tres valores (uno de ellos es "desconocido"), así que en muchos casos podríamos optar por añadir un `CASE` a nuestra consulta SQL de la dimensión de vendedores:

```sql
SELECT
    DISTINCT vendor_id,
    CASE
        WHEN vendor_id = 1 THEN 'Creative Mobile Technologies'
        WHEN vendor_id = 2 THEN 'VeriFone Inc.'
        WHEN vendor_id = 4 THEN 'Unknown/Other'
    END AS vendor_name
FROM {{ ref('intermediate_trips_unioned') }}
```

Sin embargo, este enfoque generaría problemas sobre todo porque para mantener estos datos tendríamos que añadir, modificar y eliminar líneas en nuestra consulta SQL. Para evitarlo, **dbt** ofrece otro tipo de entidad interesante: las macros. Vamos a verlo con un ejemplo: [macros/get_vendor_names.sql](pipeline/nytaxi/macros/get_vendor_names.sql).

```sql
{% macro get_vendor_names(vendor_id) -%}
CASE
    WHEN {{ vendor_id }} = 1 THEN 'Creative Mobile Technologies'
    WHEN {{ vendor_id }} = 2 THEN 'VeriFone Inc.'
    WHEN {{ vendor_id }} = 4 THEN 'Unknown/Other'
END
{%- endmacro %}
```

Para ver cómo usaríamos esta macro desde un ejemplo práctico, vamos a escribir nuestra versión final de la consulta para generar el modelo de la dimensión de vendedores:

```sql
WITH trips_unioned AS (
    SELECT * FROM {{ ref('intermediate_trips_unioned') }}
),
vendors AS (
    SELECT
        DISTINCT vendor_id,
        {{ get_vendor_names('vendor_id') }} AS vendor_name
    FROM trips_unioned
)
SELECT * FROM vendors
```