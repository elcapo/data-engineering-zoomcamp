# Procesos en tiempo real

## Modos de lectura de Kafka en PyFlink: cuándo empezar y cuándo parar

En todos los trabajos que hemos escrito hasta ahora hay una línea que hemos repetido sin detenernos demasiado en ella:

```sql
'scan.startup.mode' = 'earliest-offset'
```

Pero este parámetro no es el único que controla cómo Flink se conecta a un tópico. Junto a él aparecen `scan.bounded.mode` y `properties.auto.offset.reset` y la combinación de los tres determina algo fundamental: desde qué punto del historial del tópico lee el trabajo y cuándo para. Eligiendo bien estos parámetros podemos construir trabajos radicalmente distintos con el mismo código de transformación.

### El modelo de offsets en Kafka

Antes de ver los parámetros conviene tener claro cómo Kafka almacena los mensajes. Cada tópico se divide en una o varias **particiones**. Dentro de cada partición, los mensajes se guardan en orden y se identifican con un número entero que crece de forma monótona: el **offset**. El offset `0` es el primer mensaje que llegó, el `1` el segundo, y así sucesivamente.

#### High watermark

El **high watermark** es el offset del siguiente mensaje que se escribirá, es decir, el límite del historial disponible en este momento. Cuando un consumidor llega a este punto y no hay mensajes nuevos, simplemente espera.

Kafka no impone que un consumidor empiece desde el principio ni que procese todos los mensajes. Puede empezar desde cualquier offset. Esto es lo que hace posible que distintos trabajos lean el mismo tópico desde posiciones diferentes de forma completamente independiente.

#### Retención: el historial no es infinito

Decir que `earliest-offset` lee desde el principio del tópico es correcto pero con un matiz importante: Kafka no guarda los mensajes para siempre. Aplica una política de retención que elimina los mensajes más antiguos según dos criterios posibles:

* Por **tiempo** (`retention.ms`): los mensajes se eliminan una vez transcurrido el período configurado. El valor por defecto es **7 días** (604.800.000 ms), que es exactamente el que vemos en la configuración del tópico `green-trips` de nuestro entorno.

* Por tamaño** (`retention.bytes`): cuando el tópico supera el límite en bytes, se eliminan los segmentos más antiguos para hacer hueco.

Esto tiene consecuencias directas para los modos de lectura:

* **`earliest-offset`** no garantiza acceso a todos los mensajes históricos sino solo a los que Kafka aún no ha eliminado. Si el productor publicó datos hace más de 7 días y nadie los leyó, ya no están disponibles.

* Un trabajo con **`group-offsets`** que estuvo parado más tiempo del período de retención puede encontrarse con que los offsets a los que quería retomar ya no existen. En ese caso Kafka no puede seguir desde ahí y cae al comportamiento de `properties.auto.offset.reset`.

Existe también una política alternativa a la retención por tiempo o tamaño: la **compactación** (`cleanup.policy = compact`). Un tópico compactado no elimina mensajes por antigüedad sino que conserva solo el **último mensaje por cada clave**. Es el patrón adecuado para modelar el estado actual de entidades (el último precio de un producto, la última posición de un vehículo): el tópico funciona como un changelog del que siempre se puede reconstruir el estado presente leyendo desde `earliest-offset`, sin importar cuánto tiempo lleve el tópico activo.

### Dónde empezar a leer

El parámetro `scan.startup.mode` en el DDL del conector Kafka de Flink controla en qué offset arranca el trabajo la primera vez que se conecta a cada partición. Sus valores posibles son:

**`latest-offset`**: el trabajo empieza a leer a partir del momento en que arranca, ignorando todo el historial previo. Es el modo adecuado para monitores en tiempo real donde el historial no tiene sentido: dashboards, alertas, replicación de estado actual.

```sql
'scan.startup.mode' = 'latest-offset'
```

Así lo configura [`pass_through_job.py`](./pipelines/pyflink-pipeline/src/jobs/pass_through_job.py): su función es trasladar eventos al vuelo a PostgreSQL. Los datos anteriores al arranque del trabajo no son relevantes.

