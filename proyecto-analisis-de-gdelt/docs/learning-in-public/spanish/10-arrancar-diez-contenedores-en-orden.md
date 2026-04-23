Levantar el sistema entero con `docker compose up` suena bien en la teoría pero en cuanto hay más de tres o cuatro contenedores la realidad es otra: todos arrancan a la vez, algunos tardan más que otros y los que dependen de los lentos fallan en el primer intento. Este proyecto tiene unos diez contenedores y el arranque ordenado tenía que funcionar sin intervención humana, ni divina.

Para conseguirlo, se necesitan tres piezas que Docker Compose ya ofrece.

**1. Comprobaciones de salud (`healthcheck`)** en los servicios que otros van a consultar.

Postgres, Redpanda y Kestra declaran cada uno un pequeño comando que Docker ejecuta cada pocos segundos para responder a la pregunta "¿estás listo para atender peticiones?". Postgres pregunta con `pg_isready`, Redpanda consulta su propia `rpk cluster health`, Kestra toca su endpoint de configuración. Arrancar no es estar listo y esto lo debe saber Docker.

**2. Declaraciones de dependencias (`depends_on` con `condition:`)** para expresar distintos tipos de espera.

- `service_healthy`: "espera a que el otro pase su comprobación". Flink y el productor esperan así a Postgres y Redpanda.

- `service_completed_successfully`: "espera a que el otro termine y salga". Flink no arranca hasta que `dbt-init` ha cargado las semillas; pgAdmin no arranca hasta que `pgadmin-init` lo ha configurado para que arranque ya listo.

- `service_started`: "con que haya arrancado basta". Se usa sólo donde no hace falta más garantía.

**3. Inicializadores de una sola ejecución (`restart: "no"`)**.

Son contenedores pensados para hacer una tarea concreta y terminar:

- `redpanda-init` crea los tópicos de Kafka.

- `pgadmin-init` genera el fichero `pgpass` para que PGAdmin arranque preconfigurado.

- `dbt-init` carga las tablas de referencia y crea las tablas en bruto.

- `metabase-init` registra la base de datos en Metabase.

- `flink-job-submitter` envía los trabajos a Flink.

Todos son idempotentes. Si los ejecutas dos veces, no se estropea nada. Y ninguno se queda corriendo.

Juntando las tres piezas, el arranque se convierte en una cadena determinista: Postgres y Redpanda se ponen sanos; los inicializadores pertinentes corren y salen; Kestra y Flink ven sus prerrequisitos cumplidos y arrancan; Metabase acaba el último. El usuario sólo escribe `make up` y no tiene que saber ni el orden ni los tiempos.

Un detalle que cierra el cuadro: el productor de GDELT lleva `profiles: ["cli"]`. Eso significa que **no** arranca con el resto. Kestra lo lanza bajo demanda en su propio contenedor cada 15 minutos.

#IngenieríaDeDatos #Docker #GDELT

> Publicado en: https://www.linkedin.com/posts/carlos-capote-perez-andreu_ingenieraedadedatos-docker-gdelt-activity-7452374353641598976-hgqQ