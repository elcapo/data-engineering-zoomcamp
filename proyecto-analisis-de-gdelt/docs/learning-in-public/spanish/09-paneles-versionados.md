En el artículo anterior quedaba Metabase arrancada y conectada, lista para empezar a construir paneles. Mi objetivo en el proyecto es usar la interfaz gráfica de Metabase para crear los modelos, las gráficas y los paneles finales. Pero eso implica que tengo que plantearme cómo hacer para que esos paneles viajen con el repositorio Git y se instalen con la misma facilitad con la que se despliega el resto del proyecto.

Metabase guarda todo en una base de datos interna (en formato H2, dentro de un volumen de Docker). El panel no es un fichero: es un conjunto de filas con identificadores numéricos que referencian otras filas. El panel tiene tarjetas; cada tarjeta tiene un identificador de base, de tabla y de varias columnas; y hay tarjetas que se apoyan en otras por su identificador. Esos números son locales a la instancia que los creó. Si exporto el JSON tal cual y lo intento reinyectar en otra instancia de Metabase, todos los identificadores apuntan a registros diferentes a los de la base de datos inicial y el panel no funciona.

Hacen falta dos cosas: exportar el panel sin perder sus referencias y reimportarlo traduciendo identificadores a los que existan en el destino.

Un **exportador** hace preguntas a la API de Metabase y extrae tres cosas:

- El JSON del panel.

- El JSON de cada tarjeta que el panel usa (y de las tarjetas sobre las que esas se apoyan).

- Una copia recortada de los metadatos de cada base de datos implicada: nombres de tablas y columnas junto al identificador numérico que Metabase les había asignado.

Esos metadatos son el puente. Sin ellos no hay forma de traducir "columna 482" a "la columna tal de la tabla cual".

Un **importador** consulta el Metabase destino, construye diccionarios de traducción emparejando por nombre (base, tabla y columna) y recorre cada tarjeta sustituyendo los identificadores viejos por los nuevos. Crea las tarjetas en orden, respetando que unas dependan de otras, monta el panel encima y lo deja listo.

El resultado es un flujo que encaja con el resto del proyecto: los paneles viven como JSON dentro del repositorio, cada cambio se ve en el `diff` de git y un único comando los restaura en cualquier máquina con el sistema levantado.

No es la parte más brillante del proyecto, pero es la que lleva de "tengo un panel bonito en mi portátil" a "el panel es parte del proyecto".

#IngenieríaDeDatos #Metabase #GDELT
