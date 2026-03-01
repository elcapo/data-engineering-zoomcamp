# Taller: **Ingesta de datos desde una API con DLT**

> [!NOTE]
> Esta pregunta ya fue enviada como contribución a la FAQ del curso:
> [How does dlt handle schema evolution?](https://github.com/DataTalksClub/faq/issues/202)

## Contribución FAQ: **¿Cómo gestiona dlt la evolución del esquema?**

La buena noticia es que dlt detecta y se adapta automáticamente a la mayoría de los cambios de esquema durante la ingesta, por lo que normalmente no tienes que modificar las tablas manualmente.

### ¿Qué ocurre cuando cambia el esquema de origen?

* Si **aparecen nuevas columnas**, dlt las añade a la tabla de destino.
* Si **aparecen nuevos campos anidados**, dlt también crea las tablas hijas o columnas necesarias.
* Si **desaparecen columnas existentes**, estas permanecen en la tabla (no se eliminan).
* Si **columnas existentes cambian su tipo de datos**, dlt intentará convertir los datos de forma segura; si no es posible, lanza un error para que puedas gestionarlo explícitamente.

### Cómo funciona internamente

dlt infiere el esquema a partir de los datos entrantes y almacena el esquema y el estado del pipeline localmente (en la carpeta `.dlt`).

En la siguiente ejecución, compara los datos entrantes con el esquema almacenado y aplica las migraciones necesarias en el destino.

### Por qué esto es útil en el curso

* Puedes ingerir APIs cambiantes o JSON semiestructurados sin escribir DDL.
* Tus pipelines siguen funcionando incluso cuando aparecen nuevos campos.
* Es seguro para cargas incrementales: las actualizaciones de esquema no requieren una recarga completa.

### Cuándo puede que necesites intervenir

* Si una columna cambia a un tipo incompatible.
* Si quieres forzar un esquema o tipo de dato específico.
* Si quieres eliminar o renombrar columnas.

En esos casos puedes definir el esquema explícitamente en tu recurso de dlt.