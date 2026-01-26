# Infraestructura y prerrequisitos

## Administrar PostgreSQL con pgAdmin

* Notas originales (en inglés): [pgAdmin - Database Management Tool](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/01-docker-terraform/docker-sql/07-pgadmin.md)

Además de `pgcli`, existe `pgAdmin`, una interfaz web que permite administrar PostgreSQL de forma visual. Es especialmente útil cuando trabajas con bases de datos complejas o quieres visualizar datos de forma rápida.

## Levantar pgAdmin con Docker

Para usar pgAdmin junto con PostgreSQL, podemos levantar otro contenedor Docker:

```bash
docker run -it --rm \
    -e PGADMIN_DEFAULT_EMAIL="admin@admin.com" \
    -e PGADMIN_DEFAULT_PASSWORD="root" \
    -p 8085:80 \
    dpage/pgadmin4
```

### Explicación de los parámetros

* `-e PGADMIN_DEFAULT_EMAIL` especifica el correo para iniciar sesión en pgAdmin
* `-e PGADMIN_DEFAULT_PASSWORD` especifica la contraseña para iniciar sesión
* `-p 8085:80` mapea el puerto 80 del contenedor (donde pgAdmin escucha) al puerto 8085 del host

Una vez iniciado, puedes acceder a pgAdmin desde tu navegador en `http://localhost:8085` usando las credenciales que especificaste.

## Integrar pgAdmin con Docker Compose

Gestionar PostgreSQL y pgAdmin por separado con `docker run` es tedioso. Lo ideal es usar **Docker Compose** para orquestar ambos servicios juntos.

### Crear un archivo `docker-compose.yml`

Crea un archivo `docker-compose.yml` en la raíz de tu proyecto:

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: "root"
      POSTGRES_PASSWORD: "root"
      POSTGRES_DB: "taxi"
    volumes:
      - taxi_postgres_data:/var/lib/postgresql
    ports:
      - 5432:5432
    networks:
      - taxi_network

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: "admin@admin.com"
      PGADMIN_DEFAULT_PASSWORD: "root"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    ports:
      - 8085:80
    networks:
      - taxi_network

volumes:
  taxi_postgres_data:
  pgadmin_data:

networks:
  taxi_network:
```

### Explicación de la estructura

* **`services:`**: Define los servicios (contenedores) que queremos ejecutar
* **`postgres:`**: Nombre del servicio PostgreSQL (podemos elegir el nombre que queramos)
* **`pgadmin:`**: Nombre del servicio pgAdmin
* **`image:`**: La imagen Docker a utilizar
* **`environment:`**: Variables de entorno, equivalente a `-e` en `docker run`
* **`volumes:`**: Volúmenes para persistir datos
* **`ports:`**: Mapeo de puertos, equivalente a `-p` en `docker run`
* **`networks:`**: Red compartida para que los contenedores puedan comunicarse entre sí

### Levantar los servicios

Con Docker Compose, puedes iniciar todos los servicios con un único comando. Desde el mismo directorio en el que se encuentra tu `docker-compose.yml`:

```bash
docker compose up
```

Para ejecutarlos en segundo plano:

```bash
docker compose up -d
```

Para detener los servicios:

```bash
docker compose down
```

Y para detenerlos y eliminar también los volúmenes:

```bash
docker compose down -v
```

> [!NOTE]
> Docker Compose crea automáticamente una red compartida para todos los servicios definidos en el archivo, por eso no necesitamos crearla manualmente.

## Conectar pgAdmin a PostgreSQL

Una vez que ambos servicios estén corriendo, accede a pgAdmin en `http://localhost:8085` y sigue estos pasos:

1. Inicia sesión con el email y contraseña que configuraste
2. Haz clic derecho en "Servers" y selecciona "Register > Server"
3. En la pestaña "General", ponle un nombre al servidor (por ejemplo: "Local Docker Postgres")
4. En la pestaña "Connection":
   * **Host**: `postgres` (el nombre del servicio PostgreSQL en Docker Compose)
   * **Port**: `5432`
   * **Username**: `root`
   * **Password**: `root`
5. Guarda la configuración

> [!NOTE]
> Con Docker Compose, los servicios pueden referenciarse entre sí usando sus nombres. Por eso usamos `postgres` como hostname en lugar de `localhost`.

## Resumen

En este módulo hemos aprendido a:

1. Levantar pgAdmin con Docker
2. Usar Docker Compose para orquestar PostgreSQL y pgAdmin juntos
3. Conectar pgAdmin a PostgreSQL usando nombres de servicios en una red compartida

Con pgAdmin configurado, ahora tienes una forma visual y práctica de explorar tu base de datos, ejecutar consultas y gestionar tus tablas.
