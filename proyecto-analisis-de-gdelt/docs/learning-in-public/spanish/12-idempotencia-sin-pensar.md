Idempotencia ha salido dos veces seguidas en los últimos artículos: en los scripts de importación de paneles y en el `make init` que genera el `.env`. Pero donde realmente importa y donde se cuida de forma casi invisible es dentro de los trabajos que procesan los datos en Flink.

El problema tiene dos caras.

- La primera es el reinicio. Un trabajo de Flink puede reiniciarse por muchos motivos: un error puntual, un despliegue nuevo, una máquina que se reinicia. Cuando eso pasa, el trabajo vuelve a leer Kafka desde el punto de control más reciente y Kafka conserva los mensajes durante días. Si el trabajo simplemente hiciese `INSERT` por cada evento procesado, cada reinicio duplicaría filas en Postgres.

- La segunda es el propio cálculo por ventanas. Mientras una ventana de 15 minutos está abierta, Flink emite varias veces la misma fila: la primera con los eventos de los primeros segundos, después con más eventos acumulados, después con el total al cierre. Si cada emisión se tradujese en un nuevo `INSERT`, acabaríamos con tres o cuatro filas distintas representando la misma ventana y el mismo país.

La solución es declarativa y cabe en una línea por tabla:

```
PRIMARY KEY (window_start, country) NOT ENFORCED
```

El conector JDBC de Flink, al ver una clave primaria declarada, cambia de modo: en lugar de `INSERT`, hace `INSERT ... ON CONFLICT (pk) DO UPDATE` — lo que en Postgres se conoce como `upsert`. Si la fila no existía, la crea; si ya estaba, la sobreescribe. Mismo resultado venga la misma fila una o diez veces.

El `NOT ENFORCED` merece una nota. Significa "yo, Flink, no voy a comprobar que la clave sea realmente única; me fío de ti". La comprobación real la hace Postgres con su propia restricción de clave primaria. Flink sólo necesita esa pista en la definición para decidir qué SQL generar.

En las tablas agregadas la clave primaria es siempre alguna combinación de `window_start` y las dimensiones por las que se agrupa (`country`, `actor_code`, `theme`...). En la tabla en bruto de eventos es simplemente `global_event_id`, que GDELT ya garantiza único a escala mundial.

El resultado: los trabajos de Flink se pueden parar, reiniciar o rehacer desde el principio de la retención de Kafka y las tablas finales siempre acaban con el mismo contenido.

#IngenieríaDeDatos #Flink #GDELT
