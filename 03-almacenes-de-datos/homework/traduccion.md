# Tarea del Módulo 3: Almacenamiento de Datos y BigQuery

## Datos

Para esta tarea utilizaremos los registros de viajes de taxis Yellow para el período **enero 2024 - junio 2024** (no el año completo).

Los archivos Parquet están disponibles en los datos de taxis de la ciudad de Nueva York, que puedes encontrar [aquí](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page).

## Carga de datos

Puedes usar los siguientes scripts para cargar los datos en tu bucket de GCS:

- Script de Python: [load_yellow_taxi_data.py](./load_yellow_taxi_data.py)
- Jupyter notebook con DLT: [DLT_upload_to_GCP.ipynb](./DLT_upload_to_GCP.ipynb)

Si quieres usar el script, primero descarga tu archivo JSON de credenciales como `service-account.json` y luego ejecuta:

```bash
uv run load_yellow_taxi_data.py
```

Necesitarás generar una cuenta de servicio con privilegios de administrador de GCS o estar autenticado con el SDK de Google, y actualizar el nombre del bucket en el script.

Si estás usando herramientas de orquestación como Kestra, Mage, Airflow o Prefect, no cargues los datos en BigQuery usando el orquestador.

Asegúrate de que los 6 archivos aparezcan en tu bucket de GCS antes de comenzar.

> [!NOTE]
> Deberás usar la opción PARQUET al crear una tabla externa.

## Configuración de BigQuery

> Crea una tabla externa usando los registros de viajes de taxis Yellow.

```sql
CREATE OR REPLACE EXTERNAL TABLE `zoomcamp.yellow_tripdata_parquet_ext`
OPTIONS (
  format = 'Parquet',
  uris = ['gs://newyork-taxi/yellow_tripdata_*.parquet']
);
```

> Crea una tabla regular y materializada en BigQuery usando los registros de viajes de taxis Yellow. No particionar ni agrupar esta tabla.

```sql
CREATE OR REPLACE TABLE zoomcamp.yellow_tripdata_parquet
AS
SELECT * FROM zoomcamp.yellow_tripdata_parquet_ext;
```

## Pregunta 1. Conteo de registros

> ¿Cuántos registros tiene el conjunto de datos de taxis Yellow de 2024?

```sql
SELECT COUNT(*) FROM zoomcamp.yellow_tripdata_parquet
```

- **20.332.093**

## Pregunta 2. Estimación de datos leídos

> Escribe una consulta para contar el número de PULocationIDs distintos para todo el conjunto de datos en ambas tablas.

```sql
/* Tabla externa */
SELECT DISTINCT PULocationID FROM zoomcamp.yellow_tripdata_parquet_ext

/* Tabla materializada */
SELECT DISTINCT PULocationID FROM zoomcamp.yellow_tripdata_parquet
```

> ¿Cuál es la **cantidad estimada** de datos que se leerán al ejecutar esta consulta en la tabla externa y en la tabla materializada?

- **0 MB para la tabla externa y 155,12 MB para la tabla materializada**

## Pregunta 3. Comprensión del almacenamiento columnar

> Escribe una consulta para recuperar el PULocationID de la tabla (no la tabla externa) en BigQuery. Luego escribe una consulta para recuperar el PULocationID y el DOLocationID de la misma tabla.

```sql
/* 155,12 MB */
SELECT PULocationID FROM zoomcamp.yellow_tripdata_parquet

/* 310,24 MB */
SELECT PULocationID, DOLocationID FROM zoomcamp.yellow_tripdata_parquet
```

> ¿Por qué difieren los bytes estimados?

- **BigQuery es una base de datos columnar y solo escanea las columnas específicas solicitadas en la consulta. Consultar dos columnas (PULocationID, DOLocationID) requiere leer más datos que consultar una sola columna (PULocationID), lo que genera una estimación mayor de bytes procesados.**

## Pregunta 4. Conteo de viajes con tarifa cero

> ¿Cuántos registros tienen un fare_amount igual a 0?

```sql
SELECT COUNT(*) FROM zoomcamp.yellow_tripdata_parquet WHERE fare_amount = 0
```

- **8.333**

## Pregunta 5. Particionado y agrupamiento

> ¿Cuál es la mejor estrategia para crear una tabla optimizada en BigQuery si la consulta siempre filtrará por tpep_dropoff_datetime y ordenará los resultados por VendorID?

- **Particionar por tpep_dropoff_datetime y agrupar (cluster) por VendorID**

> Crea una nueva tabla con esta estrategia.

```sql
CREATE OR REPLACE TABLE zoomcamp.yellow_tripdata_parquet_partitioned_clustered
PARTITION BY DATE(tpep_dropoff_datetime)
CLUSTER BY VendorID AS
SELECT * FROM zoomcamp.yellow_tripdata_parquet;
```

## Pregunta 6. Beneficios del particionado

> Escribe una consulta para recuperar los VendorIDs distintos entre tpep_dropoff_datetime 2024-03-01 y 2024-03-15 (inclusive).

```sql
/* Tabla materializada */
SELECT DISTINCT VendorID
FROM zoomcamp.yellow_tripdata_parquet
WHERE tpep_dropoff_datetime BETWEEN '2024-03-01' AND '2024-03-15'

/* Tabla particionada y agrupada */
SELECT DISTINCT VendorID
FROM zoomcamp.yellow_tripdata_parquet_partitioned_clustered
WHERE tpep_dropoff_datetime BETWEEN '2024-03-01' AND '2024-03-15'
```

> Usa la tabla materializada creada anteriormente en la cláusula FROM y anota los bytes estimados.

- **310,24 MB**

> Ahora cambia la tabla en la cláusula FROM por la tabla particionada creada en la pregunta 5 y anota los bytes estimados.

- **26,84 MB**

> ¿Cuáles son estos valores? Elige la respuesta que más se aproxime.

- **310,24 MB para la tabla no particionada y 26,84 MB para la tabla particionada**

## Pregunta 7. Almacenamiento de la tabla externa

> ¿Dónde se almacenan los datos de la tabla externa que creaste?

- **Bucket de GCP**

## Pregunta 8. Buenas prácticas de agrupamiento

> En BigQuery, es una buena práctica agrupar siempre los datos:

- **Verdadero**, pero con buenos criterios.

## Pregunta 9. Comprensión del escaneo de tablas

> Sin puntuación: Escribe una consulta `SELECT count(*)` sobre la tabla materializada que creaste.

```sql
SELECT COUNT(*)
FROM zoomcamp.yellow_tripdata_parquet
```

> ¿Cuántos bytes estima que se leerán? ¿Por qué?

La estimación de bytes es 0 B, y la razón es que con las tablas materializadas, BigQuery ya mantiene el recuento de registros como parte de los metadatos de la tabla. Si añadimos un filtro, obtendremos una estimación de bytes distinta de cero.

Por ejemplo, la estimación de bytes procesados para esta otra consulta es 155,12 MB:

```sql
SELECT COUNT(*)
FROM zoomcamp.yellow_tripdata_parquet
WHERE VendorID = 2
```

## Envío de soluciones

Formulario de envío: https://courses.datatalks.club/de-zoomcamp-2026/homework/hw3
