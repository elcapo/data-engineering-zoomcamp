# Streaming y batch en el mismo warehouse

El pipeline tiene dos productores que escriben a la misma tabla. Uno es Flink, que consume mediciones de aire en streaming desde un topic de Redpanda y aterriza filas hora a hora con datetimes de "ahora". El otro es Spark, que tira de un dump S3 público y hace backfill de años enteros con datetimes de 2018, 2020, 2023. Ambos usan `INSERT ... ON CONFLICT DO NOTHING` contra `raw.openaq_measurements`.

Este artículo explica por qué no hace falta más infra que una primary key bien elegida para que los dos coexistan sin pisarse.

## El problema

OpenAQ tiene dos formas de obtener datos: la API HTTP, que devuelve mediciones recientes (típicamente las últimas semanas), y un dump S3 público que tiene el archivo histórico completo desde 2016. El primero es la fuente natural para el modo streaming: pollea cada pocos minutos, publica en Redpanda, Flink agrega y escribe. El segundo es la fuente natural para el bootstrap: lees el dump una vez, escribes años de datos en horas, listo.

La pregunta es: **¿escribimos a tablas separadas o a la misma?**

Tablas separadas (una para streaming, otra para batch) parece más limpio. Cada productor controla su propio schema, sus propios particionados, sus propios upserts. No hay riesgo de race condition. Pero entonces los modelos dbt aguas abajo necesitan hacer `union all` de las dos tablas en cada query, y la tabla de "datos completos" sólo existe como vista materializada.

La misma tabla, en cambio, hace que la vista canónica sea trivial: `select * from raw.openaq_measurements`. El precio es decidir cómo evitar conflictos cuando ambos productores quieren escribir el mismo `(location_id, parameter, datetime_utc)`.

## La elección de la PK

La primary key de la tabla es `(location_id, parameter, datetime_utc)`. La elección no es accidental. Es **la tupla que identifica unívocamente una observación física**: el sensor X de la estación Y midió Z para el contaminante P en el instante T. Cualquier otro campo (el nombre legible de la estación, el ISO2 del país, las coordenadas) es metadata que se deriva de esos tres.

Cuando Flink escribe una fila para `(2178, 'pm25', '2026-05-01 14:00:00')` y Spark intenta escribir más tarde la misma tupla desde el dump, **tiene que ser un no-op**. Ambos están reportando la misma observación. La PK garantiza que la BD lo sepa.

Para que sea no-op y no error, ambos pipelines escriben con `ON CONFLICT (location_id, parameter, datetime_utc) DO NOTHING`. Postgres se traga el insert duplicado sin chistar. BigQuery hace el equivalente con `MERGE ... WHEN NOT MATCHED`. La cardinalidad de duplicados que llegan a chocar es baja en la práctica (los dos productores cubren ventanas temporales distintas), pero la garantía está ahí para cuando coinciden.

## Cómo coexisten en la práctica

Las ventanas temporales que cubren los dos productores apenas se solapan:

- **Flink** escribe siempre con `datetime_utc = ahora` (por la naturaleza del polling de la API). En 2026, todas las filas que mete tienen timestamps de 2026.
- **Spark** escribe lo que pide el operador. El smoke test usa `--years 2023`, así que escribe filas de 2023. El backfill completo cubre 2016-2025.

Si Spark también pide 2026, hay solape parcial — pero la PK lo absorbe. El primer escritor gana, el segundo es no-op. **Ningún productor sabe del otro**, lo cual es la propiedad importante: añadir un tercer productor (un loader desde otra fuente) no exigiría tocar Flink ni Spark.

Hay dos consecuencias prácticas que conviene escribir en código:

**1. El smoke test del slice de Spark no debería hacer `DELETE`.** Un primer intento del smoke test borraba `WHERE location_id IN (...)` antes de cada corrida para garantizar que la insert "fuera nueva". Eso era lógicamente correcto pero peligroso: si Flink había estado polling esa estación durante días, el `DELETE` se llevaba datos vivos. La versión actual asierta en una ventana temporal donde sólo Spark escribe (`datetime_utc IN [2023-01-01, 2024-01-01)`). Es no-destructiva por diseño.

**2. Los conteos no son un buen check de "¿el job hizo algo?".** Si Spark mete 53277 filas que ya estaban (porque otro pipeline las metió antes), el `cur.rowcount` post-INSERT devuelve 0. Eso no significa que el job esté roto, significa que la idempotencia funciona. Para verificar que el job procesó datos, el smoke test mira el log de Spark (`Normalized N rows`) además del state final de la BD. Dos señales independientes.

## Lo que no se delega a la PK

La PK absorbe los conflictos de inserción, pero no resuelve dos cosas que deben quedar fuera:

**Late-arriving updates.** Si OpenAQ corrige una medición histórica (añade calibración, recalcula valor), el dump S3 va a tener el valor nuevo y la BD el viejo. El `ON CONFLICT DO NOTHING` se queda con el viejo. Para esos casos hay que cambiar a `ON CONFLICT DO UPDATE SET value = EXCLUDED.value WHERE EXCLUDED.value IS DISTINCT FROM raw.value`. No lo he metido todavía porque OpenAQ rara vez corrige histórico, pero está documentado como follow-up.

**Bookkeeping de procedencia.** La tabla actual no tiene una columna `source` que distinga "viene de Flink" vs "viene de Spark". Saber esto es útil para depurar (¿qué pipeline metió esta fila?) pero no para la query analítica (a la pregunta del proyecto le da igual). Si en algún momento es importante, la columna se añade barata: `source TEXT NOT NULL DEFAULT 'flink'` con un default distinto en el insert de Spark. La PK no se ve afectada.

## La lección

La fusión de streaming y batch es un problema clásico de arquitectura de datos (Lambda, Kappa, todas las variantes con sus propios apologistas). En este proyecto la resolvió una primary key bien pensada y dos líneas de SQL (`ON CONFLICT DO NOTHING`). No es una solución que escale a todos los casos —si los productores escribieran a velocidades muy distintas, o si la tabla tuviera 10⁹ filas, las locks de la PK podrían convertirse en cuello de botella—, pero a esta escala (millones de filas, no miles de millones) es adecuada y, sobre todo, comprensible. Una hora de pensar la PK ahorra semanas de pelearse con un deduper externo.
