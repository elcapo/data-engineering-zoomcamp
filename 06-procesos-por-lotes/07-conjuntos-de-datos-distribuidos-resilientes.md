# Procesos por lotes

## Conjuntos de datos distribuidos resilientes

### Operaciones en conjuntos de datos distribuidos resilientes

* Vídeo original (en inglés): [Operations on Spark RDDs](https://www.youtube.com/watch?v=Bdu-xIrF3OM&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=62)

> [!NOTE]
> Esta sección es opcional. Los RDDs son una capa interna de Spark que hoy en día raramente usamos directamente. Se incluye como contexto para entender cómo funciona Spark por dentro.

Un conjuntos de datos distribuidos resilientes (**RDD**, del inglés: _Resilient Distributed Dataset_) es la abstracción fundamental de Spark. Antes de que existieran los _DataFrames_, los programadores de Spark trabajaban directamente con RDDs. Hoy los _DataFrames_ se construyen sobre ellos pero en la práctica casi nunca necesitamos bajar a ese nivel.

La diferencia principal entre un _DataFrame_ y un RDD es que el _DataFrame_ tiene **esquema** (sabe qué columnas contiene y de qué tipo son), mientras que un RDD es simplemente una **colección distribuida de objetos** sin estructura fija. Spark divide esta colección en particiones y las distribuye entre los ejecutores del clúster, igual que hace con los _DataFrames_.

En este artículo vamos a reproducir la consulta de ingresos por hora y zona de los taxis verdes que hicimos con `GroupBy` en el artículo anterior, pero esta vez usando operaciones RDD de bajo nivel. A modo de recordatorio, esta era la consulta:

```sql
SELECT
    DATE_TRUNC('hour', tpep_pickup_datetime) AS hour,
    PULocationID AS zone,

    SUM(total_amount) AS amount,
    COUNT(1) AS number_records
FROM
    yellow
WHERE
    tpep_pickup_datetime >= '2020-01-01 00:00:00'
GROUP BY
    1, 2
```

> [!NOTE]
> Puedes consultar una versión interactiva en formato cuaderno Jupyter en [conjuntos-de-datos-distribuidos-resilientes.ipynb](./pipelines/pyspark-pipeline/notebooks/conjuntos-de-datos-distribuidos-resilientes.ipynb).

#### Obtener el RDD subyacente de un DataFrame

Todo _DataFrame_ de Spark expone el RDD sobre el que está construido a través del atributo `.rdd`. Antes de acceder a él, seleccionamos solo las columnas que necesitamos para reducir el volumen de datos:

```python
import pyspark
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .master("local[*]") \
    .appName('rdds') \
    .getOrCreate()

df_green = spark.read.parquet('data/pq/green/*/*')

rdd = df_green \
    .select('lpep_pickup_datetime', 'PULocationID', 'total_amount') \
    .rdd
```

El RDD resultante es una colección de objetos `Row`, el mismo tipo que usa Spark internamente para representar filas de un _DataFrame_.

#### Filtrar registros con `filter`

La operación `filter` recibe una función que devuelve `True` o `False` para cada elemento del RDD. Los elementos para los que la función devuelve `False` se descartan:

```python
from datetime import datetime

start = datetime(year=2020, month=1, day=1)

def filter_outliers(row):
    return row.lpep_pickup_datetime >= start

rdd_filtered = rdd.filter(filter_outliers)
```

Esto equivale a la cláusula `WHERE lpep_pickup_datetime >= '2020-01-01'` de la consulta SQL. Usamos una función con nombre en lugar de una expresión `lambda` porque los `lambda` anidados pueden volverse difíciles de leer con rapidez.

#### Preparar las claves y valores con `map`

La operación `map` transforma cada elemento del RDD en otro elemento. Para poder agregar por clave más adelante, necesitamos que cada elemento adopte la forma `(clave, valor)`:

```python
def prepare_for_grouping(row):
    hour = row.lpep_pickup_datetime.replace(
        minute=0, second=0, microsecond=0
    )
    zone = row.PULocationID
    key = (hour, zone)

    amount = row.total_amount
    count = 1
    value = (amount, count)

    return (key, value)

rdd_mapped = rdd_filtered.map(prepare_for_grouping)
```

La **clave** es la combinación de hora y zona, que es por lo que vamos a agrupar. El **valor** es el par `(importe, 1)`: el importe del viaje y un contador inicializado a uno que usaremos para contar el número de viajes al reducir.

#### Agregar por clave con `reduceByKey`

`reduceByKey` toma todos los elementos con la misma clave y los combina en uno usando la función que le pasamos. La función recibe dos valores (el acumulado y el siguiente elemento) y devuelve el valor combinado:

```python
def calculate_revenue(left_value, right_value):
    left_amount, left_count = left_value
    right_amount, right_count = right_value

    output_amount = left_amount + right_amount
    output_count = left_count + right_count

    return (output_amount, output_count)

rdd_revenue = rdd_mapped.reduceByKey(calculate_revenue)
```

Esta operación es equivalente al `SUM(total_amount)` y `COUNT(1)` de la consulta SQL. Spark aplica `reduceByKey` en dos fases: primero reduce dentro de cada partición para minimizar los datos a transferir, y luego hace un **_shuffle_** para reunir en la misma partición todos los registros con la misma clave, donde se produce la reducción final. Es exactamente el mismo mecanismo de dos etapas que vimos con `GroupBy` en SQL.

#### Convertir el resultado de vuelta a un DataFrame

El resultado del `reduceByKey` tiene la estructura `((hora, zona), (importe, viajes))`. Para convertirlo de nuevo a un _DataFrame_, primero lo aplanamos con otra operación `map`. Usamos un `namedtuple` para que Spark pueda inferir los nombres de las columnas, y proporcionamos el esquema explícitamente para evitar que Spark tenga que recorrer todos los registros para deducirlo:

```python
from collections import namedtuple
from pyspark.sql import types

RevenueRow = namedtuple('RevenueRow', ['hour', 'zone', 'revenue', 'count'])

def unwrap(row):
    return RevenueRow(
        hour=row[0][0],
        zone=row[0][1],
        revenue=row[1][0],
        count=row[1][1],
    )

result_schema = types.StructType([
    types.StructField('hour', types.TimestampType(), True),
    types.StructField('zone', types.IntegerType(), True),
    types.StructField('revenue', types.DoubleType(), True),
    types.StructField('count', types.IntegerType(), True),
])

df_result = rdd \
    .filter(filter_outliers) \
    .map(prepare_for_grouping) \
    .reduceByKey(calculate_revenue) \
    .map(unwrap) \
    .toDF(result_schema)

df_result.show()
```

Con `toDF` obtenemos un _DataFrame_ normal con el que podemos operar como de costumbre, incluyendo escribirlo a Parquet.

#### Resumen

Para reproducir con RDDs la consulta `GroupBy` que hicimos con SQL necesitamos cuatro pasos:

1. **`filter`**: descartar registros no deseados (equivale a `WHERE`).
2. **`map`**: transformar cada fila en un par `(clave, valor)` listo para agrupar (equivale al `SELECT` con `DATE_TRUNC`).
3. **`reduceByKey`**: combinar los valores de cada clave en uno solo (equivale al `GROUP BY` con `SUM` y `COUNT`).
4. **`map` + `toDF`**: aplanar y convertir el resultado de vuelta a un _DataFrame_.

Hoy en día no necesitamos escribir este código: las APIs de _DataFrame_ y SQL lo expresan de forma mucho más concisa. Pero entender las operaciones RDD ayuda a comprender qué hace Spark internamente cuando ejecutamos una consulta de agregación.

### Uso de `mapPartitions`

* Vídeo original (en inglés): [Spark RDD mapPartition](https://youtu.be/k3uB2K99roI&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=62)

Existe una operación en los RDDs de Spark que, a diferencia de las demás, sigue siendo útil incluso cuando trabajamos habitualmente con _DataFrames_: **`mapPartitions`**. A diferencia de `map`, que recibe un elemento y devuelve otro, `mapPartitions` recibe una **partición completa** y devuelve otra partición.

#### Por qué `mapPartitions` es útil

Imaginemos un conjunto de datos de un terabyte repartido en particiones de 100 MB. Ninguna máquina tiene un terabyte de memoria, pero sí puede manejar 100 MB sin problema. Con `mapPartitions` podemos aplicar cualquier función a cada fragmento de forma independiente: Spark se encarga de gestionar el paralelismo automáticamente.

Esto es especialmente conveniente para **inferencia de modelos de aprendizaje automático**: cargamos el modelo una vez por partición, lo aplicamos a un bloque de datos y devolvemos las predicciones. Con `map` tendríamos que inicializar el modelo para cada fila individual, lo que sería mucho menos eficiente.

#### Ejemplo: predicción de duración de viajes

Supongamos que queremos predecir la duración de cada viaje en el conjunto de datos de los taxis verdes. Primero preparamos el RDD con las columnas relevantes:

```python
columns = [
    'VendorID',
    'lpep_pickup_datetime',
    'PULocationID',
    'DOLocationID',
    'trip_distance',
]

duration_rdd = df_green.select(columns).rdd
```

#### El modelo de predicción

Para el ejemplo usamos un modelo muy simple: cinco minutos por milla de distancia.

```python
def model_predict(df):
    predictions = df['trip_distance'] * 5
    return predictions
```

En la práctica, aquí cargaríamos un modelo entrenado con scikit-learn, XGBoost u otra librería. La clave es que el modelo recibe un _DataFrame_ de pandas y devuelve un array con una predicción por fila.

#### La función de transformación

Dentro de la función que pasamos a `mapPartitions`, la partición llega como un **iterador** de objetos `Row`. Lo convertimos a un _DataFrame_ de pandas, aplicamos el modelo y devolvemos los resultados fila a fila:

```python
import pandas as pd

def apply_model_in_batch(rows):
    df = pd.DataFrame(rows, columns=columns)
    predictions = model_predict(df)
    df['predicted_duration'] = predictions
    for row in df.itertuples():
        yield row
```

Hay dos detalles importantes aquí:

* Usamos **`yield`** en lugar de `return`. Esto convierte la función en un generador: en vez de devolver todos los resultados a la vez (lo que podría agotar la memoria), los entrega uno a uno. Spark espera que la función devuelva algo iterable, y un generador lo es.
* Convertimos la partición a un _DataFrame_ de pandas para poder trabajar con ella como haríamos en cualquier proyecto de ciencia de datos. Hay que tener en cuenta que toda la partición debe caber en memoria del ejecutor.

#### Aplicar `mapPartitions` y convertir a DataFrame

```python
df_predictions = duration_rdd \
    .mapPartitions(apply_model_in_batch) \
    .toDF() \
    .drop('Index')

df_predictions.show()
```

`itertuples()` añade automáticamente una columna `Index` con el índice de cada fila en el _DataFrame_ de pandas, que no necesitamos en el resultado. La eliminamos con `.drop('Index')` al convertir el RDD a _DataFrame_. Con `mapPartitions` aplicamos la función a cada partición del RDD. Spark gestiona automáticamente qué partición va a qué ejecutor y, al finalizar, combina los resultados de todas las particiones en un único RDD.

> [!NOTE]
> Spark puede producir particiones de tamaño muy desigual. Si una partición es varias veces más grande que las demás, el ejecutor que la procese tardará mucho más, mientras el resto espera inactivo. En ese caso, conviene reparticionar el RDD antes de aplicar `mapPartitions`:
> ```python
> duration_rdd = df_green.select(columns).rdd.repartition(n)
> ```
> El reparto explícito homogeneiza el tamaño de las particiones a costa de introducir un _shuffle_ adicional.

#### Por qué no se usa Spark para inferencia en tiempo real

El ejemplo anterior ilustra el patrón de `mapPartitions` con inferencia de ML, pero en la práctica predecir la duración de un viaje requiere una respuesta **en tiempo real**: el pasajero solicita un taxi y quiere saber al instante cuánto tardará. Para eso se usa un servicio web, no un trabajo de Spark. El patrón de `mapPartitions` con ML es útil cuando queremos anotar un conjunto de datos histórico grande, no cuando necesitamos respuestas instantáneas.
