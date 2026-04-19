Cerrada la parte de flujo, las tablas agregadas se reescriben solas en Postgres cada ciclo. Pero una tabla en Postgres no es todavía un panel: falta la capa que convierte esas filas en gráficos legibles de un vistazo.

Aquí entra en juego Metabase por tres razones: 1) es de código libre por lo que la puedes administrar como un contenedor más, 2) conecta a Postgres sin ceremonias (le das las credenciales de una base de datos y descubre las tablas automáticamente) y 3) construye paneles sin pedir código, pero acepta SQL para los casos en que sea conveniente.

Lo interesante no es Metabase en sí, sino lo que pasa la primera vez que se arranca. Recién instalada te pide que crees un usuario administrador, que registres a mano la base de datos que quieres consultar, que esperes a que detecte las tablas, y, de paso, te instala una base de ejemplo. Todos esos pasos son puntuales pero manuales. Y eso rompe el motivo principal del diseño del proyecto: clona, ejecuta `make up` y el sistema están en marcha.

La solución fue añadir un pequeño contenedor inicializador (`metabase-init`) que habla con la API de Metabase justo después de que arranque y la usa para hacer cuatro cosas:

- Comprueba si ya hay usuario administrador y, si no, lo crea.
- Registra la conexión a `GDELT Postgres` si no estaba registrada.
- Borra la base de ejemplo.
- Dispara una sincronización del esquema para que las tablas aparezcan enseguida.

Son unas pocas llamadas al API encadenadas con `curl` y `jq`. Si el sistema ya estaba inicializado, cada comprobación detecta su estado previo y no se hace nada.

El resultado es que después de `make up`, Metabase está accesible en su puerto, con su base conectada y las tablas visibles. Queda sólo construir los paneles — que es justo la parte que sí quiero hacer a mano.

#IngenieríaDeDatos #Metabase #GDELT
