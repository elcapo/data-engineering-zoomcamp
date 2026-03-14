# Homework

> [!NOTE]
> The commands in the homework were adapted so that they can be used with the pipeline implemented in this same repository.

## Question 1. Redpanda version

> Run `rpk version` inside the Redpanda container:

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

The version of Redpanda is v25.3.9.

## Question 2. Sending data to Redpanda

> Create a topic called `green-trips`:

```bash
docker exec -it pyflink-pipeline-redpanda-1 rpk topic create green-trips
```

> Now write a producer to send the green taxi data to this topic.

To solve this question, the [`homework_producer.py`](../pipelines/pyflink-pipeline/src/producers/homework_producer.py) file was created.

> How long did it take to send the data?

```bash
cd ../pipelines/pyflink-pipeline
uv run src/producers/homework_producer.py
```

The process was executed several times with an output similar to this one (always between 3.40 and 3.60 seconds):

```
Productor iniciado. Enviando datos...
El proceso tardó 3.47 segundos
¡Todos los datos fueron enviados con éxito!
```

The closest answer from the set of suggested answers is **10 seconds**.

## Question 3. Consumer - trip distance

> Write a Kafka consumer that reads all messages from the `green-trips` topic (set `auto_offset_reset='earliest'`).

The [`homework_counter_consumer.py`](../pipelines/pyflink-pipeline/src/consumers/homework_counter_consumer.py) consumer was created.

> Count how many trips have a `trip_distance` greater than 5.0 kilometers.

```bash
uv run src/consumers/homework_counter_consumer.py
```

The consumer was executed and returned this output:

```
Se encontraron 8506 viajes de taxis verdes de más de 5 kilómetros
```

So there are **8506** green taxi trips of more than 5 kilometers.

## Question 4. Tumbling window - pickup location

> Create a Flink job that reads from `green-trips` and uses a 5-minute tumbling window to count trips per `PULocationID`. Write the results to a PostgreSQL table with columns: `window_start`, `PULocationID`, `num_trips`.

The job [`aggregated_pickup_job.py`](../pipelines/pyflink-pipeline/src/jobs/aggregated_pickup_job.py) was created and then added to Flink with:

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

After a while, this query was executed:

```sql
SELECT PULocationID, num_trips
FROM aggregated_pickup
ORDER BY num_trips DESC
LIMIT 3;
```

Returning this results:

```
 pulocationid | num_trips 
--------------+-----------
           74 |        30
           74 |        28
           74 |        26
```

Therefore, the `PULocationID` with the most trips in a single 5-minute window is **74**.

## Question 5. Session window - longest streak

> Create another Flink job that uses a session window with a 5-minute gap on `PULocationID`, using `lpep_pickup_datetime` as the event time with a 5-second watermark tolerance. A session window groups events that arrive within 5 minutes of each other. When there's a gap of more than 5 minutes, the window closes.
>
> Write the results to a PostgreSQL table named `aggregated_longest_streak` and find the `PULocationID` with the longest session (most trips in a single session).

The job [`aggregated_longest_streak_job.py`](../pipelines/pyflink-pipeline/src/jobs/aggregated_longest_streak_job.py) was written for to accomplish this. Then it was added to PyFlink with:

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

> How many trips were in the longest session?

After processing all the events with the job, this query:

```sql
SELECT window_start, window_end, PULocationID, num_trips
FROM aggregated_longest_streak
ORDER BY num_trips DESC
LIMIT 3;
```

Returned:

```
    window_start     |     window_end      | pulocationid | num_trips 
---------------------+---------------------+--------------+-----------
 2025-10-08 06:46:14 | 2025-10-08 08:27:40 |           74 |        81
 2025-10-01 06:52:23 | 2025-10-01 08:23:33 |           74 |        72
 2025-10-22 06:58:31 | 2025-10-22 08:25:04 |           74 |        71
```

So the longest streak was one of **81** rides.

## Question 6. Tumbling window - largest tip

> Create a Flink job that uses a 1-hour tumbling window to compute the total `tip_amount` per hour (across all locations).

The job [`aggregated_tips_per_hour_job.py`](../pipelines/pyflink-pipeline/src/jobs/aggregated_tips_per_hour_job.py) was created and executed. Then, this query:

```sql
SELECT *
FROM aggregated_tips_per_hour
ORDER BY total_tips DESC
LIMIT 5;
```

Returned:

```
    window_start     |     total_tips     
---------------------+--------------------
 2025-10-16 18:00:00 |  524.9599999999998
 2025-10-30 16:00:00 |              507.1
 2025-10-10 17:00:00 |  499.6000000000002
 2025-10-09 18:00:00 | 482.96000000000015
 2025-10-16 17:00:00 |             463.73
```

> Which hour had the highest total tip amount?

So the hour with the highest total tip amount was **2025-10-16 18:00:00**.

## Submitting the solutions

- Form for submitting: https://courses.datatalks.club/de-zoomcamp-2026/homework/hw7
