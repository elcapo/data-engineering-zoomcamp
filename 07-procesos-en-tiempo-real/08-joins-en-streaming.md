# Procesos en tiempo real

## Joins en streaming: enriquecer eventos en tiempo real

Todos los trabajos que hemos construido hasta ahora leen de un único tópico de Kafka. Reciben eventos de viajes, los transforman o agregan, y los escriben en PostgreSQL. Pero en producción, los pipelines más útiles no operan sobre un único flujo de datos aislado: cruzan eventos con información de referencia, correlacionan eventos de distintas fuentes o enriquecen un stream con el contexto necesario para que sus resultados tengan significado.

En este artículo veremos dos patrones de join en la Table API de Flink: el **lookup join** para enriquecer eventos con datos estáticos o que cambian lentamente, y el **interval join** para correlacionar eventos de dos streams que ocurren en un margen de tiempo.

### El problema del enriquecimiento

Nuestros eventos de viaje llevan `PULocationID` y `DOLocationID`: identificadores numéricos de las zonas de recogida y destino. Son útiles para agrupar y agregar, pero difíciles de interpretar. Un panel de datos que muestra "zona 132" en lugar de "JFK Airport" tiene poco valor para alguien que no se sabe de memoria el mapa de zonas de taxi de Nueva York.

El conjunto de datos del TLC incluye un fichero de zonas con la correspondencia entre ID y nombre:

```
LocationID | Borough       | Zone
-----------+---------------+------------------
1          | EWR           | Newark Airport
132        | Queens        | JFK Airport
161        | Manhattan     | Midtown Center
...
```

El reto es incorporar este contexto en el trabajo de Flink sin necesidad de cambiar la estructura del mensaje de Kafka ni el esquema del tópico.

### Preparar la tabla de referencia

Importamos las zonas en PostgreSQL como tabla de referencia. La tabla ya está incluida en el script de inicialización [`init.sql`](./pipelines/pyflink-pipeline/init.sql):

```sql
CREATE TABLE zones (
    location_id INTEGER PRIMARY KEY,
    borough     VARCHAR,
    zone        VARCHAR
);
```

Para cargarla podemos descargar el CSV de zonas del TLC y cargarlo con `psql` o con un script Python:

```bash
curl -O https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv

docker compose exec -T postgres psql -U postgres -c \
    "\COPY zones(location_id, borough, zone) \
     FROM STDIN WITH (FORMAT csv, HEADER true)" \
    < taxi_zone_lookup.csv
```

Una vez cargada, la tabla tiene 265 filas: una por zona. Es un dato que cambia raramente (cuando el TLC actualiza los límites de sus zonas) y cabe completamente en memoria. Esto la convierte en un candidato ideal para un lookup join.

### Lookup join en la Table API

Un **lookup join** es un join entre un stream (la tabla de Kafka) y una tabla de referencia (la tabla de PostgreSQL) en el que, por cada evento del stream, Flink consulta la tabla de referencia para obtener los datos asociados.

La Table API lo expresa con la sintaxis `FOR SYSTEM_TIME AS OF`, que indica que queremos el valor de la tabla de referencia en el momento de procesamiento de cada evento:

```sql
SELECT
    r.PULocationID,
    zpu.zone        AS pickup_zone,
    r.DOLocationID,
    zdо.zone        AS dropoff_zone,
    r.trip_distance,
    r.total_amount,
    r.tpep_pickup_datetime
FROM rides AS r
JOIN zones FOR SYSTEM_TIME AS OF r.proc_time AS zpu
    ON r.PULocationID = zpu.location_id
JOIN zones FOR SYSTEM_TIME AS OF r.proc_time AS zdo
    ON r.DOLocationID = zdo.location_id
```

Para que esta sintaxis funcione, la tabla fuente necesita una **columna de tiempo de procesamiento** (`proc_time`). A diferencia de `event_timestamp`, que refleja cuándo ocurrió el evento en el mundo real, el tiempo de procesamiento refleja cuándo el evento llega al sistema. Se declara como columna calculada con `PROCTIME()`:

```sql
CREATE TABLE rides (
    PULocationID            INTEGER,
    DOLocationID            INTEGER,
    trip_distance           DOUBLE,
    total_amount            DOUBLE,
    tpep_pickup_datetime    BIGINT,
    proc_time               AS PROCTIME()
) WITH (
    'connector' = 'kafka',
    'properties.bootstrap.servers' = 'redpanda:29092',
    'topic' = 'rides',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json'
)
```

El trabajo completo [`enriched_rides_job.py`](./pipelines/pyflink-pipeline/src/jobs/enriched_rides_job.py) queda así:

