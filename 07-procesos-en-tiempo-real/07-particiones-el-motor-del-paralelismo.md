# Procesos en tiempo real

## Particiones: el motor del paralelismo en Kafka

Desde el primer artículo hemos estado usando un tópico llamado `rides` sin preocuparnos demasiado por cómo está organizado internamente. En el artículo sobre inspección de mensajes vimos que el output de `kafka-consumer-groups` mostraba tres filas, una por partición. En el artículo sobre modos de lectura mencionamos `scan.startup.mode = 'specific-offsets'`, que permite indicar el offset de arranque por partición. Las particiones aparecen en todos lados pero nunca las hemos explicado en profundidad.

### Qué es una partición

Un tópico de Kafka no es un único fichero. Internamente se divide en una o varias **particiones** y cada partición es un log de "solo adición": una secuencia ordenada de mensajes que únicamente puede crecer añadiendo mensajes al final.

Cada mensaje dentro de una partición recibe un número de secuencia que crece de forma monótona: el **offset**. El offset `0` es el primer mensaje, el `1` el segundo y así sucesivamente. Los mensajes de una partición siempre se leen en el orden en que se escribieron.

Cuando hablamos de un tópico con 3 particiones, el tópico en realidad son tres logs independientes. El broker mantiene estos tres logs por separado, potencialmente en discos o nodos distintos:

```
Tópico: rides
├── Partición 0: [0, 1, 2, 3, ...]
├── Partición 1: [0, 1, 2, ...]
└── Partición 2: [0, 1, 2, 3, ...]
```

El **orden global entre particiones no está garantizado**. Kafka solo garantiza el orden dentro de cada partición. Si un productor envía tres mensajes seguidos sin clave, pueden ir a particiones distintas y ser leídos en cualquier orden relativo entre sí.

### Crear y describir tópicos con `rpk`

En nuestro entorno podemos gestionar los tópicos con `rpk`, la herramienta de línea de comandos incluida en Redpanda. Para crear el tópico `rides` con 3 particiones:

```bash
docker compose exec redpanda \
    rpk topic create rides --partitions 3 --replicas 1
```

El parámetro `--replicas` indica cuántas copias de cada partición mantiene el clúster. En un clúster de un solo nodo (como el nuestro en Docker) el valor máximo es `1`. En producción, el valor habitual es `3`: si cae un nodo, los datos siguen disponibles en las dos réplicas restantes.

Para ver cómo está distribuido el tópico:

```bash
docker compose exec redpanda rpk topic describe rides
```

La salida muestra, para cada partición, qué broker es el líder, dónde están las réplicas y hasta qué offset llega el historial disponible:

```
SUMMARY
=======
Name        rides
Partitions  3
Replicas    1

PARTITIONS
==========
Partition  Leader  Epoch  Replicas  Log Start Offset  High Watermark
0          0       1      [0]       0                 312
1          0       1      [0]       0                 347
2          0       1      [0]       0                 341
```

Los 1.000 mensajes que envía nuestro productor se han repartido aproximadamente a partes iguales entre las tres particiones.

### Cómo se asignan los mensajes a las particiones

Cuando el productor envía un mensaje **sin clave**, Kafka lo asigna a una partición usando una política de distribución uniforme (normalmente aleatoria con pegajosidad por lote, para reducir el número de peticiones al broker). El reparto es aproximadamente uniforme, lo que maximiza el paralelismo, pero no garantiza que mensajes relacionados vayan a la misma partición.

Cuando el productor envía un mensaje **con clave**, Kafka aplica una función hash sobre esa clave y el resultado determina la partición de destino. Esto garantiza que todos los mensajes con la misma clave vayan siempre a la misma partición y, por tanto, se lean en orden entre sí.

En nuestro flujo de datos de taxis esto es relevante si queremos procesar todos los viajes de una misma zona de recogida en el mismo consumidor. Podemos usar `PULocationID` como clave de partición modificando la llamada a `producer.send` en [`file_producer.py`](./pipelines/pyflink-pipeline/src/producers/file_producer.py):

```python
for _, row in dataframe.iterrows():
    ride = ride_from_row(row)
    producer.send(
        topic_name,
        key=str(ride.PULocationID).encode('utf-8'),
        value=ride
    )
```

Con esta modificación, todos los viajes recogidos en la zona `132` irán siempre a la misma partición, en el mismo orden en que se enviaron.

> [!NOTE]
> La clave de partición no tiene que coincidir con la clave de negocio del mensaje. Es simplemente el campo que queremos usar para agrupar mensajes en la misma partición. Una clave con muchos valores distintos (como `PULocationID`, que tiene 263 zonas) produce una distribución uniforme entre particiones. Una clave con pocos valores distintos puede crear **particiones calientes**: una partición que recibe muchos más mensajes que las demás y se convierte en el cuello de botella del flujo de datos.

### Orden garantizado: solo dentro de una partición

Si enviamos dos mensajes sin clave, Kafka puede enviarlos a particiones distintas, y un consumidor que lea ambas particiones puede recibirlos en cualquier orden relativo.

Con clave de partición, todos los mensajes de la misma clave van a la misma partición, lo que garantiza que el consumidor los recibe en el orden en que el productor los envió. Este es el único mecanismo de ordenación que ofrece Kafka.

Para nuestros trabajos de agregación temporal (ventanas de 5 minutos por zona), la clave de partición no es estrictamente necesaria porque Flink agrupa los eventos por clave de agrupación en su propio estado interno. Pero en un flujo de datos que necesite procesar eventos de una misma entidad en orden estricto —un sistema de estado de cuenta bancaria, una cadena de eventos de posición GPS— la clave de partición es imprescindible.