**`earliest-offset`**: el trabajo empieza desde el mensaje más antiguo disponible en el tópico. Es el modo adecuado cuando el trabajo necesita ver todo el historial: poblar una tabla de agregados desde cero, calcular métricas históricas o reentrenar un modelo.

```sql
'scan.startup.mode' = 'earliest-offset'
```

Lo usan [`aggregated_pickup_job.py`](./pipelines/pyflink-pipeline/src/jobs/aggregated_pickup_job.py), [`aggregated_longest_streak_job.py`](./pipelines/pyflink-pipeline/src/jobs/aggregated_longest_streak_job.py) y [`aggregated_tips_per_hour_job.py`](./pipelines/pyflink-pipeline/src/jobs/aggregated_tips_per_hour_job.py): todos calculan agregados sobre el dataset completo.

**`group-offsets`**: el trabajo retoma la lectura desde el último offset que confirmó en su ejecución anterior. Es el modo que permite que un trabajo se recupere de un fallo o reinicio sin reprocesar datos ni perderlos. Requiere que el trabajo tenga un `group.id` configurado para que Kafka pueda almacenar y recuperar sus offsets.

```sql
'scan.startup.mode' = 'group-offsets',
'properties.group.id' = 'mi-trabajo-flink'
```

Si el grupo ya tiene offsets guardados (de una ejecución anterior), Flink continúa desde ahí. Si no los tiene (primera ejecución, o grupo nuevo), Kafka necesita saber qué hacer: para eso existe `properties.auto.offset.reset`.

**`timestamp`**: el trabajo empieza a leer desde el primer mensaje cuyo timestamp de producción sea igual o posterior a un instante dado. Permite reprocesar a partir de un punto en el tiempo sin conocer los offsets exactos, lo que resulta útil cuando se detecta un problema en los datos a partir de cierta hora.

```sql
'scan.startup.mode' = 'timestamp',
'scan.startup.timestamp-millis' = '1748822400000'
```

**`specific-offsets`**: permite indicar el offset de arranque para cada partición individualmente. Es el modo más granular, útil en escenarios de depuración o cuando se necesita reprocesar exactamente desde un punto conocido.

```sql
'scan.startup.mode' = 'specific-offsets',
'scan.startup.specific-offsets' = 'partition:0,offset:100;partition:1,offset:200'
```

### properties.auto.offset.reset: el fallback del cliente Kafka

Este parámetro no es de Flink sino del cliente Kafka subyacente, y solo entra en juego cuando `scan.startup.mode = 'group-offsets'` y el grupo no tiene offsets guardados. En ese caso, Kafka no sabe desde dónde empezar y consulta esta propiedad:

* `'earliest'`: comienza desde el principio del tópico, como `earliest-offset`.
* `'latest'`: comienza desde el final, ignorando el historial, como `latest-offset`.

```sql
'scan.startup.mode' = 'group-offsets',
'properties.group.id' = 'mi-trabajo-flink',
'properties.auto.offset.reset' = 'earliest'
```

> [!NOTE]
> Cuando `scan.startup.mode` es `earliest-offset` o `latest-offset`, el parámetro `properties.auto.offset.reset` no tiene ningún efecto: Flink ya sabe dónde empezar sin consultarlo. Que ambos parámetros aparezcan juntos en el código puede confundir, pero no interfieren entre sí.

### Cuándo parar de leer

Por defecto, un trabajo Flink que lee de Kafka es un trabajo **sin límite** (*unbounded*): cuando alcanza el último mensaje disponible no termina, sino que se queda esperando nuevos mensajes indefinidamente. Este es el comportamiento deseable para pipelines en producción que procesan eventos continuamente.

Pero hay casos en los que queremos que el trabajo se detenga una vez procesados los mensajes existentes: recalcular agregados históricos, validar un nuevo pipeline contra datos reales antes de desplegarlo, o resolver preguntas analíticas sobre un snapshot del tópico. Para estos casos existe `scan.bounded.mode`.

