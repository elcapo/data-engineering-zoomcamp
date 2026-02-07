# Almacenes de datos

## Recuperar consultas de creación de objetos en BigQuery

En ocasiones puede ocurrir que queramos recuperar la consulta que utilizamos para crear un objeto en BigQuery. En este artículo explicamos cómo obtener las consultas que serían necesarias para reconstruir un objeto de BigQuery en su estado actual.

### Tablas externas

Gracias a la potencia de GoogleSQL podemos recuperar la consulta de creación de una tabla consultando la columna `ddl` de la tabla de metadatos `INFORMATION_SCHEMA.TABLES`.

```sql
SELECT ddl
FROM zoomcamp.INFORMATION_SCHEMA.TABLES
WHERE table_name = 'yellow_tripdata_2020_01_ext';
```

La consulta devuelve la consulta de creación que sería preciso ejecutar para recrear la tabla en su estado actual.

> [!NOTE]
> Es posible que esta consulta no coincida con la consulta se utilizó para crear la tabla. En su lugar, se trata de una vista consolidada del estado actual de la tabla en la que, por ejemplo, pueden no aparecer columnas que existían en el momento de crear la tabla si fueron eliminadas posteriormente.

```sql
CREATE EXTERNAL TABLE `zoomcamp-ingenieria-datos.zoomcamp.yellow_tripdata_2020_01_ext`
(
  VendorID STRING OPTIONS(description="A code indicating the LPEP provider that provided the record. 1= Creative Mobile Technologies, LLC; 2= VeriFone Inc."),
  tpep_pickup_datetime TIMESTAMP OPTIONS(description="The date and time when the meter was engaged"),
  tpep_dropoff_datetime TIMESTAMP OPTIONS(description="The date and time when the meter was disengaged"),
  passenger_count INT64 OPTIONS(description="The number of passengers in the vehicle. This is a driver-entered value."),
  trip_distance NUMERIC OPTIONS(description="The elapsed trip distance in miles reported by the taximeter."),
  RatecodeID STRING OPTIONS(description="The final rate code in effect at the end of the trip. 1= Standard rate 2=JFK 3=Newark 4=Nassau or Westchester 5=Negotiated fare 6=Group ride"),
  store_and_fwd_flag STRING OPTIONS(description="This flag indicates whether the trip record was held in vehicle memory before sending to the vendor, aka \"store and forward,\" because the vehicle did not have a connection to the server. TRUE = store and forward trip, FALSE = not a store and forward trip"),
  PULocationID STRING OPTIONS(description="TLC Taxi Zone in which the taximeter was engaged"),
  DOLocationID STRING OPTIONS(description="TLC Taxi Zone in which the taximeter was disengaged"),
  payment_type INT64 OPTIONS(description="A numeric code signifying how the passenger paid for the trip. 1= Credit card 2= Cash 3= No charge 4= Dispute 5= Unknown 6= Voided trip"),
  fare_amount NUMERIC OPTIONS(description="The time-and-distance fare calculated by the meter"),
  extra NUMERIC OPTIONS(description="Miscellaneous extras and surcharges. Currently, this only includes the $0.50 and $1 rush hour and overnight charges"),
  mta_tax NUMERIC OPTIONS(description="$0.50 MTA tax that is automatically triggered based on the metered rate in use"),
  tip_amount NUMERIC OPTIONS(description="Tip amount. This field is automatically populated for credit card tips. Cash tips are not included."),
  tolls_amount NUMERIC OPTIONS(description="Total amount of all tolls paid in trip."),
  improvement_surcharge NUMERIC OPTIONS(description="$0.30 improvement surcharge assessed on hailed trips at the flag drop. The improvement surcharge began being levied in 2015."),
  total_amount NUMERIC OPTIONS(description="The total amount charged to passengers. Does not include cash tips."),
  congestion_surcharge NUMERIC OPTIONS(description="Congestion surcharge applied to trips in congested zones")
)
OPTIONS(
  skip_leading_rows=1,
  ignore_unknown_values=true,
  format="CSV",
  uris=["gs://newyork-taxi/yellow_tripdata_2020-01.csv"]
);
```

### Tablas persistidas

La misma consulta funciona también para obtener la consulta de creación de una tabla persistida.

```sql
SELECT ddl
FROM zoomcamp.INFORMATION_SCHEMA.TABLES
WHERE table_name = 'yellow_tripdata_2020_01';
```

Que, en nuestro caso, sería.

```sql
CREATE TABLE `zoomcamp-ingenieria-datos.zoomcamp.yellow_tripdata_2020_01`
(
  unique_row_id BYTES,
  filename STRING,
  VendorID STRING,
  tpep_pickup_datetime TIMESTAMP,
  tpep_dropoff_datetime TIMESTAMP,
  passenger_count INT64,
  trip_distance NUMERIC,
  RatecodeID STRING,
  store_and_fwd_flag STRING,
  PULocationID STRING,
  DOLocationID STRING,
  payment_type INT64,
  fare_amount NUMERIC,
  extra NUMERIC,
  mta_tax NUMERIC,
  tip_amount NUMERIC,
  tolls_amount NUMERIC,
  improvement_surcharge NUMERIC,
  total_amount NUMERIC,
  congestion_surcharge NUMERIC
);
```

### Tablas particionadas

Por último, cabe destacar que esta técnica también funciona para obtener información sobre la partición y los clústeres de una tabla.

```sql
SELECT table_name, ddl
FROM zoomcamp.INFORMATION_SCHEMA.TABLES
WHERE table_name = 'yellow_tripdata_partitioned';
```

En este caso, obtendríamos:

```sql
CREATE TABLE `zoomcamp-ingenieria-datos.zoomcamp.yellow_tripdata_partitioned`
(
  VendorID STRING,
  tpep_pickup_datetime TIMESTAMP,
  tpep_dropoff_datetime TIMESTAMP,
  passenger_count INT64,
  trip_distance NUMERIC,
  RatecodeID STRING,
  store_and_fwd_flag STRING,
  PULocationID STRING,
  DOLocationID STRING,
  payment_type INT64,
  fare_amount NUMERIC,
  extra NUMERIC,
  mta_tax NUMERIC,
  tip_amount NUMERIC,
  tolls_amount NUMERIC,
  improvement_surcharge NUMERIC,
  total_amount NUMERIC,
  congestion_surcharge NUMERIC
)
PARTITION BY DATE(tpep_pickup_datetime);
```

### Modelos de aprendizaje automático

Para obtener la consulta de creación de un modelo de aprendizaje automático, la técnica varía un poco y tenemos que acudir al histórico de "trabajos por proyecto", `INFORMATION_SCHEMA.JOBS_BY_PROJECT`, que mantiene BigQuery. Esto significa que en este caso no podremos obtener la consulta que sería necesaria para crear el objeto en su estado actual. En su lugar, podemos obtener la consulta literal que usamos para crear el objeto.

```sql
SELECT query
FROM `region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE
    destination_table.project_id = 'zoomcamp-ingenieria-datos' AND
    destination_table.dataset_id = 'zoomcamp' AND
    destination_table.table_id = 'tip_model'
```

Fíjate que en este caso necesitamos añadir la región en el FROM. En cualquier caso, la técnica puede sacarnos de un apuro y devolvernos la consulta que se utilizó para crear el modelo.

```sql
CREATE OR REPLACE MODEL zoomcamp.tip_model
OPTIONS (
    model_type='linear_reg',
    input_label_cols=['tip_amount'],
    data_split_method='AUTO_SPLIT'
) AS
SELECT *
FROM zoomcamp.yellow_tripdata_dataset
WHERE tip_amount IS NOT NULL
```