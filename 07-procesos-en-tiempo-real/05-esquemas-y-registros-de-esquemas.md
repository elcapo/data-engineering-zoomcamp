# Procesos en tiempo real

## Esquemas: el contrato entre productor y consumidor

Nuestros mensajes han estado viajando a través de Kafka en JSON. Es un punto de partida cómodo: es legible, no requiere configuración adicional y funciona de inmediato. Pero tiene un problema silencioso que tarde o temprano aparece en producción.

### La trampa del JSON sin contrato

Ahora, imagina que el equipo que mantiene el productor decide renombrar el campo `total_amount` a `fare_amount` para alinearse con la nomenclatura original del _dataset_. El cambio en el productor es trivial: una línea. Pero el consumidor, que sigue esperando `total_amount`, no verá ningún error en tiempo de compilación, ni siquiera en el momento de desplegar. Solo fallará cuando intente procesar los primeros mensajes nuevos, quizás en producción, quizás después de varias horas.

Con JSON, este tipo de cambio es invisible hasta que explota. El mensaje sigue siendo JSON válido. El productor no sabe qué esperan los consumidores. Los consumidores no saben qué enviará el productor. Cada parte mantiene su propia interpretación del formato.

La solución es declarar formalmente ese acuerdo: un **esquema**.

### El esquema como contrato de datos

Un esquema define la estructura de un mensaje: qué campos tiene, de qué tipo es cada uno, cuáles son obligatorios y cuáles opcionales. Es un contrato escrito entre el productor y el consumidor.

Con un esquema:

* El productor sabe exactamente qué campos debe incluir y de qué tipo.
* El consumidor sabe exactamente qué campos puede esperar.
* Cualquier cambio que rompa la compatibilidad queda bloqueado antes de llegar a producción.

De hecho, ya hemos estado usando esquemas sin llamarlos así. La clase `Ride` en [`models.py`](./pipelines/pyflink-pipeline/src/models.py) es el esquema del productor.

```python
class Ride:
    PULocationID: int
    DOLocationID: int
    trip_distance: float
    total_amount: float
    tpep_pickup_datetime: int
```

El DDL que define la tabla `events` en [`pass_through_job.py`](./pipelines/pyflink-pipeline/src/jobs/pass_through_job.py) es el esquema del consumidor.

```sql
CREATE TABLE events (
    PULocationID INTEGER,
    DOLocationID INTEGER,
    trip_distance DOUBLE,
    total_amount DOUBLE,
    tpep_pickup_datetime BIGINT
)
```

El problema es que son dos definiciones separadas que deben mantenerse en sintonía manualmente. Si alguien modifica la clase `Ride` sin actualizar el DDL (o viceversa), el pipeline falla de forma opaca. Un esquema centralizado resuelve este problema: hay una única fuente de verdad que todos consultan.

### Apache Avro: esquemas explícitos y binarios