```python
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import EnvironmentSettings, StreamTableEnvironment


def create_rides_source(t_env):
    t_env.execute_sql("""
        CREATE TABLE rides (
            PULocationID            INTEGER,
            DOLocationID            INTEGER,
            trip_distance           DOUBLE,
            total_amount            DOUBLE,
            tpep_pickup_datetime    BIGINT,
            proc_time               AS PROCTIME()
        ) WITH (
            'connector' = 'kafka',
            'properties.bootstrap.servers' = 'redpanda:29092',
            'topic' = 'rides',
            'scan.startup.mode' = 'latest-offset',
            'format' = 'json'
        )
    """)
    return 'rides'


def create_zones_lookup(t_env):
    t_env.execute_sql("""
        CREATE TABLE zones (
            location_id INTEGER,
            borough     VARCHAR,
            zone        VARCHAR,
            PRIMARY KEY (location_id) NOT ENFORCED
        ) WITH (
            'connector'              = 'jdbc',
            'url'                    = 'jdbc:postgresql://postgres:5432/postgres',
            'table-name'             = 'zones',
            'username'               = 'postgres',
            'password'               = 'postgres',
            'driver'                 = 'org.postgresql.Driver',
            'lookup.cache.max-rows'  = '265',
            'lookup.cache.ttl'       = '1 hour'
        )
    """)
    return 'zones'


def create_enriched_sink(t_env):
    t_env.execute_sql("""
        CREATE TABLE enriched_rides (
            PULocationID    INTEGER,
            pickup_zone     VARCHAR,
            DOLocationID    INTEGER,
            dropoff_zone    VARCHAR,
            trip_distance   DOUBLE,
            total_amount    DOUBLE,
            pickup_datetime TIMESTAMP
        ) WITH (
            'connector'  = 'jdbc',
            'url'        = 'jdbc:postgresql://postgres:5432/postgres',
            'table-name' = 'enriched_rides',
            'username'   = 'postgres',
            'password'   = 'postgres',
            'driver'     = 'org.postgresql.Driver'
        )
    """)
    return 'enriched_rides'


def enrich_rides():
    env = StreamExecutionEnvironment.get_execution_environment()
    env.enable_checkpointing(10 * 1000)

    t_env = StreamTableEnvironment.create(
        env, EnvironmentSettings.new_instance().in_streaming_mode().build()
    )

    rides  = create_rides_source(t_env)
    zones  = create_zones_lookup(t_env)
    sink   = create_enriched_sink(t_env)

    t_env.execute_sql(f"""
        INSERT INTO {sink}
        SELECT
            r.PULocationID,
            zpu.zone                                        AS pickup_zone,
            r.DOLocationID,
            zdo.zone                                        AS dropoff_zone,
            r.trip_distance,
            r.total_amount,
            TO_TIMESTAMP_LTZ(r.tpep_pickup_datetime, 3)    AS pickup_datetime
        FROM {rides} AS r
        JOIN {zones} FOR SYSTEM_TIME AS OF r.proc_time AS zpu
            ON r.PULocationID = zpu.location_id
        JOIN {zones} FOR SYSTEM_TIME AS OF r.proc_time AS zdo
            ON r.DOLocationID = zdo.location_id
    """).wait()


if __name__ == '__main__':
    enrich_rides()
```

Para ejecutar el trabajo:

```bash
make run-enriched
```

Tras arrancarlo, cada evento que llega del tópico `rides` produce una fila en `enriched_rides` con los nombres de las zonas en lugar de los IDs numéricos.

### Caché del lookup join

Los parámetros `lookup.cache.max-rows` y `lookup.cache.ttl` en la definición de la tabla `zones` controlan el comportamiento de la caché del lookup join.

Sin caché, Flink haría una consulta SQL a PostgreSQL por cada evento del stream: si el tópico recibe 1.000 eventos por segundo, PostgreSQL recibiría 2.000 consultas por segundo (una por recogida y una por destino). Para una tabla de 265 filas que casi nunca cambia, esto es un desperdicio.

Con `lookup.cache.max-rows = '265'` y `lookup.cache.ttl = '1 hour'`, Flink carga las zonas en memoria y las mantiene durante una hora antes de refrescarlas. Las consultas a PostgreSQL se reducen a una carga inicial y una actualización cada hora, independientemente del volumen del stream.

> [!NOTE]
> El lookup join es un **inner join** por defecto: si un evento llega con un `PULocationID` que no existe en la tabla `zones`, ese evento es descartado silenciosamente. Para conservar eventos con IDs sin correspondencia se puede usar un `LEFT JOIN`, en cuyo caso `pickup_zone` será `NULL` para los registros sin match.

### Join entre dos streams

El lookup join funciona bien cuando una de las partes del join es estática o cambia lentamente. Pero hay casos en los que ambas partes son streams dinámicos que necesitamos correlacionar.

Imaginemos que, además del tópico `rides`, tenemos un tópico `pricing_events` donde un sistema de precios dinámicos publica multiplicadores de tarifa por zona cada pocos minutos:

```json
{"location_id": 132, "multiplier": 1.8, "event_timestamp": 1748822400000}
{"location_id": 161, "multiplier": 1.2, "event_timestamp": 1748822460000}
```

Queremos calcular el importe ajustado de cada viaje aplicando el multiplicador vigente en la zona de recogida en el momento del viaje. El reto es que el multiplicador cambia con el tiempo: el que aplicaba a las 12:00 puede ser distinto al de las 12:05.

El **interval join** resuelve esto: une dos streams exigiendo que los eventos que se correlacionan estén separados en el tiempo como máximo por un intervalo definido.