**`latest-offset`**: el trabajo lee hasta el offset más reciente de cada partición en el momento de arrancar y luego termina. Los mensajes que lleguen después de arrancar el trabajo no se procesan.

```sql
'scan.bounded.mode' = 'latest-offset'
```

Es lo que usan nuestros trabajos de agregación histórica: producimos todos los eventos, arrancamos el trabajo, y Flink procesa exactamente esos eventos y termina.

**`group-offsets`**: el trabajo lee hasta los offsets que tenga guardados el grupo de consumidores indicado. Útil para procesar exactamente lo que un grupo ya confirmó sin volver a procesar lo mismo.

**`timestamp`**: el trabajo lee hasta el primer mensaje cuyo timestamp sea posterior al instante indicado.

```sql
'scan.bounded.mode' = 'timestamp',
'scan.bounded.timestamp-millis' = '1748908800000'
```

> [!WARNING]
> `scan.bounded.mode = 'latest-offset'` captura el high watermark **en el momento de arrancar el trabajo**, no el de cuando termina de arrancar. Esto tiene una consecuencia importante: si el trabajo arranca con el tópico vacío, Kafka le dirá que el límite es el offset 0 y el trabajo terminará inmediatamente sin procesar nada. El orden correcto es siempre **producir primero, arrancar el trabajo después**.

### Grupos de consumidores en Flink

Al depurar uno de nuestros trabajos intentamos listar los grupos de consumidores registrados en Redpanda:

```bash
docker compose exec redpanda rpk group list
```

El resultado fue una lista vacía, a pesar de que el trabajo estaba corriendo. Esto no es un error: el conector Kafka de Flink, cuando usa `scan.startup.mode = 'earliest-offset'` o `latest-offset`, gestiona sus offsets internamente a través del mecanismo de checkpointing de Flink. No registra ningún grupo de consumidores en Kafka porque no necesita que Kafka los almacene: los guarda él mismo en su propio estado persistente.

Para que Flink registre un grupo de consumidores visible desde herramientas como `rpk` o `kafka-consumer-groups`, hay que configurar `scan.startup.mode = 'group-offsets'` y asignar un `properties.group.id` explícito.

### Cuatro casos de uso con sus parámetros

**Monitor en tiempo real**: una alerta que dispara una notificación cuando el importe de un viaje supera un umbral. Solo interesan los viajes nuevos, el historial no tiene relevancia. El trabajo debe poder reiniciarse sin reprocesar el pasado.

```sql
'scan.startup.mode' = 'latest-offset'
```

**Ingesta histórica continua**: un pipeline que mantiene una tabla de PostgreSQL sincronizada con todos los eventos del tópico. Si el trabajo se reinicia, debe retomar donde lo dejó.

```sql
'scan.startup.mode' = 'group-offsets',
'properties.group.id' = 'ingesta-postgres',
'properties.auto.offset.reset' = 'earliest'
```

La primera vez arrancará desde el principio del tópico (porque `auto.offset.reset = 'earliest'`). Si el trabajo se cae y se reinicia, Flink continuará desde el último offset confirmado en el checkpoint.

**Procesamiento acotado de datos históricos**: un análisis puntual sobre el dataset completo, equivalente a un trabajo batch. Producimos los datos, arrancamos el trabajo y esperamos a que termine.

```sql
'scan.startup.mode' = 'earliest-offset',
'scan.bounded.mode' = 'latest-offset'
```

Es la configuración de [`aggregated_longest_streak_job.py`](./pipelines/pyflink-pipeline/src/jobs/aggregated_longest_streak_job.py) y [`aggregated_tips_per_hour_job.py`](./pipelines/pyflink-pipeline/src/jobs/aggregated_tips_per_hour_job.py).

**Reprocesado desde un momento concreto**: se detecta que los datos producidos a partir de cierta hora tenían un error. Queremos reprocesar solo esa franja.

```sql
'scan.startup.mode' = 'timestamp',
'scan.startup.timestamp-millis' = '1748822400000',
'scan.bounded.mode' = 'timestamp',
'scan.bounded.timestamp-millis' = '1748908800000'
```