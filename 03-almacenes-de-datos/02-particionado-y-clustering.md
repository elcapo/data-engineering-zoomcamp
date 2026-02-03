# Almacenes de datos

## Particionado y clustering

* Vídeo original (en inglés): [Partitioning and Clustering](https://www.youtube.com/watch?v=-CqXf7vhhDs&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=25&pp=iAQB)

En la sesión anterior, vimos cómo crear particiones y clústers en nuestras tablas de BigQuery. En esta ocasión vamos a entrar en detalles sobre estas dos técnicas y analizar cuándo conviene usar una, o la otra.

### Particiones

> "Una tabla con particiones se divide en segmentos, llamados particiones, que facilitan la gestión y la consulta de los datos. Al dividir una tabla grande en particiones más pequeñas, puedes mejorar el rendimiento de las consultas y controlar los costes reduciendo el número de bytes que lee una consulta."
> Fuente: [Introducción a las tablas con particiones](https://docs.cloud.google.com/bigquery/docs/partitioned-tables?hl=es).

#### Limitaciones de las particiones

A la hora de crear tablas con particiones en BigQuery, hay que tener en cuenta que hay algunas limitaciones:

- Solo se puede usar una columna para particionar una tabla. No se admiten particiones por varias columnas.

- No puedes añadir particiones a una tabla existente. Las particiones deben definirse en el momento de crear la tabla.

- Si la columna de partición tiene un tipo de dato temporal, solo podrá ser `DATE`, `TIMESTAMP`, ó `DATETIME`.

- Si la columna de partición tiene un tipo de dato numérico, solo podrá ser `INTEGER`.

- Se admiten columnas con los modificadores `REQUIRED` y `NULLABLE` pero no se admiten columnas con los modificadores `REPEATED` ni `RECORD`.

Hay más información en la [documentación oficial sobre segmentación de tablas con particiones](https://docs.cloud.google.com/bigquery/docs/partitioned-tables?hl=es#limitations).

### Clústeres

> "Las tablas agrupadas en clústeres de BigQuery son tablas que tienen un orden de clasificación de columnas definido por el usuario mediante columnas de clúster. Las tablas agrupadas en clústeres pueden mejorar el rendimiento de las consultas y reducir sus costes."
> Fuente: [Introducción a las tablas agrupadas en clústeres](https://docs.cloud.google.com/bigquery/docs/clustered-tables?hl=es).

Los clústeres son algo más flexibles que las particiones. Por un lado, se soportan hasta cuatro columnas clusterizadas en una misma tabla. Por otro lado, se soportan más tipos de dato: `BIGNUMERIC`, `BOOL`, `DATE`, `DATETIME`, `GEOGRAPHY`, `INT64`, `NUMERIC`, `RANGE`, `STRING`, `TIMESTAMP`.

#### Limitaciones de los clústeres

Al igual que con las particiones, las tablas agrupadas en clústeres en BigQuery tienen algunas limitaciones:

- No recibes una estimación precisa del coste de una consulta antes de ejecutarla, porque no se puede determinar el número de bloques de almacenamiento.

- En columnas de tipo `STRING` solo se usan los primeros 1024 caracteres para agrupar los datos.

- Si se agregan clústeres a una tabla existente, solo los datos nuevos serán ordenados.
