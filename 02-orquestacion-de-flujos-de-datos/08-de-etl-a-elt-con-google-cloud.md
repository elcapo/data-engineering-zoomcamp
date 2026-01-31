# Orquestación de flujos de datos

## De ETL a ELT con Google Cloud

* Vídeo original (en inglés): [ETL vs ELT](https://www.youtube.com/watch?v=E04yurp1tSU)

En esta sesión vamos a implementar un proceso similar al que implementamos en capítulos anteriores, solo que con un cambio de arquitectura en nuestro flujo.

Hasta ahora, nuestro flujo seguía un esquema ETL:

* **Extracción**: descarga de los ficheros de datos y decompresión para obtener los CSV guardando sus datos en una tabla de "staging",
* **Transformación**: adición de una clave única y de una columna que permita identificar el fichero del que viene cada registro,
* **Carga**: inserción en una tabla "final" de nuestro servidor PostgreSQL local.

> [!NOTE]
> ETL son las siglas, en inglés, correspondientes a **E**xtract, **T**ransform y **L**oad.

En esta sesión optaremos por un esquema ELT, en el que el orden de los pasos cambia:

* **Extracción**: descarga de los ficheros de datos y decompresión para obtener los CSV guardándolos esta vez sin transformar,
* **Carga**: en Google Cloud Buckets (que será nuestro _lago de datos_) sin modificar los ficheros,
* **Transformación** transformación de datos "al vuelo" usando BigQuery.

Gracias a este enfoque:

* Mantendremos los costes controlados, porque los datos descargados sin modificar estarán en nuestro _lago de datos_ (una forma económica de almacenamiento en la nube).
* Podremos decidir a posteriori qué transformaciones realizar, de forma que será más sencillo realizar distintos análisis sobre los datos.

## Configurar Google Cloud y BigQuery

* Vídeo original (en inglés): [Setting up Google Cloud and BigQuery](https://www.youtube.com/watch?v=TLGFAOHpOYM&pp=ugUEEgJlbg%3D%3D)

### Credenciales

Asumiendo que ya tenemos una cuenta en Google Cloud, necesitaremos descargarnos las credenciales (en formato JSON) de una cuenta con acceso al proyecto en el que estaremos trabajando. Una vez tengamos el fichero, podremos ir al directorio en el que tenemos nuestro [docker-compose.yml](pipeline/docker-compose.yml) y añadir las credenciales a nuestras variables de entorno con:

```bash
# Asumiendo que nuestras credenciales están en `service-account.json`
echo SECRET_GCP_SERVICE_ACCOUNT=$(cat service-account.json | base64 -w 0) >> .env
```

También tendremos que asegurarnos de hacer `SERVICE_GCP_SERVICE_ACCOUNT` accesible como variable de entorno desde nuestro contenedor **kestra**. Una manera de conseguirlo es mediante la clave **environment** de nuestro servicio:

```yaml
kestra:
  environment:
    SECRET_GCP_SERVICE_ACCOUNT: ${SECRET_GCP_SERVICE_ACCOUNT}
```

### Otras variables

Para hacer referencia a otras variables sobre nuestra cuenta Google Cloud, definiremos cuatro pares de clave y valor:

| **Clave** | **Valor** (ejemplo) |
| --- | --- |
| GCP_BUCKET_NAME | newyork-taxi |
| GCP_DATASET | zoomcamp |
| GCP_LOCATION | europe-west1 |
| GCP_PROJECT_ID | zoomcamp-ingenieria-datos |

Para agilizar esta tarea, puedes usar un flujo que crea por ti estos pares de clave y valor: [06-gcp-key-value-pairs](resources/flows/06-gcp-key-value-pairs).

### Creación de recursos desde Kestra

Aunque podemos crear nuestro **bucket** de Cloud Storage y nuestro **dataset** de BigQuery a mano, Kestra dispone de tareas que nos pueden facilitar la gestión:

```yaml
id: 07_gcp_setup
namespace: zoomcamp

tasks:
  - id: create_gcs_bucket
    type: io.kestra.plugin.gcp.gcs.CreateBucket
    ifExists: SKIP
    storageClass: REGIONAL
    name: "{{ kv('GCP_BUCKET_NAME') }}"

  - id: create_bq_dataset
    type: io.kestra.plugin.gcp.bigquery.CreateDataset
    name: "{{ kv('GCP_DATASET') }}"
    ifExists: SKIP

pluginDefaults:
  - type: io.kestra.plugin.gcp
    values:
      serviceAccount: "{{ secret('GCP_SERVICE_ACCOUNT') }}"
      projectId: "{{ kv('GCP_PROJECT_ID') }}"
      location: "{{ kv('GCP_LOCATION') }}"
      bucket: "{{ kv('GCP_BUCKET_NAME') }}"
```

## Carga de datos

* Vídeo original (en inglés): [Load Data into BigQuery](https://www.youtube.com/watch?v=52u9X_bfTAo)

Por fin, vamos a crear una versión de nuestro flujo de datos que aproveche las ventajas del trabajo en la nube con un esquema ELT. Para empezar, vamos a crear un flujo que pida los datos del _dataset_, año y mes a procesar. Más adelante, lo ampliaremos para poder programarlo y lanzar rellenos de datos históricos como hicimos en la sesión anterior.

### Entradas

En cuanto a las entradas de datos que usaremos, serán similares a las que ya definimos cuando implementamos [nuestra versión ETL del flujo](06-datos-del-dataset-de-taxis-de-nueva-york.md):

```yaml
inputs:
  - id: taxi
    type: SELECT
    displayName: Select taxi type
    values: [yellow, green]
    defaults: green

  - id: year
    type: SELECT
    displayName: Select year
    values: ["2019", "2020"]
    defaults: "2019"
    allowCustomValue: true # allows you to type 2021 from the UI for the homework 🤗

  - id: month
    type: SELECT
    displayName: Select month
    values: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
    defaults: "01"
```

### Variables

En cuanto a las variables, esta vez nos será útil poder referirnos al bucket, por lo que definiremos una nueva variable **gcs_file**:

```yaml
variables:
  source: "https://github.com/DataTalksClub/nyc-tlc-data/releases/download"
  file: "{{ inputs.taxi }}_tripdata_{{ inputs.year }}-{{ inputs.month }}.csv"
  gcs_file: "gs://{{ kv('GCP_BUCKET_NAME') }}/{{ vars.file }}"
  table: "{{ kv('GCP_DATASET') }}.{{ inputs.taxi }}_tripdata_{{ inputs.year }}_{{ inputs.month }}"
  data: "{{ outputs.extract.outputFiles[inputs.taxi ~ '_tripdata_' ~ inputs.year ~ '-' ~ inputs.month ~ '.csv'] }}"
```

### Tareas

#### Etiquetas

La primera tarea de nuestro nuevo flujo será idéntica a la que ya usamos en nuestros flujos anteriores. Su propósito será etiquetar las ejecuciones para facilitar su control.

```yaml
tasks:
  - id: set_label
    type: io.kestra.plugin.core.execution.Labels
    labels:
      file: "{{ render(vars.file) }}"
      taxi: "{{ inputs.taxi }}"
```

#### Extracción

La segunda tarea también será similar a la que usamos en versiones anteriores del flujo para descargar y descomprimir los ficheros.

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

#### Subida de ficheros al **bucket**

La primera diferencia se encontrará en nuestra tercera tarea. En este caso, añadiremos una tarea cuyo cometido será subir los ficheros descargados a nuestro _lago de datos_ en Google Cloud.

```yaml
- id: upload_to_gcs
  type: io.kestra.plugin.gcp.gcs.Upload
  from: "{{ render(vars.data) }}"
  to: "{{ render(vars.gcs_file) }}"
```

Como esta y la mayoría de las tareas de conformarán este flujo compartirán datos de conexión, hemos decidido extraerlos a una sección de valores por defecto de plugins.

```yaml
pluginDefaults:
  - type: io.kestra.plugin.gcp
    values:
      serviceAccount: "{{ secret('GCP_SERVICE_ACCOUNT') }}"
      projectId: "{{ kv('GCP_PROJECT_ID') }}"
      location: "{{ kv('GCP_LOCATION') }}"
      bucket: "{{ kv('GCP_BUCKET_NAME') }}"
```

#### Ramificación por **dataset**

A continuación, nuestro flujo se abrirá en dos ramas diferentes, una para cada conjunto de datos: el de datos de taxis amarillos y el de datos de taxis verdes. Como ambas ramas son muy parecidas, en este documento nos centraremos en la taxis amarillos. De la ramificación se encargará una tarea de tipo flujo:

```yaml
- id: if_yellow_taxi
  type: io.kestra.plugin.core.flow.If
  condition: "{{inputs.taxi == 'yellow'}}"
  then:
    # Tareas que solo se ejecutarán para datasets de taxis amarillos
```

##### Creación de la tabla "final"

Lo primero que haremos para gestionar los datos de taxis amarillos será a crear, si no existe aún, la tabla "final" que alojará los datos en BigQuery.

```sql
CREATE TABLE IF NOT EXISTS `{{ kv('GCP_PROJECT_ID') }}.{{ kv('GCP_DATASET') }}.yellow_tripdata`
(
    unique_row_id BYTES OPTIONS (description = 'A unique identifier for the trip, generated by hashing key trip attributes.'),
    filename STRING OPTIONS (description = 'The source filename from which the trip data was loaded.'),      
    VendorID STRING OPTIONS (description = 'A code indicating the LPEP provider that provided the record. 1= Creative Mobile Technologies, LLC; 2= VeriFone Inc.'),
    tpep_pickup_datetime TIMESTAMP OPTIONS (description = 'The date and time when the meter was engaged'),
    tpep_dropoff_datetime TIMESTAMP OPTIONS (description = 'The date and time when the meter was disengaged'),
    passenger_count INTEGER OPTIONS (description = 'The number of passengers in the vehicle. This is a driver-entered value.'),
    trip_distance NUMERIC OPTIONS (description = 'The elapsed trip distance in miles reported by the taximeter.'),
    RatecodeID STRING OPTIONS (description = 'The final rate code in effect at the end of the trip. 1= Standard rate 2=JFK 3=Newark 4=Nassau or Westchester 5=Negotiated fare 6=Group ride'),
    store_and_fwd_flag STRING OPTIONS (description = 'This flag indicates whether the trip record was held in vehicle memory before sending to the vendor, aka "store and forward," because the vehicle did not have a connection to the server. TRUE = store and forward trip, FALSE = not a store and forward trip'),
    PULocationID STRING OPTIONS (description = 'TLC Taxi Zone in which the taximeter was engaged'),
    DOLocationID STRING OPTIONS (description = 'TLC Taxi Zone in which the taximeter was disengaged'),
    payment_type INTEGER OPTIONS (description = 'A numeric code signifying how the passenger paid for the trip. 1= Credit card 2= Cash 3= No charge 4= Dispute 5= Unknown 6= Voided trip'),
    fare_amount NUMERIC OPTIONS (description = 'The time-and-distance fare calculated by the meter'),
    extra NUMERIC OPTIONS (description = 'Miscellaneous extras and surcharges. Currently, this only includes the $0.50 and $1 rush hour and overnight charges'),
    mta_tax NUMERIC OPTIONS (description = '$0.50 MTA tax that is automatically triggered based on the metered rate in use'),
    tip_amount NUMERIC OPTIONS (description = 'Tip amount. This field is automatically populated for credit card tips. Cash tips are not included.'),
    tolls_amount NUMERIC OPTIONS (description = 'Total amount of all tolls paid in trip.'),
    improvement_surcharge NUMERIC OPTIONS (description = '$0.30 improvement surcharge assessed on hailed trips at the flag drop. The improvement surcharge began being levied in 2015.'),
    total_amount NUMERIC OPTIONS (description = 'The total amount charged to passengers. Does not include cash tips.'),
    congestion_surcharge NUMERIC OPTIONS (description = 'Congestion surcharge applied to trips in congested zones')
)
PARTITION BY DATE(tpep_pickup_datetime);
```

La consulta de creación de la tabla la ejecutaremos con una tarea de tipo _consulta de BigQuery_.

```yaml
- id: bq_yellow_tripdata
  type: io.kestra.plugin.gcp.bigquery.Query
  sql: |
    # Creación de la tabla "final"
```

##### Creación de las tablas "externas"

La gran novedad de nuestro proceso ELT viene aquí: crearemos una tabla que no contiene datos. En su lugar, es una tabla "externa", que apunta a los datos contenidos por el fichero CSV que acabamos de subir a nuestro bucket.

```sql
CREATE OR REPLACE EXTERNAL TABLE `{{ kv('GCP_PROJECT_ID') }}.{{ render(vars.table) }}_ext`
(
    VendorID STRING OPTIONS (description = 'A code indicating the LPEP provider that provided the record. 1= Creative Mobile Technologies, LLC; 2= VeriFone Inc.'),
    tpep_pickup_datetime TIMESTAMP OPTIONS (description = 'The date and time when the meter was engaged'),
    tpep_dropoff_datetime TIMESTAMP OPTIONS (description = 'The date and time when the meter was disengaged'),
    passenger_count INTEGER OPTIONS (description = 'The number of passengers in the vehicle. This is a driver-entered value.'),
    trip_distance NUMERIC OPTIONS (description = 'The elapsed trip distance in miles reported by the taximeter.'),
    RatecodeID STRING OPTIONS (description = 'The final rate code in effect at the end of the trip. 1= Standard rate 2=JFK 3=Newark 4=Nassau or Westchester 5=Negotiated fare 6=Group ride'),
    store_and_fwd_flag STRING OPTIONS (description = 'This flag indicates whether the trip record was held in vehicle memory before sending to the vendor, aka "store and forward," because the vehicle did not have a connection to the server. TRUE = store and forward trip, FALSE = not a store and forward trip'),
    PULocationID STRING OPTIONS (description = 'TLC Taxi Zone in which the taximeter was engaged'),
    DOLocationID STRING OPTIONS (description = 'TLC Taxi Zone in which the taximeter was disengaged'),
    payment_type INTEGER OPTIONS (description = 'A numeric code signifying how the passenger paid for the trip. 1= Credit card 2= Cash 3= No charge 4= Dispute 5= Unknown 6= Voided trip'),
    fare_amount NUMERIC OPTIONS (description = 'The time-and-distance fare calculated by the meter'),
    extra NUMERIC OPTIONS (description = 'Miscellaneous extras and surcharges. Currently, this only includes the $0.50 and $1 rush hour and overnight charges'),
    mta_tax NUMERIC OPTIONS (description = '$0.50 MTA tax that is automatically triggered based on the metered rate in use'),
    tip_amount NUMERIC OPTIONS (description = 'Tip amount. This field is automatically populated for credit card tips. Cash tips are not included.'),
    tolls_amount NUMERIC OPTIONS (description = 'Total amount of all tolls paid in trip.'),
    improvement_surcharge NUMERIC OPTIONS (description = '$0.30 improvement surcharge assessed on hailed trips at the flag drop. The improvement surcharge began being levied in 2015.'),
    total_amount NUMERIC OPTIONS (description = 'The total amount charged to passengers. Does not include cash tips.'),
    congestion_surcharge NUMERIC OPTIONS (description = 'Congestion surcharge applied to trips in congested zones')
)
OPTIONS (
    format = 'CSV',
    uris = ['{{ render(vars.gcs_file) }}'],
    skip_leading_rows = 1,
    ignore_unknown_values = TRUE
);
```

Del mismo modo que antes, la consulta de creación de la tabla la ejecutaremos con una tarea de tipo _consulta de BigQuery_.

```yaml
- id: bq_yellow_table_ext
  type: io.kestra.plugin.gcp.bigquery.Query
  sql: |
    # Creación de la tabla "externa"
```

##### Asignación de un identificador y del fichero origen

A continuación, estableceremos un identificador único a cada registro y una etiqueta que nos permitirá más adelante saber de qué fichero viene cada dato.

```sql
CREATE OR REPLACE TABLE `{{ kv('GCP_PROJECT_ID') }}.{{ render(vars.table) }}`
AS
SELECT
  MD5(CONCAT(
    COALESCE(CAST(VendorID AS STRING), ""),
    COALESCE(CAST(tpep_pickup_datetime AS STRING), ""),
    COALESCE(CAST(tpep_dropoff_datetime AS STRING), ""),
    COALESCE(CAST(PULocationID AS STRING), ""),
    COALESCE(CAST(DOLocationID AS STRING), "")
  )) AS unique_row_id,
  "{{ render(vars.file) }}" AS filename,
  *
FROM `{{ kv('GCP_PROJECT_ID') }}.{{ render(vars.table) }}_ext`;
```

Una vez más, para esto usaremos una tarea de tipo _consulta de BigQuery_.

```yaml
- id: bq_yellow_table_tmp
  type: io.kestra.plugin.gcp.bigquery.Query
  sql: |
    # Asignación de un identificador y del fichero origen
```

##### Combinación de los datos con los de la tabla "final"

Como último paso, combinaremos los datos que nos acabamos de descargar con los de la tabla "final".

```sql
MERGE INTO `{{ kv('GCP_PROJECT_ID') }}.{{ kv('GCP_DATASET') }}.yellow_tripdata` T
USING `{{ kv('GCP_PROJECT_ID') }}.{{ render(vars.table) }}` S
ON T.unique_row_id = S.unique_row_id
WHEN NOT MATCHED THEN
  INSERT (unique_row_id, filename, VendorID, tpep_pickup_datetime, tpep_dropoff_datetime, passenger_count, trip_distance, RatecodeID, store_and_fwd_flag, PULocationID, DOLocationID, payment_type, fare_amount, extra, mta_tax, tip_amount, tolls_amount, improvement_surcharge, total_amount, congestion_surcharge)
  VALUES (S.unique_row_id, S.filename, S.VendorID, S.tpep_pickup_datetime, S.tpep_dropoff_datetime, S.passenger_count, S.trip_distance, S.RatecodeID, S.store_and_fwd_flag, S.PULocationID, S.DOLocationID, S.payment_type, S.fare_amount, S.extra, S.mta_tax, S.tip_amount, S.tolls_amount, S.improvement_surcharge, S.total_amount, S.congestion_surcharge);
```

Usando nuestra última _consulta de BigQuery_ para este dataset.

```yaml
- id: bq_yellow_merge
  type: io.kestra.plugin.gcp.bigquery.Query
  sql: |
    # Merge de los datos descargados con la tabla "final"
```

#### Limpieza de ficheros

Como hicimos en versiones previas del flujo de datos, terminamos asegurándonos de borrar los ficheros descargados que ya no necesitamos.

```yaml
- id: purge_files
  type: io.kestra.plugin.core.storage.PurgeCurrentExecutionFiles
  description: If you'd like to explore Kestra outputs, disable it.
  disabled: false
```

## Resultado final

Una vez terminado, nuestro flujo de datos tendrá un aspecto similar al del fichero [08-gcp-taxi.yaml](resources/flows/08-gcp-taxi.yaml).
