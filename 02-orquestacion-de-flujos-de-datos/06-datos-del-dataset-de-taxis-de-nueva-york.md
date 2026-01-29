# Orquestación de flujos de datos

## Caso práctico: Datos del _dataset_ de Taxis de Nueva York

* Ver el vídeo original (en inglés): [Load Data into Postgres with ETL](https://www.youtube.com/watch?v=Z9ZmmwtXDcU&feature=youtu.be)

En este artículo vamos a ver cómo implementar en Kestra el proceso de datos que escribimos en Python durante el primer módulo. A modo de recordatorio, se trataba de un proceso que se mueve datos de los archivos del [_dataset_ de Taxis de Nueva York](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page) a un servidor PostgreSQL.

Aunque el _dataset_ original está en formato Parquet, usaremos una [versión en formato CSV](https://github.com/DataTalksClub/nyc-tlc-data/releases) creada expresamente para el Zoomcamp.

## Entradas

Nuestro proceso de datos tendrá que ser capaz de trabajar tanto con datos de los [taxis amarillos](https://github.com/DataTalksClub/nyc-tlc-data/releases/tag/yellow), como con datos de los [taxis verdes](https://github.com/DataTalksClub/nyc-tlc-data/releases/tag/green). Además, querremos poder especificar para cada ejecución de qué año y mes nos descargaremos los datos. Para esto, usaremos las entradas de Kestra:

```yaml
inputs:
  - id: taxi
    type: SELECT
    displayName: Select taxi type
    values: [yellow, green]
    defaults: yellow

  - id: year
    type: SELECT
    displayName: Select year
    values: ["2019", "2020"]
    defaults: "2019"

  - id: month
    type: SELECT
    displayName: Select month
    values: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
    defaults: "01"
```

## Variables

Para hacernos la vida algo más sencilla, también definiremos algunas variables que nos permitirán usar las entradas de datos para, por ejemplo, determinar el nombre del fichero que nos vamos a descargar, o el nombre de la tabla de PostgreSQL en la que vamos a guardar los datos, por poner algunos ejemplos.

```yaml
variables:
  source: "https://github.com/DataTalksClub/nyc-tlc-data/releases/download"
  file: "{{ inputs.taxi }}_tripdata_{{ inputs.year }}-{{ inputs.month }}.csv"
  staging_table: "public.{{ inputs.taxi }}_tripdata_staging"
  table: "public.{{ inputs.taxi }}_tripdata"
  data: "{{ outputs.extract.outputFiles[inputs.taxi ~ '_tripdata_' ~ inputs.year ~ '-' ~ inputs.month ~ '.csv'] }}"
```

## Tareas

### Etiquetas

Como primera tarea, vamos a añadir etiquetas a la ejecución de nuestro flujo para que nos sea más sencillo identificarlas. Gracias a las etiquetas, podremos identificar cada ejecución sin necesidad de entrar a explorar sus logs, o las salidas de cada tarea.

```yaml
tasks:
  - id: set_label
    type: io.kestra.plugin.core.execution.Labels
    labels:
      file: "{{ render(vars.file) }}"
      taxi: "{{ inputs.taxi }}"
```

En el caso de la etiqueta **file**, que nos facilitará ver el nombre del fichero que ha sido importado, hemos hecho uso de `render` al usar la variable homónima. Esto es así porque, de otra manera, estaríamos usando un nombre de fichero que contendría literalmente las plantillas que hacen referencia a las entradas de datos, en lugar de contener el valor resultante de aplicar las plantillas.

### Extracción

Para descargar los datos de los archivos usaremos un tipo de tarea "comando shell", que nos permitirá escribir un comando **wget** de forma muy similar a como lo habríamos hecho desde una línea de comandos y pasar su salida a **gunzip** para descomprimirlos.

```yaml
  - id: extract
    type: io.kestra.plugin.scripts.shell.Commands
    outputFiles:
      - "*.csv"
    taskRunner:
      type: io.kestra.plugin.core.runner.Process
    commands:
      - wget -qO- {{ vars.source }}/{{ inputs.taxi }}/{{ render(vars.file) }}.gz | gunzip > {{ render(vars.file) }}
```

### Condiciones

Como nuestro proceso tendrá que gestionar, en ocasiones, datos de taxis amarillos y en ocasiones datos de taxis verdes, vamos a añadir un tipo de tarea especial de Kestra, las condiciones. Esquemáticamente, nuestro YAML va a quedar con esta estructura:

```yaml
- id: if_yellow_taxi
  type: io.kestra.plugin.core.flow.If
  condition: "{{inputs.taxi == 'yellow'}}"
  then:
    # Tareas específicas para los datos de taxis amarillos

- id: if_green_taxi
  type: io.kestra.plugin.core.flow.If
  condition: "{{inputs.taxi == 'green'}}"
  then:
    # Tareas específicas para los datos de taxis verdes
```

## Creaciones de tablas

Antes de poder importar datos de los ficheros, es conveniente que añadamos tareas a nuestro flujo que se aseguren de crear las tablas que necesitamos, en caso de que no existan. Esto facilitará el uso del flujo en entornos de pruebas, al no hacer necesario que las tablas existan previamente.

Sin embargo, antes de añadir estos pasos, vamos a hacer uso de algo que comentamos en artículos anteriores: los valores por defecto de plugins. Como vamos a estar usando múltiples tareas de tipo "consulta a un servidor PostgreSQL", va a resultarnos muy conveniente añadir los datos de la conexión que queremos que usen todas esas tareas como valores por defecto del correspondiente tipo de tarea.

```yaml
pluginDefaults:
  - type: io.kestra.plugin.jdbc.postgresql
    values:
      url: jdbc:postgresql://pgdatabase:5432/ny_taxi
      username: root
      password: root
```

Ahora sí, nuestras tareas de consultas de bases de datos van a quedar mucho más limpias y fáciles de leer. Por ejemplo, en caso de que estemos procesando un fichero de datos de taxis amarillos, lo primero que haremos es crear dos tablas: la tabla "final" de datos y la tabla de "staging", que contendrá temporalmente los datos del fichero que está siendo procesado antes de que los pasemos a la tabla "final", agregándolos con el resto de datos de taxis amarillos.

> [!NOTE]
> A partir de este punto, tendremos que implementar dos series de tareas casi idénticas para los datos de taxis amarillos y de taxis verdes. Para hacer la lección más simple, vamos a explicar cada paso únicamente para los datos de taxis amarillos pero recuerda que los taxis verdes seguirán pasos similares. Al final de este artículo puedes encontrar un enlace al fichero ya completo con la implementación del flujo de datos.

Esta es la estructura que tendrá la tabla "final" de taxis amarillos:

```sql
CREATE TABLE IF NOT EXISTS {{ render(vars.table) }} (
    unique_row_id          text,
    filename               text,
    VendorID               text,
    tpep_pickup_datetime   timestamp,
    tpep_dropoff_datetime  timestamp,
    passenger_count        integer,
    trip_distance          double precision,
    RatecodeID             text,
    store_and_fwd_flag     text,
    PULocationID           text,
    DOLocationID           text,
    payment_type           integer,
    fare_amount            double precision,
    extra                  double precision,
    mta_tax                double precision,
    tip_amount             double precision,
    tolls_amount           double precision,
    improvement_surcharge  double precision,
    total_amount           double precision,
    congestion_surcharge   double precision
);
```

Y esta es la estructura que tendrá la tabla de "staging" también de taxis amarillos:

```sql
CREATE TABLE IF NOT EXISTS {{ render(vars.staging_table) }} (
    unique_row_id          text,
    filename               text,
    VendorID               text,
    tpep_pickup_datetime   timestamp,
    tpep_dropoff_datetime  timestamp,
    passenger_count        integer,
    trip_distance          double precision,
    RatecodeID             text,
    store_and_fwd_flag     text,
    PULocationID           text,
    DOLocationID           text,
    payment_type           integer,
    fare_amount            double precision,
    extra                  double precision,
    mta_tax                double precision,
    tip_amount             double precision,
    tolls_amount           double precision,
    improvement_surcharge  double precision,
    total_amount           double precision,
    congestion_surcharge   double precision
);
```

De modo que estas serán las dos primeras tareas que añadiremos al caso que contemplamos anterior mente en nuestra tarea **if_yellow_taxi**

```yaml
- id: yellow_create_table
  type: io.kestra.plugin.jdbc.postgresql.Queries
  sql: |
    # Creación de la tabla "final" de datos de taxis amarillos

- id: yellow_create_staging_table
  type: io.kestra.plugin.jdbc.postgresql.Queries
  sql: |
    # Creación de la tabla "staging" de datos de taxis amarillos
```

### Borrado de datos previos

Cuando nuestro flujo se ejecute, querremos asegurarnos de que la tabla "staging" esté vacía. Esto es así porque aunque la primera vez que se ejecute el flujo de datos se creará la tabla y por lo tanto estará vacía, no podemos decir lo mismo de ejecuciones posteriores, que podrían encontrarse con que la tabla contiene datos. Una manera sencilla de gestionar esto es añadiendo a continuación un borrado de todos los registros de la tabla "staging".

```yaml
- id: yellow_truncate_staging_table
  type: io.kestra.plugin.jdbc.postgresql.Queries
  sql: |
    TRUNCATE TABLE {{ render(vars.staging_table) }};
```

### Importar los datos desde un CSV

Para rellenar la tabla de "staging" con los datos del CSV que nos descargamos con la tarea **extract**, podemos usar un tipo de tarea diseñado específicamente para esto. Configurar la tarea es tan sencillo como especificar el fichero desde que que queremos leer los datos, la tabla en la que queremos insertarlos y la lista de columnas que insertaremos.

```yaml
- id: yellow_copy_in_to_staging_table
  type: io.kestra.plugin.jdbc.postgresql.CopyIn
  format: CSV
  from: "{{ render(vars.data) }}"
  table: "{{ render(vars.staging_table) }}"
  header: true
  columns: [
    VendorID,
    tpep_pickup_datetime,
    tpep_dropoff_datetime,
    passenger_count,
    trip_distance,
    # ...
  ]
```

### Establecer un identificador y el nombre del fichero

Como paso final, antes de combinar los datos en la tabla "final", tenemos que asignar un identificador único a cada registro así como establecer el campo **fichero**, que nos permitirá más adelante saber de qué fichero fue extraído cada registro. Para lograrlo, lanzaremos una actualización de datos masiva sobre nuestra tabla "staging":

```yaml
- id: yellow_add_unique_id_and_filename
  type: io.kestra.plugin.jdbc.postgresql.Queries
  sql: |
    UPDATE {{ render(vars.staging_table) }}
    SET 
      unique_row_id = md5(
        COALESCE(CAST(VendorID AS text), '') ||
        COALESCE(CAST(tpep_pickup_datetime AS text), '') || 
        COALESCE(CAST(tpep_dropoff_datetime AS text), '') || 
        COALESCE(PULocationID, '') || 
        COALESCE(DOLocationID, '') || 
        COALESCE(CAST(fare_amount AS text), '') || 
        COALESCE(CAST(trip_distance AS text), '')      
      ),
      filename = '{{ render(vars.file) }}';
```

### Insertar los datos de "staging" en la tabla "final"

Por fin, nuestros datos de taxis amarillos están listos para ser combinados en la tabla final con datos de otros ficheros importados anteriormente.

```yaml
- id: yellow_merge_data
  type: io.kestra.plugin.jdbc.postgresql.Queries
  sql: |
    MERGE INTO {{render(vars.table)}} AS T
    USING {{render(vars.staging_table)}} AS S
    ON T.unique_row_id = S.unique_row_id
    WHEN NOT MATCHED THEN
      INSERT (
        unique_row_id, filename, VendorID, tpep_pickup_datetime, tpep_dropoff_datetime,
        passenger_count, trip_distance, RatecodeID, store_and_fwd_flag, PULocationID,
        DOLocationID, payment_type, fare_amount, extra, mta_tax, tip_amount, tolls_amount,
        improvement_surcharge, total_amount, congestion_surcharge
      )
      VALUES (
        S.unique_row_id, S.filename, S.VendorID, S.tpep_pickup_datetime, S.tpep_dropoff_datetime,
        S.passenger_count, S.trip_distance, S.RatecodeID, S.store_and_fwd_flag, S.PULocationID,
        S.DOLocationID, S.payment_type, S.fare_amount, S.extra, S.mta_tax, S.tip_amount, S.tolls_amount,
        S.improvement_surcharge, S.total_amount, S.congestion_surcharge
      );
```

### Eliminar ficheros creados durante la ejecución

Para cerrar nuestro proceso, añadiremos una última tarea que se ejecutará tanto para ejecuciones de datos de taxis amarillos y verdes, que eliminará los ficheros creados durante la ejecución:

```yaml
- id: purge_files
  type: io.kestra.plugin.core.storage.PurgeCurrentExecutionFiles
  description: This will remove output files. If you'd like to explore Kestra outputs, disable it.
```

## Resultado final

Una vez terminado, nuestro flujo de datos tendrá un aspecto similar al del fichero [04-postgresql-taxi.yaml](resources/flows/04-postgresql-taxi.yaml).
