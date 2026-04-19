En el artículo anterior dividí los datos de GDELT en diferentes bloques y dejé las tablas de referencia como la parte "fácil". Pero la verdad es que, aunque son las que menos cambian, fueron las más difíciles de trato.

Estas tablas son las que traducen los códigos de GDELT a algo legible: códigos de país, de tipo de evento, de rol de cada actor, de etnia, de religión... Sin ellas, cada fila de datos es básicamente una sopa de letras.

El problema es que GDELT no publica estas tablas como ficheros de datos. Las publica como capítulos dentro de dos manuales en PDF, uno del propio GDELT y otro del sistema CAMEO. Y al sacar el contenido a mano aparecen detalles que, si los ignoras, rompen las uniones más adelante:

- Los códigos llevan ceros a la izquierda y el ancho importa: `01` y `010` no son lo mismo.

- Los códigos de etnia van en minúsculas a propósito, para distinguirse de los de país.

- El código de un actor es una concatenación de varios fragmentos: `USAGOVLEG` significa Estados Unidos + gobierno + poder legislativo. No hay una única tabla que lo resuelva; hay que cruzar varias.

- Las tablas de país del manual usan códigos CAMEO, pero la tabla de etnias referencia los países con otro sistema (ISO 3166). Hace falta un puente entre ambos.

La decisión fue extraer cada tabla una sola vez, transcribirla a un CSV y versionar esos ficheros con el código del proyecto. Una vez en el repositorio, dbt las carga como *semillas* con un único comando: aparecen en la base de datos, en su propio esquema, listas para ser consultadas.

De aquí salieron 16 ficheros, algunos de solo 4 filas y otros de unas 2.500, todos documentados con su capítulo de origen. No es el trabajo más vistoso del proyecto, pero es el que convierte las filas crípticas de GDELT en algo legible e interpretable.

#IngenieríaDeDatos #GDELT #dbt
