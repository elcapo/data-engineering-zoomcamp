# Almacenes de datos

## Buenas prácticas

* Vídeo original (en inglés): [BigQuery Best Practices](https://www.youtube.com/watch?v=k81mLJVX08w&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=26&pp=iAQB0gcJCZEKAYcqIYzv)

### No uses todas las columnas

BigQuery es un almacén de datos columnar. Si seleccionas todas las columnas de una tabla, en especial, de una tabla con muchos campos, estarás desaprovechando la capacidad del sistema de solo cargar los datos que realmente necesitas, procesando volúmenes de datos mucho menores.

### Anticipa el coste de tus consultas

Al escribir una consulta en el editor, su sintaxis es validada automáticamente. Si la consulta es correcta, también veremos una estimación de su coste de ejecución en bytes procesados **antes** de ejecutarla.

```sql
/*  Esta consulta procesará 2.72 GB cuando se ejecute. */
SELECT * FROM zoomcamp.yellow_tripdata_parquet

/* Esta consulta procesará 155.12 MB cuando se ejecute. */
SELECT VendorID FROM zoomcamp.yellow_tripdata_parquet
```

### Usa particiones y clústeres en tus tablas

Para reducir el coste de tus consultas, planifica estrategias de particiones y clústeres considerando cuáles son los campos que más utilizas en tus filtros y criterios de agrupación.

### Evita las inserciones por _streaming_

BigQuery cobra un coste adicional por fila insertada por _streaming_, siendo las cargas por lotes son mucho más baratas. Además, los datos cargados por _streaming_ pasan por un _buffer_ antes de ser insertados. Y en tablas con clústeres, los datos no son inmediatamente clusterizados sino que los van ordenando más tarde procesos internos.

### Materializa los resultados de tus consultas por etapas

Cada consulta tiene un coste, incluídas las consultas en las que materializas datos de ficheros en una tabla de datos persistidos. Por lo que ir materializando por partes ayuda a mantener los costes bajo control.

Además, también facilita la depuración de tu flujo de preparación de datos al permitir inspeccionar los resultados intermedios. Aparte de que permites que BigQuery cachee los resultados de las consultas, consiguiendo una mejora de rendimiento.

### Optimiza tus consultas

A la hora de escribir consultas procura filtrar sobre columnas particionadas, o clusterizadas. Y recuerda adaptar tu modelo de datos para acercarlo más a una estructura OLAP denormalizada.

#### Usa **STRUCT** para simplificar tu estructura de tablas

Con el tipo de datos **STRUCT** puedes combinar varios datos en una única columna.

```sql
/* Creación de una tabla con una columna `STRUCT` */
CREATE TABLE zoomcamp.usuarios (
  user_id INT64,
  user_info STRUCT<
    nombre STRING,
    pais STRING
  >
);

/* Inserción de datos en una columna `STRUCT` */
INSERT INTO zoomcamp.usuarios (user_id, user_info)
VALUES
  (1, STRUCT("Ana", "España")),
  (2, STRUCT("Luis", "México"));

/* Consulta de datos de una columna `STRUCT` */
SELECT
  user_id,
  user_info.nombre AS nombre,
  user_info.pais AS pais
FROM zoomcamp.usuarios;
```

#### Usa **ARRAY** para evitar crear más tablas de las necesarias

Con el tipo de datos **ARRAY**, puedes crear columnas repetidas, que son listas de valores dentro de una única fila.

```sql
/* Creación de una tabla con una columna `ARRAY` */
CREATE TABLE zoomcamp.pedidos (
  order_id INT64,
  items ARRAY<STRUCT<
    producto STRING,
    precio FLOAT64
  >>
);

/* Inserción de datos en una columna `ARRAY` */
INSERT INTO zoomcamp.pedidos (order_id, items)
VALUES
  (1001, [
    STRUCT("Teclado", 25.0),
    STRUCT("Ratón", 15.0)
  ]);

/* Consulta de datos de una columna `ARRAY` */
SELECT
  order_id,
  item.producto,
  item.precio
FROM zoomcamp.pedidos,
UNNEST(items) AS item;
```

### Limita el uso de tablas externas

En línea del consejo sobre materializar tablas por etapas, también es buena idea recordar que las tablas externas no están indexadas, ni ordenadas por particiones o clústeres. Por lo que al usarlas no podremos beneficiarnos de planes de ejecución que busquen estrategias de reducción de costes.

### Reduce datos antes de usar un **JOIN**

En BigQuery (y en motores analíticos), los **JOIN**s son operaciones caras porque:

* combinan muchas filas,
* multiplican datos si no tienes cuidado,
* hacen que se lean más bytes.

```sql
/* ☒ Para efectuar este JOIN se deben procesar las tablas de ventas y clientes enteras */
SELECT *
FROM ventas v
JOIN clientes c ON v.cliente_id = c.id;

/* ☑ Filtrar los datos antes del JOIN ayuda a ahorrar costes */
WITH ventas_filtradas AS (
  SELECT *
  FROM ventas
  WHERE fecha = '2024-01-01'
)
SELECT *
FROM ventas_filtradas v
JOIN clientes c ON v.cliente_id = c.id;
```

### No trates las cláusulas **WITH** como si fuesen statements preparados

Aquí el aviso va contra la creencia de que si usas **WITH** BigQuery hará una vez el cálculo y luego lo reutilizará. En realidad, un **WITH** es solo una subconsulta con nombre. BigQuery puede reejecutarla, inlinearla, o no materializarla.

```sql
/* ☒ Piensas que `datos` se va a calcular una vez y usar dos, pero no es así */
WITH datos AS (
  SELECT *
  FROM tabla_grande
)
SELECT COUNT(*) FROM datos
UNION ALL
SELECT AVG(valor) FROM datos;

/* ☑ Si quieres asegurarte de que `datos` se ejecuta una única vez, mejor materialízalo */
CREATE TEMP TABLE datos AS
SELECT *
FROM tabla_grande;

SELECT COUNT(*) FROM datos;
SELECT AVG(valor) FROM datos;
```

### Evita el **oversharding**

El **oversharding**, o fragmentación excesiva, consiste en generar demasiadas tablas pequeñas y luego consultarlas con **UNION** gigantes. Cuando sea posible, es mejor crear una única tabla grande y bien particionada.

### Evita funciones **JavaScript** de usuario

Las funciones definidas por el usuario en JavaScript se ejecutan fuera del motor SQL nativo, lo que rompe muchas optimizaciones internas (vectorización, paralelismo eficiente, o _pushdown_ de filtros). En la práctica, usar las suele hacer que la consulta sea más lenta y más cara que usar funciones SQL nativas.

```sql
/* ☒ Intenta no usar JavaScript cuando tengas alternativas */
CREATE TEMP FUNCTION normalizar(x STRING)
RETURNS STRING
LANGUAGE js AS """
  return x.toLowerCase();
""";

SELECT normalizar(nombre) FROM usuarios;

/* ☑ Mejor, porque no rompe las optimizaciones del motor SQL */
SELECT LOWER(nombre) FROM usuarios;
```

### Usa funciones agregadas aproximadas

Las funciones de agregación aproximada devuelven resultados muy cercanos al valor real, pero consumiendo muchos menos recursos. BigQuery usa estructuras probabilísticas como HyperLogLog++ para estimar cardinalidades (por ejemplo, usuarios únicos).

```sql
/* ☒ Devuelve resultados exactos pero con mayor coste computacional */
SELECT COUNT(DISTINCT user_id) FROM eventos;

/* ☑ Devuelve resultados casi exactos con bastante menos coste */
SELECT APPROX_COUNT_DISTINCT(user_id) FROM eventos;
```

### Ordena al final de las consultas

Los **ORDER BY** son una de las operaciones más caras, porque obligan a:

* procesar todos los resultados,
* mover datos entre nodos,
* ordenar globalmente.

Si ordenas antes de tiempo (por ejemplo, dentro de subconsultas grandes), haces trabajar al motor más de lo necesario.

```sql
/* ☒ El orden de la subconsulta hace trabajar más al motor, sin aportar ningún beneficio */
WITH datos AS (
  SELECT * FROM ventas ORDER BY fecha
)
SELECT cliente_id, SUM(total)
FROM datos
GROUP BY cliente_id;

/* ☑ Solo se ordena una vez, al final */
SELECT cliente_id, SUM(total)
FROM ventas
GROUP BY cliente_id
ORDER BY cliente_id;
```

### Ordena las tablas de mayor a menor

Poner primero la tabla más grande ayuda a:

* distribuir mejor el trabajo,
* minimizar movimientos innecesarios de datos,
* mejorar la estrategia de ejecución del optimizador.

```sql
/* ☒ Mejorable, si `ventas` es mucho más grande que `clientes` */
SELECT v.fecha, v.cantidad, c.nombre, p.descripcion
FROM clientes c
JOIN ventas v ON c.id = v.cliente_id
JOIN productos p ON v.producto_id = p.id

/* ☑ Más legible y considerada con el motor SQL */
SELECT v.fecha, v.cantidad, c.nombre, p.descripcion
FROM ventas v
JOIN clientes c ON v.cliente_id = c.id
JOIN productos p ON v.producto_id = p.id
```
