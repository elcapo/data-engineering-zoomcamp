Tenemos un proyecto que un nuevo desarrollador puede copiar en su equipo y ponerlo en marcha con un único comando. Hasta ahí todo genial. Pero tiras del hilo te das cuenta de que detrás de ese comando hay varias contraseñas: la de Postgres, la de pgAdmin, la de Kestra, la de Metabase. La tentación es ir por la vía más cómoda: establecer unas contraseñas por defecto en el repositorio y confiar en que cada usuario las cambie si quiere. Pero "cambiar si quiere" casi nunca ocurre y se termina con sistemas corriendo con `admin/admin`.

Así que mi decisión para proyectos es otra: el repositorio no contiene contraseñas. Sólo una **plantilla** (`env.template`) con huecos. Algo como:

```
POSTGRES_PASSWORD=__POSTGRES_PASSWORD__
PGADMIN_PASSWORD=__PGADMIN_PASSWORD__
KESTRA_PASSWORD="__KESTRA_PASSWORD__"
METABASE_PASSWORD=__METABASE_PASSWORD__
```

La primera vez que alguien ejecuta `make up`, una tarea previa llamada `make init` rellena esos huecos con contraseñas aleatorias:

- Genera cada contraseña con `openssl`.

- Sustituye cada hueco en la plantilla con `sed` y escribe el resultado en `.env`.

Ese fichero `.env` está en el `.gitignore`, así que nunca viaja con el repositorio: vive sólo en la máquina que lo generó.

Dos detalles hacen que esto sea cómodo de usar:

- **Idempotencia**: la tarea empieza con un `[ -f .env ]` — si el fichero ya existe, no hace nada. Así que levantar el sistema en una máquina ya configurada no sobrescribe las contraseñas (lo que rompería la conexión con los volúmenes persistentes ya creados con las anteriores).

- **Valores por defecto sensatos**: todo lo que no es secreto (puertos, nombres de usuario, nombre de la base de datos) tiene un valor por defecto dentro del propio `docker-compose.yml` con la sintaxis `${POSTGRES_USER:-gdelt}`, así que la plantilla sólo tiene que preocuparse por los secretos.

El resultado es que el repositorio es seguro de clonar — no lleva secretos reales ni de ejemplo — y cada máquina que lo usa arranca con contraseñas únicas que sólo ella conoce.

#IngenieríaDeDatos #Docker #Seguridad #GDELT

> Publicado en: https://www.linkedin.com/posts/carlos-capote-perez-andreu_ingenieraedadedatos-docker-seguridad-activity-7452378130255654912-BUk0