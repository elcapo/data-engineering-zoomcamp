Resueltas las tablas de referencia, toca la parte más vistosa del proyecto: descargar los ficheros de GDELT cada 15 minutos. La idea inicial era sencilla — un proceso que lee la lista de ficheros nuevos, los baja, los transforma y los publica en Kafka de una sola tirada. Al implementarlo apareció una arruga que obligó a partir ese proceso en dos.

GDELT expone en una URL fija un pequeño fichero de texto llamado `lastupdate.txt`. Cada 15 minutos ese fichero cambia y apunta a los tres nuevos ficheros del ciclo. Lo lógico es leer esa lista, coger las URLs, descargar y publicar.

El problema es que GDELT actualiza ese índice *antes* de que los ficheros estén realmente disponibles en todos los servidores desde los que se sirven. Durante los primeros segundos — a veces minutos — las URLs que acaba de publicar devuelven un error 404. Si consultas la lista y lanzas la descarga de inmediato, muchas ejecuciones fallan.

La solución fue partir el trabajo en dos procesos independientes:

- **Descarga**: lee el índice, intenta bajar cada fichero con reintentos y esperas crecientes entre intentos, y lo deja en disco de forma atómica (se escribe con otro nombre y, al terminar, se renombra al definitivo).

- **Publicación**: toma los ficheros ya en disco, los transforma y los envía a Kafka.

La separación tiene dos ventajas. La obvia: si la descarga aún no está disponible, reintenta sin bloquear nada más. La menos obvia: como el fichero sólo aparece con su nombre definitivo cuando está completo, la publicación nunca se encuentra un CSV a medias.

Además, orquestar los dos pasos desde fuera queda mucho más limpio. Cada proceso hace una sola cosa y, si algo falla, se sabe exactamente qué reintentar.

#IngenieríaDeDatos #GDELT #Kafka

> Publicado en: https://www.linkedin.com/posts/carlos-capote-perez-andreu_ingenieraedadedatos-gdelt-kafka-activity-7452355534697111553-MRiY