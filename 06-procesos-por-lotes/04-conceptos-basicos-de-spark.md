# Procesos por lotes

## Conceptos básicos de Spark

Cuando empezamos a trabajar con **Apache Spark**, uno de los primeros lugares donde aparecen muchos conceptos nuevos es la interfaz gráfica. Allí vemos términos como **aplicación**, **trabajo**, **etapa** o **tarea**, pero al principio no siempre queda claro cómo se relacionan entre sí. Entender esta jerarquía es muy útil porque nos permite interpretar lo que está haciendo Spark internamente, depurar problemas y comprender mejor el rendimiento de nuestros procesos.

### Aplicaciones

Una aplicación Sparl es el programa completo que ejecutamos. Es todo el proceso que comienza cuando lanzamos algo como:

```bash
spark-submit script.py
```

o cuando iniciamos una sesión en PySpark o un notebook.

```python
import pyspark
import os
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .master(os.environ.get('SPARK_MASTER')) \
    .appName("csv-to-parquet") \
    .getOrCreate()
```

Una aplicación de Spark incluye:

* El driver program, que coordina la ejecución.
* Los executors, que realizan el trabajo distribuido.
* Todas las operaciones que ejecuta el programa hasta que termina.

Podemos pensar en la application como la ejecución completa de nuestro programa.

Por ejemplo, si ejecutamos un script de PySpark que 1) lee un dataset, 2) realiza varias transformaciones y 3) escribe un resultado; todo eso forma una sola aplicación Spark.

En la interfaz gráfica se muestra una entrada para cada aplicación ejecutada.

### Trabajo

Dentro de una aplicación, Spark divide el trabajo en trabajos. Un trabajo se crea cada vez que ejecutamos una acción sobre un _DataFrame_. Como ya vimos en capítulos anteriores, en Spark existen dos tipos de operaciones:

* Transformaciones: describen una transformación pero no se ejecutan inmediatamente.
* Acciones: implican la ejecución inmediata de las transformaciones descritas hasta un momento dado.

Algunos ejemplos de acciones son `show()`, `count()`, `collect()`, `write` ó `save`. Cada vez que llamamos a una acción, Spark crea un trabajo nuevo.

En el script:

```python
df = spark.read.parquet("data.parquet")
df_filtered = df.filter("price > 10")

df_filtered.count()
df_filtered.show()
```

... se ejecutarán dos trabajos distintos, uno para `count()` y otro para `show()`, aún cuando los dos usan el mismo _DataFrame_.

Esto ocurre porque Spark evalúa las transformaciones de forma perezosa y solo ejecuta el plan cuando se solicita un resultado.

### Etapas

Cada trabajo se divide en etapas. Las etapas representan grupos de operaciones que pueden ejecutarse sin necesidad de redistribuir los datos entre nodos.

El motivo por el que se separan en etapas suele ser una operación llamada _shuffle_. Un _shuffle_ ocurre cuando los datos deben redistribuirse entre particiones; por ejemplo en operaciones como: `groupBy`, `join`, `distinct` y `reduceByKey`.

Cuando Spark detecta que necesita un _shuffle_, divide el job en varios etapas.

```python
df.groupBy("city").count()
```

Esto suele generar un plan de ejecución más o menos así:

* Etapa 1: lectura de datos y transformación inicial
* Shuffle
* Etapa 2: agregación final

Cada etapa puede ejecutarse de forma paralela en múltiples nodos.

### Tarea

Una tarea es la unidad más pequeña de trabajo en Spark. Cada etapa se divide en múltiples tareas y cada tarea procesa una partición de datos.

Por ejemplo, para un conjunto de datos con 200 particiones en una etapa, Spark lanzará 200 tareas. Y cada tarea será ejecutada por un "ejecutador".

En otras palabras:

```
Etapa
 ├─ Tarea 1: procesa partición 1
 ├─ Tarea 2: procesa partición 2
 ├─ Tarea 3: procesa partición 3
 ...
```

Cuantas más particiones haya, más tareas podrá ejecutar Spark en paralelo.

### Jerarquía completa en un ejemplo

Imaginemos este código:

```python
df = spark.read.parquet("rides.parquet")

result = (
    df
    .filter("passenger_count > 2")
    .groupBy("PULocationID")
    .count()
)

result.show()
```

La ejecución podría verse así:

* **Aplicación**: el script completo.
* **Trabajo**: creado por `show()`.
* **Etapas**:
  * Lectura y filtrado.
  * _Shuffle_ y agregación.
* **Tareas**: una por cada partición.

> [!NOTE]
> Use este artículo como base para esta contribución a la FAQ:
> * [What is the difference between a Spark application, job, stage, and task?](https://github.com/DataTalksClub/faq/issues/228)