Primero definimos la tabla fuente del tópico de precios:

```sql
CREATE TABLE pricing_events (
    location_id     INTEGER,
    multiplier      DOUBLE,
    event_ts_ms     BIGINT,
    event_timestamp AS TO_TIMESTAMP_LTZ(event_ts_ms, 3),
    WATERMARK FOR event_timestamp AS event_timestamp - INTERVAL '5' SECOND
) WITH (
    'connector'                     = 'kafka',
    'properties.bootstrap.servers'  = 'redpanda:29092',
    'topic'                         = 'pricing_events',
    'scan.startup.mode'             = 'earliest-offset',
    'format'                        = 'json'
)
```

El interval join se expresa con la condición `BETWEEN ... AND ...` sobre las columnas de tiempo de evento de ambas tablas:

```sql
SELECT
    r.PULocationID,
    r.total_amount,
    p.multiplier,
    r.total_amount * p.multiplier   AS adjusted_amount,
    r.event_timestamp               AS ride_time,
    p.event_timestamp               AS pricing_time
FROM rides AS r
JOIN pricing_events AS p
    ON  r.PULocationID = p.location_id
    AND r.event_timestamp BETWEEN
            p.event_timestamp - INTERVAL '5' MINUTE
        AND p.event_timestamp + INTERVAL '5' MINUTE
```

Esta query une cada viaje con todos los eventos de precio de la misma zona que hayan ocurrido en los 5 minutos anteriores o posteriores al viaje. Si en ese margen hay varios eventos de precio, el viaje producirá varias filas en el resultado (una por cada precio que coincide con la ventana). Si no hay ningún evento de precio, el viaje no aparece en la salida.

> [!WARNING]
> A diferencia del lookup join, el interval join es siempre un **inner join**: los eventos sin pareja en la otra parte del join son descartados. La Table API de Flink no admite interval joins con semántica LEFT JOIN.

### Estado: la memoria que los joins necesitan

El lookup join puede funcionar con una caché de tamaño acotado porque la tabla de referencia es finita. El interval join es diferente: Flink necesita mantener en memoria los eventos de ambos streams durante el tiempo que dura el intervalo, para poder encontrar las parejas cuando llegan.

En concreto, para el interval join de ±5 minutos, Flink necesita:

* Mantener todos los eventos de `rides` durante al menos 5 minutos, a la espera de que lleguen los eventos de `pricing_events` que los acompañen.
* Mantener todos los eventos de `pricing_events` durante al menos 5 minutos, a la espera de que lleguen los viajes que les corresponden.

Este conjunto de datos en memoria se llama **estado** (*state*) del operador. Flink lo gestiona de forma automática, lo persiste en los checkpoints y lo recupera ante fallos. Pero tiene un coste: si el volumen de eventos es alto o el intervalo es largo, el estado puede crecer hasta consumir una cantidad significativa de memoria.

### State TTL: evitar que el estado crezca sin límite

Cuando el trabajo lleva mucho tiempo corriendo, el estado puede acumular eventos que ya nunca tendrán pareja: un viaje que llegó hace una hora no encontrará un evento de precio con el que emparejarse en una ventana de ±5 minutos.

Flink permite configurar un **tiempo de vida del estado** (*state TTL*) para limpiar automáticamente los datos que ya no son necesarios. Se configura a nivel del entorno de ejecución, antes de crear las tablas:

```python
from pyflink.table import EnvironmentSettings, StreamTableEnvironment
from pyflink.table.config import TableConfigOptions

t_env = StreamTableEnvironment.create(
    env, EnvironmentSettings.new_instance().in_streaming_mode().build()
)

# Limpiar estado que lleve más de 10 minutos sin ser accedido
t_env.get_config().set(
    'table.exec.state.ttl', '10 min'
)
```

Con esta configuración, cualquier entrada de estado que no haya sido accedida en los últimos 10 minutos será elegible para ser eliminada por el recolector de estado de Flink. Para nuestro interval join de ±5 minutos, un TTL de 10 minutos garantiza que los eventos pendientes de pareja tengan tiempo suficiente para encontrarla antes de ser descartados.

> [!NOTE]
> El state TTL no es una garantía exacta sino un límite superior de cuánto tiempo puede vivir una entrada de estado. Flink elimina el estado de forma lazy (cuando intenta acceder a él y descubre que ha expirado), no con un proceso periódico activo. En la práctica, el estado puede persistir algo más del TTL configurado hasta que Flink lo limpie.

### Cuándo usar cada patrón

**Lookup join**: cuando uno de los lados del join es una tabla de referencia que cambia poco. Es el patrón más eficiente porque la tabla de referencia se carga en caché y las consultas al sistema externo son mínimas. Casos de uso típicos: enriquecer eventos con nombres, categorías, configuraciones o metadatos.

**Interval join**: cuando ambos lados son streams dinámicos y los eventos relacionados ocurren en un margen de tiempo conocido. Es más costoso en estado pero es la única forma de correlacionar dos flujos de eventos en tiempo real. Casos de uso típicos: correlacionar inicio y fin de una sesión, unir una solicitud con su respuesta, detectar eventos complementarios en un sistema distribuido.