[Apache Avro](https://avro.apache.org) es un sistema de serialización que hace el esquema una parte explícita del proceso. Tiene dos características que lo hacen especialmente adecuado para streaming:

1. **El esquema es obligatorio**: no hay mensajes sin esquema. Esto elimina la ambigüedad del JSON.
2. **El formato es binario**: más compacto que JSON (sin nombres de campo repetidos en cada mensaje) y más rápido de serializar y deserializar.

Un esquema Avro se define en JSON y se guarda con la extensión `.avsc`. Para nuestro modelo de viajes quedaría así, en [`ride.avsc`](./pipelines/pyflink-pipeline/src/schemas/ride.avsc):

```json
{
  "type": "record",
  "name": "Ride",
  "namespace": "com.example.rides",
  "fields": [
    {"name": "PULocationID", "type": "int"},
    {"name": "DOLocationID", "type": "int"},
    {"name": "trip_distance", "type": "double"},
    {"name": "total_amount", "type": "double"},
    {"name": "tpep_pickup_datetime", "type": "long"}
  ]
}
```

La estructura es sencilla: `type: "record"` indica que es una estructura con campos nombrados, equivalente a un objeto. Cada campo tiene un nombre y un tipo. Los tipos primitivos de Avro (`int`, `long`, `float`, `double`, `string`, `boolean`, `bytes`) se mapean directamente a los tipos de Python y a los de Flink SQL.

> [!WARNING]
> Fíjate que `tpep_pickup_datetime`, que en Python es un `int` de 64 bits (milisegundos desde época), se declara como `long` en Avro: el tipo de 64 bits en Avro. Los `int` de Avro son de 32 bits.

### El registro de esquemas

El esquema Avro resuelve la parte de la serialización pero queda otro problema: ¿cómo sabe el consumidor con qué esquema fue serializado un mensaje? Podría incluirse el esquema completo en cada mensaje pero eso anularía la ventaja de compactibilidad.

La solución estándar en el ecosistema Kafka es el registro de esquemas (*schema registry*): un servidor que almacena esquemas centralizados y los identifica con un número entero. El flujo es el siguiente:

1. El productor registra el esquema antes de enviar el primer mensaje. El registro le devuelve un ID numérico (por ejemplo, `1`).
2. Cada mensaje incluye ese ID en una cabecera de 4 bytes.
3. El consumidor lee el ID de la cabecera, consulta el schema en el registry y deserializa el payload.

Este es el **formato de cable Confluent** (*Confluent Wire Format*), adoptado tanto por Confluent como por Redpanda:

```
┌────────────┬─────────────────────┬───────────────────────────────┐
│ Magic byte │     Schema ID       │        Avro payload           │
│  (1 byte)  │     (4 bytes)       │  (longitud variable, binario) │
│   0x00     │  big-endian uint32  │                               │
└────────────┴─────────────────────┴───────────────────────────────┘
```

El byte mágico (`0x00`) indica que el mensaje sigue este formato. Su presencia al inicio permite que los consumidores distingan este formato de otros (como JSON puro, o Avro sin registry).

El registro de esquemas también es la pieza que gestiona la compatibilidad entre versiones de esquemas: cuando un equipo necesita evolucionar el formato de sus mensajes, el registry puede rechazar el nuevo esquema si rompe la compatibilidad con los consumidores existentes.

### El registro de esquemas en Redpanda

Redpanda incluye un registro de esquemas integrado que expone la misma API HTTP que el registro de esquemas de Confluent. Corre en el puerto `8081` dentro del contenedor.

Para acceder a él desde el host añadimos una nueva entrada de `ports` al servicio `redpanda` en [`docker-compose.yml`](./pipelines/pyflink-pipeline/docker-compose.yml):

```yaml
services:
  redpanda:
    image: redpandadata/redpanda:v25.3.9
    ports:
      - ${REDPANDA_PORT:-9092}:9092
      - ${SCHEMA_REGISTRY_PORT:-18081}:8081
```

Usamos `18081` por defecto en el host para evitar el conflicto con el JobManager de Flink, que ya ocupa el puerto `8081`. Una vez levantado el entorno con `make up`, podemos verificar que el registro de esquemas responde:

```bash
curl http://localhost:18081/subjects
```

Si devuelve `[]` (ningún esquema registrado aún), el servicio está funcionando correctamente.

### Productor con Avro y registro de esquemas

Con el registro de esquemas disponible, podemos escribir un productor que registre el esquema y serialice los mensajes en formato Avro. Primero añadimos las dependencias necesarias:

```bash
uv add fastavro requests
```

* `fastavro`: implementación eficiente de Avro en Python puro.
* `requests`: para interactuar con la API HTTP del registro de esquemas.

El productor [`avro_producer.py`](./pipelines/pyflink-pipeline/src/producers/avro_producer.py) sigue la misma estructura que `file_producer.py`, con tres diferencias clave: registra el esquema al arrancar, construye un serializador que aplica el formato de cable Confluent y envía cada evento como un diccionario Python en lugar de como un objeto `Ride`:

```python
import json
import os
import struct
import sys
import time
from io import BytesIO
from pathlib import Path

import fastavro
import pandas as pd
import requests
from dotenv import load_dotenv
from kafka import KafkaProducer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import ride_from_row

load_dotenv()

SCHEMA_REGISTRY_URL = os.getenv('SCHEMA_REGISTRY_URL', 'http://localhost:18081')


def register_schema(schema_str: str, subject: str) -> int:
    response = requests.post(
        f'{SCHEMA_REGISTRY_URL}/subjects/{subject}/versions',
        headers={'Content-Type': 'application/vnd.schemaregistry.v1+json'},
        json={'schema': schema_str}
    )
    response.raise_for_status()
    return response.json()['id']


def make_avro_serializer(schema, schema_id: int):
    def serialize(record: dict) -> bytes:
        buf = BytesIO()
        # magic byte
        buf.write(b'\x00')
        # schema ID (4 bytes, big-endian)
        buf.write(struct.pack('>I', schema_id))

        fastavro.schemaless_writer(buf, schema, record)
        return buf.getvalue()
    return serialize


def load_producer():
    schema_path = Path(__file__).parent.parent / 'schemas' / 'ride.avsc'
    with open(schema_path) as f:
        schema_str = f.read()

    parsed_schema = fastavro.parse_schema(json.loads(schema_str))
    schema_id = register_schema(schema_str, 'structured_rides-value')
    print(f'Esquema registrado con ID: {schema_id}')

    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    producer = KafkaProducer(
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        value_serializer=make_avro_serializer(parsed_schema, schema_id)
    )

    # ... carga del dataframe, igual que en file_producer.py ...

    return producer, dataframe


def main(producer, dataframe):
    topic_name = 'structured_rides'

    for _, row in dataframe.iterrows():
        ride = ride_from_row(row)
        record = {
            'PULocationID': ride.PULocationID,
            'DOLocationID': ride.DOLocationID,
            'trip_distance': ride.trip_distance,
            'total_amount': ride.total_amount,
            'tpep_pickup_datetime': ride.tpep_pickup_datetime,
        }
        producer.send(topic_name, value=record)
        time.sleep(0.01)
```

La función `make_avro_serializer` construye el payload en tres pasos: el byte mágico, el ID del esquema en 4 bytes big-endian y el payload Avro generado con `fastavro.schemaless_writer`. El calificativo *schemaless* no significa que el mensaje no tenga esquema; significa que el payload binario no incluye el esquema en sí. El esquema se recupera por separado usando el ID de la cabecera.

La convención de nombrar el sujeto como `structured_rides-value` viene del ecosistema Kafka: los esquemas se registran bajo sujetos separados para la clave (`rides-key`) y el valor (`structured_rides-value`) del mensaje.

Para lanzar el productor Avro hay un atajo make:

```bash
make avro-events
```

### Consumidor con Avro y registro de esquemas

La operación inversa en el consumidor es simétrica: leer los 5 bytes de cabecera, resolver el esquema consultando el registro por su ID, y deserializar el payload binario. El consumidor [`avro_consumer.py`](./pipelines/pyflink-pipeline/src/consumers/avro_consumer.py) implementa este flujo con una caché de esquemas para evitar consultar el registro en cada mensaje:

```python
import json
import os
import struct
import sys
from io import BytesIO
from pathlib import Path

import fastavro
import requests
from dotenv import load_dotenv
from kafka import KafkaConsumer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import Ride

load_dotenv()

SCHEMA_REGISTRY_URL = os.getenv('SCHEMA_REGISTRY_URL', 'http://localhost:18081')


def fetch_schema(schema_id: int) -> dict:
    response = requests.get(f'{SCHEMA_REGISTRY_URL}/schemas/ids/{schema_id}')
    response.raise_for_status()
    return fastavro.parse_schema(json.loads(response.json()['schema']))


def make_avro_deserializer():
    schema_cache = {}

    def deserialize(data: bytes) -> Ride:
        buf = BytesIO(data)
        magic = buf.read(1)
        if magic != b'\x00':
            raise ValueError(f'Byte mágico inesperado: {magic!r}')

        schema_id = struct.unpack('>I', buf.read(4))[0]
        if schema_id not in schema_cache:
            schema_cache[schema_id] = fetch_schema(schema_id)

        record = fastavro.schemaless_reader(buf, schema_cache[schema_id])
        return Ride(**record)

    return deserialize


def main():
    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    consumer = KafkaConsumer(
        'rides',
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        auto_offset_reset='earliest',
        group_id='rides-avro-console',
        value_deserializer=make_avro_deserializer()
    )

    for message in consumer:
        ride = message.value
        print(ride)
```

La función `make_avro_deserializer` devuelve un closure que mantiene un diccionario `schema_cache` entre llamadas. La primera vez que llega un mensaje con un schema ID concreto, el consumidor consulta el registro y almacena el esquema parseado. Las llamadas siguientes con el mismo ID usan el esquema ya cacheado, sin ninguna petición HTTP adicional.

El endpoint del registro de esquemas que se consulta es `/schemas/ids/{id}`, que devuelve el esquema como string JSON bajo la clave `schema`. Una vez parseado con `fastavro.parse_schema`, está listo para ser usado en `fastavro.schemaless_reader`, que reconstruye el diccionario Python a partir del payload binario.

Para lanzar el consumidor Avro hay un atajo make:

```bash
make avro-consumer
```

### Cómo lee Flink los mensajes Avro

Los trabajos que creamos en el capítulo anterior usan `'format' = 'json'` en el DDL. Para leer mensajes Avro con registro de esquemas, el único cambio necesario es en el bloque `WITH` de la tabla fuente:

```sql
CREATE TABLE events (
    PULocationID INTEGER,
    DOLocationID INTEGER,
    trip_distance DOUBLE,
    total_amount DOUBLE,
    tpep_pickup_datetime BIGINT
) WITH (
    'connector' = 'kafka',
    'properties.bootstrap.servers' = 'redpanda:29092',
    'topic' = 'structured_rides',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'avro-confluent',
    'avro-confluent.url' = 'http://redpanda:8081'
)
```

El conector `avro-confluent` sabe leer el formato de cable Confluent: extrae el schema ID de la cabecera del mensaje, consulta el registro de esquemas, obtiene el esquema y deserializa el payload binario. Todo esto es transparente al SQL que escribe las transformaciones: la query `INSERT INTO ... SELECT ...` no cambia en absoluto.

Para usar este conector hace falta el JAR `flink-avro-confluent-registry`, que ya está incluido en el [`flink.Dockerfile`](./pipelines/pyflink-pipeline/flink.Dockerfile) junto al resto de conectores:

```dockerfile
RUN wget https://repo.maven.apache.org/maven2/org/apache/flink/flink-avro-confluent-registry/2.2.0/flink-avro-confluent-registry-2.2.0.jar
```

Esta separación entre estructura lógica y formato físico es una de las ventajas de la Table API de Flink: cambiar de JSON a Avro es una modificación de configuración, no una reescritura del trabajo.

### Compatibilidad y evolución de esquemas

El valor real del registro de esquemas se aprecia cuando los esquemas necesitan cambiar. Supongamos que queremos añadir un campo `passenger_count`. En Avro, un nuevo campo con valor por defecto es retrocompatible: los consumidores que aún usen el esquema viejo simplemente ignorarán el campo desconocido, y los mensajes producidos con el esquema viejo no incluirán el campo, por lo que el consumidor nuevo usará el valor por defecto.

El registro de esquemas puede verificar esta compatibilidad automáticamente. Existen tres modos:

* **BACKWARD**: los consumidores con el esquema nuevo pueden leer mensajes producidos con el esquema viejo. Se pueden añadir campos con valor por defecto o eliminar campos opcionales.
* **FORWARD**: los consumidores con el esquema viejo pueden leer mensajes producidos con el esquema nuevo. Se pueden añadir campos opcionales.
* **FULL**: compatible en ambas direcciones. Es el modo más restrictivo pero el más seguro.

Para configurar el modo de compatibilidad de un sujeto basta una llamada HTTP al registro de esquemas:

```bash
curl -X PUT http://localhost:18081/config/structured_rides-value \
    -H 'Content-Type: application/vnd.schemaregistry.v1+json' \
    -d '{"compatibility": "BACKWARD"}'
```

A partir de ese momento, cualquier intento de registrar un esquema incompatible para `structured_rides-value` devolverá un error antes de que el productor llegue a enviar un solo mensaje. Es el mismo principio que un test de integración, pero aplicado al contrato de datos en lugar de al código.
