Una vez los datos están en PostgreSQL, la siguiente pregunta es obvia: ¿cómo los consulto? Y aquí es donde tener todo en una base de datos relacional bien estructurada marca la diferencia frente al sitio web original del BOC.

La búsqueda más potente es la de texto completo. PostgreSQL tiene soporte nativo con `tsvector` y `tsquery`, sin necesidad de un motor externo (tipo Elasticsearch). Cada disposición tiene una columna generada que combina título y cuerpo, tokenizada con la configuración de español. Un índice sobre esa columna hace que las búsquedas sean rápidas incluso sobre cientos de miles de documentos.

Lo mismo hice con los resúmenes del índice de cada boletín, lo que permite buscar incluso en disposiciones cuyo texto completo aún no se ha descargado.

Pero la búsqueda de texto completo no es la única ventaja de tener los datos en PostgreSQL. Al extraer los metadatos de cada disposición (sección, organismo, fecha, año, número de boletín), las consultas por filtros son triviales. ¿Cuántas disposiciones ha publicado un organismo concreto? ¿Qué se publicó entre dos fechas? ¿Qué secciones tienen más actividad en un año concreto? Son consultas que se resuelven en milisegundos y que en la web original del BOC sencillamente no son posibles.

La combinación es lo realmente útil: texto completo más filtros. Buscar "subvención" solo en disposiciones de la Consejería de Educación publicadas en 2024 es una única consulta SQL que cruza la búsqueda de texto con filtros sobre organismo, año y sección.

También implementé facetas dinámicas: junto con los resultados, la consulta devuelve los años, secciones y organismos con más coincidencias. Esto permite al usuario explorar los datos sin saber de antemano qué buscar.

Para los extractos con contexto uso `ts_headline()`, que devuelve fragmentos del texto alrededor de los términos encontrados, marcados con etiquetas HTML para resaltarlos visualmente.

Todo esto funciona con PostgreSQL estándar. No hizo falta Elasticsearch, ni Solr, ni ningún servicio adicional. Para el volumen de este proyecto, PostgreSQL es más que suficiente y la complejidad operativa es mínima.

#DataEngineering #AprendeEnPúblico #DataTalksClub #PostgreSQL #FullTextSearch #SQL #DatosAbiertos
