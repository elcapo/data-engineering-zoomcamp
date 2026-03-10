# Procesos en tiempo real

## Entorno y primeros pasos con Kafka

* Vídeo original (en inglés): [Stream Processing with PyFlink](https://www.youtube.com/live/YDUgFeHQzJU)

En este capítulo ponemos en marcha el entorno de desarrollo y escribimos nuestro primer productor y consumidor de Kafka en Python. El objetivo es entender el mecanismo básico de la mensajería por eventos antes de añadir la complejidad de Flink.

### El modelo de datos: viajes de taxi

Como conjunto de datos usaremos los registros de viajes de taxi de Nueva York ([TLC Trip Record Data](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)), concretamente los datos de taxis amarillos de noviembre de 2025. De cada viaje nos interesa solo un subconjunto de columnas:

```python
columns = ['PULocationID', 'DOLocationID', 'trip_distance', 'total_amount', 'tpep_pickup_datetime']
```

La idea narrativa es sencilla: imaginamos que cada uno de estos viajes es un evento generado en tiempo real por el teléfono de un pasajero. En el momento en que sube al taxi, su aplicación envía al sistema un mensaje con dónde fue recogido, a dónde va, la distancia estimada y el importe. Esos mensajes son los que publicaremos en nuestro tópico de Kafka.

Para representar estos eventos de forma estructurada, definimos una clase Python usando `dataclass`:

```python
from dataclasses import dataclass

@dataclass
class Ride:
    PULocationID: int
    DOLocationID: int
    trip_distance: float
    total_amount: float
    tpep_pickup_datetime: int  # época en milisegundos
```

Separamos esta definición en un fichero [`src/models.py`](./pipelines/pyflink-pipeline/src/models.py), junto con las funciones auxiliares que la acompañan: una para convertir una fila de pandas en un `Ride`, y otra para serializar y deserializar instancias de `Ride` a JSON:

```python
import json
import dataclasses
from dataclasses import dataclass

@dataclass
class Ride:
    PULocationID: int
    DOLocationID: int
    trip_distance: float
    total_amount: float
    tpep_pickup_datetime: int  # época en milisegundos

def ride_from_row(row):
    return Ride(
        PULocationID=int(row['PULocationID']),
        DOLocationID=int(row['DOLocationID']),
        trip_distance=float(row['trip_distance']),
        total_amount=float(row['total_amount']),
        tpep_pickup_datetime=int(row['tpep_pickup_datetime'].timestamp() * 1000),
    )

def ride_serializer(ride: Ride) -> bytes:
    return json.dumps(dataclasses.asdict(ride)).encode('utf-8')

def ride_deserializer(data: bytes) -> Ride:
    return Ride(**json.loads(data.decode('utf-8')))
```

La **serialización** convierte el objeto Python en una secuencia de bytes (JSON codificado en UTF-8) que Kafka puede almacenar. La **deserialización** hace el proceso inverso: transforma esos bytes de vuelta en un objeto `Ride` cuando el consumidor los recibe.

### Entorno con Docker Compose

Antes de escribir código, necesitamos Redpanda (nuestro broker de Kafka) y PostgreSQL corriendo localmente. Lo hacemos con Docker Compose.

El fichero [`docker-compose.yml`](./pipelines/pyflink-pipeline/docker-compose.yml) define cuatro servicios (los dos de Flink los añadiremos más adelante):

```yaml
services:
  redpanda:
    image: redpandadata/redpanda:v25.3.9
    ports:
      - ${REDPANDA_PORT:-9092}:9092
    command:
      - redpanda start
      - --smp 1
      - --memory 1G
      - --overprovisioned
      - --node-id 0
      - --kafka-addr PLAINTEXT://0.0.0.0:29092,OUTSIDE://0.0.0.0:9092
      - --advertise-kafka-addr PLAINTEXT://redpanda:29092,OUTSIDE://localhost:9092

  postgres:
    image: postgres:18
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    ports:
      - ${POSTGRES_PORT:-5432}:5432
```

Redpanda expone **dos puertos con propósitos distintos**: el `9092` es el que usaremos desde nuestro código Python corriendo en el host (fuera de Docker); el `29092` es el que usarán los contenedores internos (como los trabajos de Flink) para comunicarse entre sí. Esta distinción es importante cuando configuremos los trabajos de Flink.

Para arrancar los servicios:

```bash
docker compose up -d
```

### Dependencias Python

Usamos `uv` para gestionar las dependencias del proyecto. Necesitamos tres librerías:

```bash
uv add kafka-python pandas pyarrow
```

* `kafka-python`: el cliente Python para conectarse al protocolo Kafka.
* `pandas`: para leer el fichero Parquet con los datos de taxis.
* `pyarrow`: motor necesario para que pandas pueda leer ficheros en formato Parquet.

La carpeta [pipelines/pyflink-pipeline](./pipelines/pyflink-pipeline/) es un proyecto `uv` ya configurado, por lo que puedes, alternativamente, usar:

```bash
cd pipelines/pyflink-pipeline

# Instala las dependencias de Python
uv sync

# Inicia los servicios, crea las tablas en Postgres y crea el tópico en RedPanda
make initialize
```

### El productor

El productor, [`file_producer.py`](./pipelines/pyflink-pipeline/src/producers/file_producer.py), lee los primeros 1.000 viajes del fichero de datos y los envía al tópico `rides` uno a uno, con una pequeña pausa entre cada envío para simular el flujo en tiempo real:

```python
import os
import sys
import time
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from kafka import KafkaProducer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import ride_from_row, ride_serializer

load_dotenv()

def load_producer():
    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    producer = KafkaProducer(
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        value_serializer=ride_serializer
    )

    url = "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-11.parquet"
    columns = ['PULocationID', 'DOLocationID', 'trip_distance', 'total_amount', 'tpep_pickup_datetime']
    local_path = Path(__file__).parent / 'data' / 'yellow_tripdata_2025-11.parquet'

    if local_path.exists():
        dataframe = pd.read_parquet(local_path, columns=columns).head(1000)
    else:
        print('El fichero no fue encontrado localmente, por lo que será descargado. Esto puede tardar unos minutos...')
        local_path.parent.mkdir(exist_ok=True)
        dataframe = pd.read_parquet(url, columns=columns).head(1000)
        dataframe.to_parquet(local_path, index=False)

    return producer, dataframe

def main(producer, dataframe):
    topic_name = 'rides'

    for _, row in dataframe.iterrows():
        ride = ride_from_row(row)
        print(ride)
        producer.send(topic_name, value=ride)
        time.sleep(0.01)

if __name__ == "__main__":
    producer, dataframe = load_producer()
    print('Productor iniciado. Enviando datos...')

    try:
        main(producer, dataframe)
        print('¡Todos los datos fueron enviados con éxito!')
    except KeyboardInterrupt:
        print("\n¡El productor fue detenido!")

    producer.flush()
```

El `KafkaProducer` recibe la dirección del broker (`localhost:9092`, que es el puerto externo de Redpanda) y la función de serialización que convierte cada `Ride` en bytes. La llamada a `producer.flush()` al final garantiza que todos los mensajes pendientes se envíen antes de que el proceso termine.

El bucle `for` recorre el dataframe de pandas fila a fila, convierte cada fila en un `Ride` con `ride_from_row` y lo publica en el tópico. Es deliberadamente simple: en producción, este código podría estar dentro de una app móvil, un servidor web o cualquier sistema que genere eventos.

### El consumidor básico

El consumidor, [`dummy_consumer.py`](./pipelines/pyflink-pipeline/src/consumers/dummy_consumer.py), es el proceso que está al otro extremo del tópico, leyendo mensajes a medida que llegan:

```python
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from kafka import KafkaConsumer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import ride_deserializer

load_dotenv()

def main():
    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    consumer = KafkaConsumer(
        'rides',
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        auto_offset_reset='earliest',
        group_id='rides-console',
        value_deserializer=ride_deserializer
    )

    for message in consumer:
        ride = message.value
        print(ride)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n¡El consumidor fue detenido!")
```

Hay dos parámetros importantes en la configuración del consumidor:

* `auto_offset_reset='earliest'`: si el consumidor se conecta por primera vez (sin offset guardado), leerá desde el principio del tópico. Si usáramos `'latest'`, solo leería los mensajes nuevos.
* `group_id`: el identificador del grupo de consumidores. Dos consumidores con el mismo `group_id` cooperan repartiendo el trabajo. Dos consumidores con `group_id` distintos leen el tópico de forma completamente independiente, cada uno recibiendo todos los mensajes.

El bucle `for message in consumer` es bloqueante y se ejecuta indefinidamente: el consumidor espera mensajes y los procesa en cuanto llegan. Si no hay mensajes nuevos, el bucle simplemente espera.

### Consumidor con escritura a PostgreSQL

Un consumidor, [`postgres_consumer.py`](./pipelines/pyflink-pipeline/src/consumers/postgres_consumer.py), que solo imprime mensajes por pantalla tiene poco valor práctico. El siguiente paso natural es **persistir los eventos en una base de datos**. Así, en lugar de perder los datos cuando el proceso termina, los guardamos para análisis posterior.

```python
import os
import sys
import psycopg2
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from kafka import KafkaConsumer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import ride_deserializer

load_dotenv()

def main():
    connection = psycopg2.connect(
        host='localhost',
        port=int(os.getenv('POSTGRES_PORT', '5432')),
        database='postgres',
        user='postgres',
        password=os.getenv('POSTGRES_PASSWORD', 'postgres')
    )

    connection.autocommit = True
    cursor = connection.cursor()

    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    consumer = KafkaConsumer(
        'rides',
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        auto_offset_reset='earliest',
        group_id='rides-to-postgres',
        value_deserializer=ride_deserializer
    )

    for message in consumer:
        ride = message.value
        print(ride)

        pickup_datetime = datetime.fromtimestamp(ride.tpep_pickup_datetime / 1000)
        cursor.execute(
            """INSERT INTO processed_events
            (PULocationID, DOLocationID, trip_distance, total_amount, pickup_datetime)
            VALUES (%s, %s, %s, %s, %s)""",
            (ride.PULocationID, ride.DOLocationID, ride.trip_distance, ride.total_amount, pickup_datetime)
        )

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n¡El consumidor fue detenido!")
```

Nótese que este consumidor tiene un `group_id` diferente al anterior (`'rides-to-postgres'` en lugar de `'rides-console'`). Esto significa que **ambos consumidores pueden correr simultáneamente** y los dos recibirán todos los mensajes del tópico, de forma independiente. Si quisiéramos que dos consumidores se repartieran el trabajo (procesando cada uno la mitad de los mensajes), necesitarían compartir el mismo `group_id`.

### Limitaciones del enfoque con Python puro

El productor y consumidor que hemos construido funcionan correctamente para casos simples, pero tienen limitaciones importantes cuando los requisitos crecen:

* **Sin tolerancia a fallos**: si el proceso del consumidor cae, los mensajes que estaba procesando en ese momento se pierden o se reprocessan al reiniciar, dependiendo de cuándo hizo commit del offset.
* **Difícil de escalar**: escalar el procesamiento requiere gestionar manualmente particiones, grupos y la coordinación entre instancias.
* **Sin soporte nativo para agregaciones temporales**: calcular cuántos viajes hubo en una zona en la última hora requiere escribir y mantener estado explícitamente.
* **Sin gestión de eventos tardíos**: si un evento llega con retraso (por ejemplo, por un fallo de red), el consumidor no tiene forma sencilla de ubicarlo en la ventana temporal correcta.

Para resolver estos problemas existe Apache Flink, que veremos en el próximo capítulo.
