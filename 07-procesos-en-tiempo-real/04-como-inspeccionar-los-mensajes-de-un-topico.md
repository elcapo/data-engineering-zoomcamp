# Procesos en tiempo real

## Cómo inspeccionar mensajes de un `topic` de Kafka usando `offset`s

Cuando trabajamos con **Apache Kafka**, una de las tareas más comunes al depurar flujos de datos es **inspeccionar mensajes concretos dentro de un tópico**. En muchos casos, los errores o comportamientos inesperados están asociados a un `offset` específico dentro de una partición.

En este artículo explicamos:

- Qué son los `offset`s en Kafka.
- Cómo se relacionan con las particiones.
- Cómo inspeccionar mensajes dentro de un tópico.
- Cómo consultar mensajes antes o después de un `offset` específico.

### 1. Qué es un `offset` en Kafka

En Kafka, cada mensaje dentro de una **partición** tiene un número incremental llamado `offset`:

- El `offset` es **único dentro de cada partición**.
- No existe un `offset` global para todo el topic.
- Los consumidores usan `offset`s para recordar **qué mensajes ya han procesado**.

#### Ejemplo:

| Partition | Offset | Message |
|-----------|--------|--------|
| 0 | 0 | event A |
| 0 | 1 | event B |
| 0 | 2 | event C |

En este caso, un consumidor que ha leído hasta el offset `1` comenzará en `2` cuando continúe.

### 2. Por qué los `offset`s son útiles para depuración

Cuando ocurre un error en un flujo de datos en tiempo real es habitual encontrar mensajes como:

> Error processing message at offset 4839201

Si podemos inspeccionar los mensajes cercanos a ese `offset` podremos:

- Ver qué datos causaron el error.
- Entender qué ocurrió antes y después.
- Reproducir el problema localmente.

### 3. Ver `offset`s y lag de consumidores

Para ver hasta dónde ha leído un consumidor se puede usar:

```bash
kafka-consumer-groups \
    --bootstrap-server localhost:9092 \
    --describe \
    --group rides-to-postgres
```

```bash
docker run --rm -it --network pyflink_default confluentinc/cp-kafka:7.6.0 kafka-consumer-groups \
    --bootstrap-server redpanda:29092 \
    --describe \
    --group rides-to-postgres
```

El significado de los argumentos es:

- `--bootstrap-server` para especificar el broker.
- `--describe` para pedir información sobre un grupo de consumidores.
- `--group [grupo]` para especificar el grupo de consumidores sobre el que queremos información.

Una salida típica en nuestro flujo de datos puede ser:

```
GROUP             TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG             CONSUMER-ID                                             HOST            CLIENT-ID
rides-to-postgres rides           0          27              27              0               kafka-python-2.3.0-0d42c17a-052c-4770-8326-52cf2537e6d4 172.19.0.1      kafka-python-2.3.0
rides-to-postgres rides           1          25              25              0               kafka-python-2.3.0-0d42c17a-052c-4770-8326-52cf2537e6d4 172.19.0.1      kafka-python-2.3.0
rides-to-postgres rides           2          21              21              0               kafka-python-2.3.0-0d42c17a-052c-4770-8326-52cf2537e6d4 172.19.0.1      kafka-python-2.3.0
```

Campos importantes:

- **CURRENT-OFFSET**: último `offset` procesado por el consumidor
- **LOG-END-OFFSET**: último `offset` disponible en el topic
- **LAG**: mensajes pendientes por procesar

### 4. Consumir mensajes desde el principio del topic

Para inspeccionar todos los mensajes de un topic:

```bash
kafka-console-consumer \
    --bootstrap-server localhost:9092 \
    --topic rides \
    --from-beginning
```

Alternativamente, puedes usar `kafka-console-consumer` desde una imagen Docker:

```bash
docker run --rm -it --network pyflink_default confluentinc/cp-kafka:7.6.0 kafka-console-consumer \
    --bootstrap-server redpanda:29092 \
    --topic rides \
    --from-beginning
```

El significado de los argumentos es:

- `--bootstrap-server` para especificar el broker.
- `--topic [topico]` para especificar el tópico a consultar.
- `--from-beginning` para pedir todos los mensajes desde el inicio del tópico.

Esto es útil para exploración básica, pero no permite saltar a `offset`s concretos.

### 5. Inspeccionar mensajes desde un offset específico

Una herramienta muy útil para debugging es **kcat** (antes kafkacat).

#### Ejemplo:

```bash
kcat -C \
    -b localhost:9092 \
    -t rides \
    -p 0 \
    -o 25 \
    -c 5
```

También puedes usar `kcat` desde una imagen Docker para no tener que instalarlo localmente:

```bash
docker run --network pyflink_default edenhill/kcat:1.7.1 -C \
    -b redpanda:29092 \
    -t rides \
    -p 0 \
    -o 25 \
    -c 5
```

El significado de los argumentos es:

- modo consumidor `-C`
- broker `-b`: localhost:9092 (ó redpanda:29092 desde una red Docker)
- topic `-t`: rides
- partition `-p`: 0
- empezar en offset `-o`: 25
- leer hasta contar `-c`: 5 mensajes

Esto permite ver exactamente qué ocurre a partir de un `offset` concreto.

### Conclusión

Saber inspeccionar mensajes usando `offset`s es una habilidad fundamental para trabajar con Kafka. Permite comprender qué ocurre dentro de un topic y depurar pipelines de datos de forma eficiente. Herramientas como **kcat** o los comandos de Kafka CLI facilitan explorar mensajes concretos y entender el estado de los consumidores.