### Grupos de consumidores y reparto de particiones

Cuando varios consumidores forman un **grupo de consumidores** con el mismo `group_id`, Kafka les asigna las particiones del tópico de forma exclusiva: cada partición es asignada a exactamente un consumidor del grupo en cada momento.

Esta regla tiene consecuencias directas:

**Más particiones que consumidores**: cada consumidor lee varias particiones. Un grupo con 2 consumidores y un tópico de 3 particiones asignará 2 particiones a un consumidor y 1 al otro.

**Igual número de consumidores que particiones**: cada consumidor lee exactamente una partición. Es la configuración ideal para el máximo paralelismo.

**Más consumidores que particiones**: los consumidores sobrantes quedan **ociosos**. Un grupo con 5 consumidores y un tópico de 3 particiones dejará 2 consumidores sin trabajo. No hay ningún beneficio en añadir consumidores por encima del número de particiones.

```
Tópico: rides (3 particiones)

Con 2 consumidores:                    Con 3 consumidores:
┌─────────────────────────────┐        ┌─────────────────────────────┐
│ Consumidor A → Part. 0, 1   │        │ Consumidor A → Part. 0      │
│ Consumidor B → Part. 2      │        │ Consumidor B → Part. 1      │
└─────────────────────────────┘        │ Consumidor C → Part. 2      │
                                       └─────────────────────────────┘
```

Esta regla tiene una implicación importante para el diseño: **el número de particiones de un tópico es el límite superior de paralelismo de cualquier grupo de consumidores**. Si anticipas que tu flujo de datos necesitará 10 consumidores paralelos en producción, necesitas al menos 10 particiones desde el principio. Aumentar el número de particiones después de crear el tópico es posible, pero tiene consecuencias: los mensajes con clave pueden cambiar de partición al recalcular el hash con el nuevo número de particiones, rompiendo la garantía de orden por clave.

### Paralelismo de Flink y particiones de Kafka

En nuestro [`docker-compose.flink.yml`](./pipelines/pyflink-pipeline/docker-compose.flink.yml) hay dos parámetros que ahora tienen más sentido:

```yaml
taskmanager:
  environment:
    - |
      FLINK_PROPERTIES=
      taskmanager.numberOfTaskSlots: 15
      parallelism.default: 3
```

El `parallelism.default: 3` significa que cada operador de nuestros trabajos se ejecuta con 3 instancias en paralelo. Cuando el conector Kafka de Flink lee un tópico con paralelismo 3, asigna una o varias particiones a cada instancia del operador fuente.

Con nuestro tópico de 3 particiones y paralelismo 3, el reparto es perfecto: cada instancia del operador fuente lee exactamente una partición y procesa su flujo de forma completamente independiente:

```
Partición 0 → Operador fuente [instancia 0] → Transformación [instancia 0] → Destino
Partición 1 → Operador fuente [instancia 1] → Transformación [instancia 1] → Destino
Partición 2 → Operador fuente [instancia 2] → Transformación [instancia 2] → Destino
```

Si el tópico tuviera 6 particiones y el paralelismo fuese 3, cada instancia del operador fuente leería 2 particiones. Si el tópico tuviera 3 particiones y el paralelismo fuese 6, tres de las seis instancias quedarían sin particiones que leer.

El `taskmanager.numberOfTaskSlots: 15` define la capacidad total del TaskManager: cuántas tareas puede ejecutar en paralelo. Con paralelismo 3 y varios operadores por trabajo (fuente, transformación, agrupación, destino), un trabajo típico consume entre 3 y 9 slots. Con 15 slots disponibles, podemos correr varios trabajos simultáneamente sin que compitan por recursos.

El paralelismo por defecto se puede sobreescribir para un trabajo concreto al enviarlo:

```bash
docker compose \
    -f docker-compose.yml \
    -f docker-compose.flink.yml \
    exec jobmanager \
    ./bin/flink run \
    -py /opt/src/jobs/aggregate_job.py \
    --pyFiles /opt/src \
    -p 6 \
    -d
```

El flag `-p 6` establece el paralelismo del trabajo en 6. Si el tópico solo tiene 3 particiones, las 3 instancias de operador adicionales no tendrán particiones que leer y habrás consumido 6 slots para hacer el trabajo que 3 harían igual.

### Cuántas particiones necesita un tópico

No existe una fórmula universal, pero hay algunos principios orientativos.

**Estima el paralelismo máximo que necesitarás**. Si crees que el throughput del flujo de datos podría crecer hasta necesitar 10 instancias de Flink en paralelo, necesitas al menos 10 particiones desde el principio. Aumentar el número después tiene fricción.

**Las particiones consumen recursos en el broker**. Cada partición tiene asociados ficheros de log, índices y conexiones de red abiertas. Un tópico con cientos de particiones en un clúster pequeño puede degradar el rendimiento del broker. En nuestro entorno de desarrollo con Redpanda en Docker, valores de 3 a 10 particiones son más que suficientes.

**Los valores habituales en producción son múltiplos del número de brokers**: 3, 6, 12, 24. Esto facilita la distribución equilibrada de líderes y réplicas entre nodos.

Para nuestros flujo de datos de ejemplo, 3 particiones es el valor correcto: es el paralelismo configurado en Flink, produce un reparto de carga uniforme y no desperdicia recursos en un entorno de un solo nodo.
