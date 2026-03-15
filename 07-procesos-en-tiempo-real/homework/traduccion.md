# Tarea

> [!NOTE]
> Los comandos de la tarea fueron adaptados para que puedan usarse con el pipeline implementado en este mismo repositorio.

## Pregunta 1. Versión de Redpanda

> Ejecuta `rpk version` dentro del contenedor de Redpanda:

```bash
docker exec -it pyflink-pipeline-redpanda-1 rpk version
```

```
rpk version: v25.3.9
Git ref:     836b4a36ef6d5121edbb1e68f0f673c2a8a244e2
Build date:  2026 Feb 26 07 48 21 Thu
OS/Arch:     linux/amd64
Go version:  go1.24.3

Redpanda Cluster
  node-0  v25.3.9 - 836b4a36ef6d5121edbb1e68f0f673c2a8a244e2
```

La versión de Redpanda es v25.3.9.

## Pregunta 2. Envío de datos a Redpanda

> Crea un topic llamado `green-trips`:

```bash
docker exec -it pyflink-pipeline-redpanda-1 rpk topic create green-trips
```

> Ahora escribe un productor para enviar los datos de taxis verdes a este topic.

Para resolver esta pregunta se creó el archivo [`homework_producer.py`](../pipelines/pyflink-pipeline/src/producers/homework_producer.py).

> ¿Cuánto tiempo tardó en enviar los datos?

```bash
cd ../pipelines/pyflink-pipeline
uv run src/producers/homework_producer.py
```

El proceso se ejecutó varias veces con una salida similar a esta (siempre entre 3,40 y 3,60 segundos):

```
Productor iniciado. Enviando datos...
El proceso tardó 3.47 segundos
¡Todos los datos fueron enviados con éxito!
```

La respuesta más cercana del conjunto de respuestas sugeridas es **10 segundos**.

## Pregunta 3. Consumidor - distancia del viaje

> Escribe un consumidor de Kafka que lea todos los mensajes del topic `green-trips` (configura `auto_offset_reset='earliest'`).

Se creó el consumidor [`homework_counter_consumer.py`](../pipelines/pyflink-pipeline/src/consumers/homework_counter_consumer.py).

> Cuenta cuántos viajes tienen una `trip_distance` mayor a 5,0 kilómetros.

```bash
uv run src/consumers/homework_counter_consumer.py
```

El consumidor se ejecutó y devolvió esta salida:

```
Se encontraron 8506 viajes de taxis verdes de más de 5 kilómetros
```

Por lo tanto, hay **8506** viajes en taxi verde de más de 5 kilómetros.

## Pregunta 4. Ventana tumbling - ubicación de recogida

> Crea un job de Flink que lea desde `green-trips` y use una ventana tumbling de 5 minutos para contar viajes por `PULocationID`. Escribe los resultados en una tabla de PostgreSQL con las columnas: `window_start`, `PULocationID`, `num_trips`.

Se creó el job [`aggregated_pickup_job.py`](../pipelines/pyflink-pipeline/src/jobs/aggregated_pickup_job.py) y luego se añadió a Flink con:

```bash
docker compose \
    -f docker-compose.yml \
    -f docker-compose.flink.yml \
    exec -d jobmanager \
    ./bin/flink run \
    -py /opt/src/jobs/aggregated_pickup_job.py \
    --pyFiles /opt/src \
    -d
```

Tras un tiempo, se ejecutó esta consulta:

```sql
SELECT PULocationID, num_trips
FROM aggregated_pickup
ORDER BY num_trips DESC
LIMIT 3;
```

Devolviendo estos resultados:

```
 pulocationid | num_trips
--------------+-----------
           74 |        30
           74 |        28
           74 |        26
```

Por lo tanto, el `PULocationID` con más viajes en una sola ventana de 5 minutos es el **74**.

## Pregunta 5. Ventana de sesión - racha más larga

> Crea otro job de Flink que use una ventana de sesión con un intervalo de 5 minutos sobre `PULocationID`, usando `lpep_pickup_datetime` como tiempo de evento con una tolerancia de marca de agua de 5 segundos. Una ventana de sesión agrupa eventos que llegan dentro de los 5 minutos entre sí. Cuando hay un intervalo de más de 5 minutos, la ventana se cierra.
>
> Escribe los resultados en una tabla de PostgreSQL llamada `aggregated_longest_streak` y encuentra el `PULocationID` con la sesión más larga (más viajes en una sola sesión).

Se escribió el job [`aggregated_longest_streak_job.py`](../pipelines/pyflink-pipeline/src/jobs/aggregated_longest_streak_job.py) para este propósito. Luego se añadió a PyFlink con:

```bash
docker compose \
    -f docker-compose.yml \
    -f docker-compose.flink.yml \
    exec -d jobmanager \
    ./bin/flink run \
    -py /opt/src/jobs/aggregated_longest_streak_job.py \
    --pyFiles /opt/src \
    -d
```

> ¿Cuántos viajes hubo en la sesión más larga?

Tras procesar todos los eventos con el job, esta consulta:

```sql
SELECT window_start, window_end, PULocationID, num_trips
FROM aggregated_longest_streak
ORDER BY num_trips DESC
LIMIT 3;
```

Devolvió:

```
    window_start     |     window_end      | pulocationid | num_trips
---------------------+---------------------+--------------+-----------
 2025-10-08 06:46:14 | 2025-10-08 08:27:40 |           74 |        81
 2025-10-01 06:52:23 | 2025-10-01 08:23:33 |           74 |        72
 2025-10-22 06:58:31 | 2025-10-22 08:25:04 |           74 |        71
```

Por lo tanto, la racha más larga fue de **81** viajes.

## Pregunta 6. Ventana tumbling - propina más alta

> Crea un job de Flink que use una ventana tumbling de 1 hora para calcular el total de `tip_amount` por hora (en todas las ubicaciones).

Se creó y ejecutó el job [`aggregated_tips_per_hour_job.py`](../pipelines/pyflink-pipeline/src/jobs/aggregated_tips_per_hour_job.py). Luego, esta consulta:

```sql
SELECT *
FROM aggregated_tips_per_hour
ORDER BY total_tips DESC
LIMIT 5;
```

Devolvió:

```
    window_start     |     total_tips
---------------------+--------------------
 2025-10-16 18:00:00 |  524.9599999999998
 2025-10-30 16:00:00 |              507.1
 2025-10-10 17:00:00 |  499.6000000000002
 2025-10-09 18:00:00 | 482.96000000000015
 2025-10-16 17:00:00 |             463.73
```

> ¿Qué hora tuvo el mayor importe total de propinas?

La hora con el mayor importe total de propinas fue **2025-10-16 18:00:00**.

## Envío de soluciones

- Formulario de envío: https://courses.datatalks.club/de-zoomcamp-2026/homework/hw7
