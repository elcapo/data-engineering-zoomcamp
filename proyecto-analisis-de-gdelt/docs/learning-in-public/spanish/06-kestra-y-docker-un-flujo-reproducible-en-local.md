Con la descarga y la publicación partidas en dos procesos, lo siguiente era decidir quién los dispara, en qué orden y qué pasa cuando algo falla. Esa pieza es el orquestador del proyecto, en mi caso, Kestra.

Kestra aporta tres cosas que me parecían irrenunciables:

- **Programación clara**: se le indica "cada 15 minutos" y el flujo se dispara solo, encadenando las dos tareas en orden.

- **Reintentos configurables por tarea**: la descarga reintenta con esperas crecientes (porque el índice de GDELT llega antes que los ficheros, como conté en el artículo anterior); la publicación reintenta con esperas cortas y fijas.

- **Observabilidad real**: cada ejecución queda registrada, con sus tareas, sus reintentos, sus registros de salida y el motivo exacto del fallo. Desde la interfaz web se ve, paso a paso, qué pasó en cada ciclo.

A su alrededor, todo vive dentro de una composición de Docker: Redpanda (que hace de flujo de eventos), Postgres, Kestra, un paso inicial que carga las tablas de referencia con dbt, y el propio productor — que Kestra lanza bajo demanda en su propio contenedor, no como un servicio siempre en marcha.

La consecuencia práctica es muy cómoda: cualquiera que clone el repositorio puede levantar el sistema entero en su portátil con un único comando y los datos reales de GDELT empiezan a entrar a los pocos minutos sin depender de nada externo.

#IngenieríaDeDatos #Kestra #Docker #GDELT

> Publicado en: https://www.linkedin.com/posts/carlos-capote-perez-andreu_ingenieraedadedatos-kestra-docker-activity-7452359266293723136-bWmF