# El dump de S3 vs la API en vivo

Cuando empecé el slice de Spark estaba mentalmente preparado para paginar la API de OpenAQ con cursores temporales: un script que pidiera `/measurements?date_from=2018-01-01&date_to=2018-01-31`, lo guardara, avanzara la ventana, esquivara los rate limits, manejara los reintentos. Es la forma natural de tirar histórico de una API REST.

El usuario me preguntó, antes de empezar, si OpenAQ exponía un dump. Investigué. La respuesta abreviada: **sí, en `s3://openaq-data-archive`, accesible anónimamente desde `us-east-1`**. La respuesta larga es más interesante: cuando una fuente expone un dump, hay un cambio de paradigma que afecta al diseño del pipeline, no sólo a los detalles de la implementación.

## Por qué importa que exista el dump

La diferencia entre paginar una API y leer un dump no es de eficiencia, es de **modelo de coordinación**.

- Con la API tienes que coordinarte con el rate limiter del servidor: paginar despacio, manejar 429, mantener un cursor en algún sitio para retomar si te interrumpen, hacer reintentos con backoff. Si quieres hacerlo en paralelo, multiplicas la complejidad: hay que repartir las ventanas entre workers, cada uno con su propio rate limit budget.
- Con el dump leés ficheros estáticos. No hay servidor que enojar, no hay cursor que mantener, no hay 429. Si un fichero tarda en bajar, abres más conexiones. Si querés parallelizarlo, lo hace Spark trivialmente: 200 workers leyendo 200 prefijos de S3 distintos, nadie se queja.

El dump también es **inmutable a nivel de partición**: una vez que `locationid=2178/year=2023/month=01/day=01.csv.gz` está publicado, no cambia. Eso significa que los re-runs son trivialmente idempotentes, sin necesidad de cursor de "última vez que llegué hasta aquí". El job lee los mismos ficheros y produce los mismos bytes.

## El layout que esperaba vs el que encontré

OpenAQ documenta que el dump vive en `records/csv.gz/locationid={N}/year={Y}/`. Eso es un layout perfecto para Spark: cada `(location, year)` es una partición natural, y al pasarle al lector una glob como `s3a://openaq-data-archive/records/csv.gz/locationid=2178/year=2023/`, Spark recorre el subárbol entero (incluyendo `month=*/day=*/...`) sin que yo me entere.

El esquema de las CSVs no estaba documentado con la misma claridad. Bajé un fichero a mano para verlo:

```
location_id,sensors_id,location,datetime,lat,lon,parameter,units,value
2178,3919,Del Norte-2178,2023-01-01T01:00:00-07:00,35.13,-106.58,pm10,µg/m³,45.0
```

Ahí estaban las cosas que me esperaba (location_id, parameter, value, datetime) con nombres ligeramente distintos a los que usaba mi schema (`sensors_id` vs `sensor_id`, `units` vs `unit`, `lat`/`lon` vs `latitude`/`longitude`). Eso me llevó a una decisión de diseño que resultó útil: **el job no asume nombres de columnas exactos, los resuelve por aliases**.

```python
_COLUMN_ALIASES = {
    "location_id":  ("location_id", "locationid", "locations_id"),
    "sensor_id":    ("sensors_id", "sensor_id", "sensorid"),
    "datetime_utc": ("datetime", "datetime_utc", "utc"),
    "latitude":     ("lat", "latitude"),
    ...
}
```

Si OpenAQ cambia de `sensors_id` a `sensor_id` en una versión futura del dump, el job sigue funcionando sin tocar código. Si cambia a algo que no está en la lista, el job falla con un mensaje claro que lista las columnas disponibles. Eso es estrictamente mejor que cualquier otra opción: ni romperse en silencio, ni hardcodear los nombres exactos.

## Las dos sorpresas

**Datetimes con offset, no con Z.** El campo `datetime` viene con `2023-01-01T01:00:00-07:00`, no con `2023-01-01T01:00:00Z`. La diferencia importa: `to_timestamp(col)` de Spark sin un patrón explícito acepta el formato corto `yyyy-MM-dd HH:mm:ss` por defecto, pero **silenciosamente devuelve NULL** para ISO 8601 con offset. La primera corrida del smoke test escribió 0 filas en Postgres y 42 ficheros Parquet (todos con cabecera y sin datos). Tardé en darme cuenta porque Parquet vacío sigue siendo Parquet — el smoke test lo contaba como éxito.

La solución fue un patrón explícito (`yyyy-MM-dd'T'HH:mm:ssXXX`) y una sesión de Spark fijada a UTC para que la conversión a `TIMESTAMP` sea determinista. Una línea en el job, dos en la sesión. Pero el debug fue largo: el síntoma (0 filas insertadas) no apuntaba a la causa (parser silencioso). La lección es que el smoke test debería verificar **lo que el job dice que hizo**, no sólo el estado final de la BD. Ahora parsea el log del job buscando `Normalized N measurement rows` y exige `N >= 1`.

**Las estaciones no están donde pensaba.** Mi smoke test usaba `--locations 2178` con `--country-iso ES`. Bajé el primer CSV y descubrí que la estación 2178 estaba en Albuquerque, Nuevo México. El default era incorrecto desde el primer commit. Cambié a `--country-iso US` y a la siguiente corrida el smoke test pasó. La lección es más general: cuando una fuente externa tiene IDs numéricos, **nunca asumas el contexto**. El ID 2178 podría ser una estación de cualquier país, en cualquier continente, midiendo cualquier cosa. La única forma de saber es bajar un fichero.

## El reparto entre dump y API

Con el dump funcionando, la arquitectura quedó así:

- **Backfill histórico (Spark + dump)**: una vez, cuando arrancamos el proyecto, leemos años enteros del archivo S3 y aterrizamos millones de filas en `raw.openaq_measurements`. Sin API key, sin rate limits, sin cursor. Re-ejecutable a placer.
- **Datos vivos (productor + Flink)**: cada pocos minutos, el productor pollea la API HTTP de OpenAQ con la key del usuario, publica en Redpanda, Flink consume y aterriza en la misma tabla. Ventana temporal: las últimas semanas.
- **Solapamiento**: ninguno significativo. El dump cubre años pasados, la API cubre el presente. Cuando hay solape ocasional, la PK lo absorbe (ver el artículo 02).

El reparto es nítido: el dump es el bootstrap, la API es la operación. Los dos pipelines no necesitan saber del otro.

## La pregunta a hacerse

Cuando empieces a integrar una fuente nueva, dedica diez minutos a buscar **si publica un dump**. Search "openaq s3", "world bank bulk download", "github archive download". Tres de cada cinco fuentes públicas tienen uno y no lo anuncian fuerte porque la API es lo que monetizan o lo que documentan. Si lo encuentras, el resto del pipeline se simplifica: más paralelismo, menos código de retry, idempotencia gratis. Si no, paginar la API es siempre una opción, pero al menos tomas la decisión sabiendo lo que dejas en la mesa.
