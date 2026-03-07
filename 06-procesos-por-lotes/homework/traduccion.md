# Módulo 6 Tarea

## Pregunta 1: Instalar Spark y PySpark

> Instala PySpark siguiendo esta [guía](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/06-batch/setup/)
> - Instala Spark
> - Ejecuta PySpark
> - Crea una sesión local de Spark
> - Ejecuta spark.version.
> ¿Cuál es la salida?

```python
import pyspark
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .master("local[*]") \
    .appName('homework') \
    .getOrCreate()

print(f"Spark version: {spark.version}")
```

```
Spark version: 3.5.8
```

La salida es **3.5.8**.

## Pregunta 2: Yellow de noviembre de 2025

> Lee el archivo Yellow de noviembre de 2025 en un Spark Dataframe.
>
> Reparticiona el Dataframe en 4 particiones y guárdalo en parquet.
>
> ¿Cuál es el tamaño promedio de los archivos Parquet (con extensión .parquet) que se crearon (en MB)?

```python
!mkdir -p /data/homework/raw
!mkdir -p /data/homework/parquet

!wget -nc https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-11.parquet \
    -O /data/homework/raw/yellow_tripdata_2025-11.parquet
```

```python
# Leer el archivo Yellow de noviembre de 2025 en un Spark Dataframe.
df_trips = spark.read.parquet('/data/homework/raw/*.parquet')

# Reparticionar el Dataframe en 4 particiones y guardarlo en parquet.
df_trips.repartition(4).write.parquet('/data/homework/parquet', mode='overwrite')
```

```python
# ¿Cuál es el tamaño promedio de los archivos Parquet creados (en MB)?
!ls -lh /data/homework/parquet/*.parquet
```

```
-rw-r--r-- 1 root root 25M Mar  7 11:24 /data/homework/parquet/part-00000-7ef2f8c4-626d-4401-8cc4-97eb59ad5841-c000.snappy.parquet
-rw-r--r-- 1 root root 25M Mar  7 11:24 /data/homework/parquet/part-00001-7ef2f8c4-626d-4401-8cc4-97eb59ad5841-c000.snappy.parquet
-rw-r--r-- 1 root root 25M Mar  7 11:24 /data/homework/parquet/part-00002-7ef2f8c4-626d-4401-8cc4-97eb59ad5841-c000.snappy.parquet
-rw-r--r-- 1 root root 25M Mar  7 11:24 /data/homework/parquet/part-00003-7ef2f8c4-626d-4401-8cc4-97eb59ad5841-c000.snappy.parquet
```

> Selecciona la respuesta que más se aproxime.
>
> - 6MB
> - 25MB
> - 75MB
> - 100MB

El tamaño promedio es **25MB**.

## Pregunta 3: Conteo de registros

> ¿Cuántos viajes en taxi hubo el 15 de noviembre?
>
> Considera únicamente los viajes que comenzaron el 15 de noviembre.

```python
from pyspark.sql import functions as F

df_trips = df_trips.withColumn('pickup_date', F.to_date(df_trips.tpep_pickup_datetime))
df_trips.filter(df_trips.pickup_date == '2025-11-15').count()
```

```
162604
```

El número de viajes iniciados el 15 de noviembre es:

- **162.604**

## Pregunta 4: Viaje más largo

> ¿Cuánto dura el viaje más largo del conjunto de datos, en horas?

- 22.7
- 58.2
- 90.6
- 134.5

```python
from pyspark.sql import types
from datetime import datetime

def duration(start: datetime, end: datetime) -> int:
    # Diferencia en minutos (valor absoluto para soportar valores invertidos)
    minutes = abs((end - start).total_seconds()) / 60

    # Conversión a horas
    hours = minutes / 60

    return hours

duration_udf = F.udf(duration, returnType=types.FloatType())

df_trips \
    .withColumn('duration_hours', duration_udf(df_trips.tpep_pickup_datetime, df_trips.tpep_dropoff_datetime)) \
    .groupBy() \
    .max('duration_hours') \
    .show()
```

```
+-------------------+
|max(duration_hours)|
+-------------------+
|           90.64667|
+-------------------+
```

La respuesta es **90.6**.

## Pregunta 5: Interfaz de usuario

> ¿En qué puerto local se ejecuta la Interfaz de Usuario de Spark, que muestra el panel de control de la aplicación?

Se ejecuta en el puerto **4040**.

## Pregunta 6: Zona de recogida menos frecuente

> Carga los datos de zonas en una vista temporal en Spark.

```python
!wget -nc https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv \
    -O /data/homework/raw/taxi_zone_lookup.csv
```

```python
df_zones = spark.read.csv('/data/homework/raw/taxi_zone_lookup.csv', header=True)

df_trips.createOrReplaceTempView('trips')
df_zones.createOrReplaceTempView('zones')

spark.sql("""
WITH trips_by_pickup_location AS (
    SELECT PULocationID, COUNT(*) AS trip_count
    FROM trips
    GROUP BY PULocationID
    ORDER BY trip_count
)
SELECT z.Zone, SUM(t.trip_count) AS trip_count
FROM zones AS z
LEFT JOIN trips_by_pickup_location AS t ON t.PULocationID = z.LocationID
GROUP BY z.Zone
ORDER BY trip_count
""").show(truncate=False)
```

```
+---------------------------------------------+----------+
|Zone                                         |trip_count|
+---------------------------------------------+----------+
|Charleston/Tottenville                       |NULL      |
|Freshkills Park                              |NULL      |
|Great Kills Park                             |NULL      |
|Governor's Island/Ellis Island/Liberty Island|1         |
|Eltingville/Annadale/Prince's Bay            |1         |
|Arden Heights                                |1         |
|Port Richmond                                |3         |
|Rikers Island                                |4         |
|Rossville/Woodrow                            |4         |
|Great Kills                                  |4         |
|Green-Wood Cemetery                          |4         |
|Jamaica Bay                                  |5         |
|Westerleigh                                  |12        |
|West Brighton                                |14        |
|New Dorp/Midland Beach                       |14        |
|Oakwood                                      |14        |
|Crotona Park                                 |14        |
|Willets Point                                |15        |
|Breezy Point/Fort Tilden/Riis Beach          |16        |
|Saint George/New Brighton                    |17        |
+---------------------------------------------+----------+
only showing top 20 rows
```

> Usando los datos de zonas y los datos Yellow de noviembre de 2025, ¿cuál es el nombre de la zona de recogida MENOS frecuente?

Las 3 zonas con menos viajes son aquellas que no registraron ningún viaje durante ese período:

* **Charleston/Tottenville**
* **Freshkills Park**
* **Great Kills Park**

Luego, estas 3 zonas registraron únicamente un viaje:

* **Governor's Island/Ellis Island/Liberty Island**
* **Eltingville/Annadale/Prince's Bay**
* **Arden Heights**

**Rikers Island** registró 4 viajes y **Jamaica Bay** registró 5.

## Envío de soluciones

- Formulario de envío: https://courses.datatalks.club/de-zoomcamp-2026/homework/hw6
- Fecha límite: Ver el sitio web
