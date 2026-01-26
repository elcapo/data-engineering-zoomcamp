# Infraestructura y prerrequisitos

## Dockerizar PostgreSQL

* Notas originales (en inglés): [Running PostgreSQL with Docker](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/01-docker-terraform/docker-sql/04-postgres-docker.md)

En este módulo vamos a empezar a entender los beneficios de usar Docker para contener las dependencias de nuestros proyectos. Porque las dependencias de un script de Python que se conecta a una base de datos (en este caso usaremos PostgreSQL) no son solo las librerías necesarias para que nuestro script se conecte a la base de datos. El motor de base de datos es también una dependencia y podemos dockerizarla.

Para iniciar un servidor PostgreSQL con Docker, podemos usar la correspondiente imagen oficial:

```bash
docker run -it --rm \
    -e POSTGRES_USER="root" \
    -e POSTGRES_PASSWORD="root" \
    -e POSTGRES_DB="taxi" \
    -v taxi_postgres_data:/var/lib/postgresql \
    -p 5432:5432 \
    postgres:18
```

### Explicación de los parámetros

* `-it` permite que interactuemos con el contenedor a través de la terminal desde la que lanzamos el comando
* `--rm` hace que el contenedor se ejecute y sea eliminado tan pronto como termine de ejecutarse
* `-e` permite especificar variables de entorno (usuario, contraseña y nombre de la base de datos)
* `-v [volumen]` dice a Docker que cree un volumen para que los datos queden guardados aunque se detenga el contenedor
* `-p [puerto]` permite que mapeemos un puerto del contenedor para que sea accesible desde el host
* `postgres:18` hace referencia a la imagen `postgres` y a la versión `18` que queremos usar

### Volumen interno

Fíjate que en este caso estamos configurando un volumen de manera algo diferente a como lo hicimos en la [introducción a Docker](01-introduccion-a-docker.md).

Esta vez usamos un **volumen interno**:

* lo que significa que el host no va a tener (en principio) acceso a lo que haya en ese volumen,
* con los volúmenes internos nos limitamos a darle un nombre y dejamos que Docker se encargue de crear las carpetas dentro del contenedor.

```bash
docker run -it --rm \
    -v volumen_interno:/app \
    ...
```

La alternativa, que ya habíamos visto, consiste en usar un **volumen compartido**:

* lo que significa que creamos una carpeta en el host y decimos a Docker que la haga "visible" desde el contenedor,
* con los volúmenes compartido no es necesario que demos un nombre, en su lugar, especificamos dónde está la carpeta que compartiremos con el contenedor.

```bash
docker run -it --rm \
    -v $(pwd):/app \
    ...
```

### Conexión usando `pgcli`

#### Conexión al vuelo

Ahora que sabemos cómo lanzar un servicio Postgres, el siguiente paso lógico para construir un flujo de datos es conectarnos al servidor desde un script Python.

`pgcli` es una librería de Python que facilita las conexiones con un servidor PostgreSQL. Podemos probarla de forma rápida gracias al modificador `--with [dependencia]` de `uv` que permite especificar con qué dependencias queremos lanzar un comando aunque no estemos en un proyecto, ni queramos instalarla globalmente:

```bash
uv run --with pgcli pgcli -h localhost -p 5432 -u root -d taxi
```

##### Explicación de los parámetros

* `--with [dependencia]` dice a **uv** que instale descargue esta dependencia y la use "al vuelo" (en nuestro caso: _pgcli_)
* `-h [servidor]` dice a **pgcli** a qué equipo debe conectarse (en nuestro caso: _localhost_)
* `-p [puerto]` dice a **pgcli** a qué puerto del equipo debe conectarse (en nuestro caso: _5432_)
* `-u [usuario]` dice a **pgcli** con qué usuario debe iniciarse la conexión (en nuestro caso: _root_)
* `-d [base de datos]` dice a **pgcli** a qué base de datos debe conectarse (en nuestro caso: _taxi_)

Al lanzar este comando se nos pedirá la contraseña y, una vez la introduzcamos, se abrirá una consola SQL conectada a nuestro PostgreSQL.

#### Conexión desde un proyecto

Si vamos a usar **pgcli** habitualmente, es probable que queramos que forme parte de las dependencias de nuestro proyecto. De ser así, lo más probable es que queramos que sea una dependencia de desarrollo. Así que como alternativa a usar la dependencia "al vuelo", podríamos:

```bash
# Crear un proyecto `uv`
mkdir pipeline
cd pipeline
uv init

# Instalar `pgcli` como dependencia de desarrollo
uv add --dev pgcli
```

Ahora, desde esde proyecto podremos usar **pgcli** sin necesidad añadir el parámetro `--with`:

```bash
uv run pgcli -h localhost -p 5432 -u root -d taxi
```

#### Usando la interfaz de `pgcli`

Una vez abierta una sesión en **pgcli**, podemos interactuar directamente con la base de datos. Eso sí, por el momento está vacía. Podemos comprobarlo lanzando el comando:

```sql
\dt
```

A modo de ejemplo, podemos crear una tabla, insertar un registro, listar los registros de la tabla y luego borrarla.

```sql
-- Crear una tabla de prueba
CREATE TABLE test (id INTEGER, name VARCHAR(50));

-- Meter un registro en la tabla
INSERT INTO test VALUES (1, '¡Hola Docker!');

-- Consultar los registros de la tabla
SELECT * FROM test;

-- Eliminar la tabla
DROP TABLE test;

-- Cerrar la sesión
\q
```

## Interfaz gráfica de adminstración `pgAdmin`

Además de `pgcli`, existe `pgAdmin`, una interfaz web que permite administrar PostgreSQL de forma visual. Es especialmente útil cuando trabajas con bases de datos complejas o quieres visualizar datos de forma rápida.

Para levantar pgAdmin junto con PostgreSQL, podemos usar otro contenedor Docker:

```bash
docker run -it --rm \
    -e PGADMIN_DEFAULT_EMAIL="admin@admin.com" \
    -e PGADMIN_DEFAULT_PASSWORD="root" \
    -p 8085:80 \
    dpage/pgadmin4
```

Una vez iniciado, puedes acceder a pgAdmin desde tu navegador en `http://localhost:8085` usando las credenciales que especificaste.

## Docker Compose: Orquestando múltiples servicios

Hasta ahora hemos levantado servicios con `docker run`, pero cuando necesitamos varios contenedores trabajando juntos (PostgreSQL, pgAdmin, nuestra aplicación Python), gestionar cada uno por separado se vuelve tedioso.

**Docker Compose** permite definir y ejecutar aplicaciones multi-contenedor con un único archivo de configuración.

### Crear un archivo `docker-compose.yml`

Crea un archivo `docker-compose.yml` en la raíz de tu proyecto:

```yaml
services:
  pgdatabase:
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
* **`pgdatabase:`**: Nombre del servicio PostgreSQL (podemos elegir el nombre que queramos)
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
> Con Docker Compose, los servicios pueden referenciarse entre sí usando sus nombres. Por ejemplo, desde pgAdmin podrás conectarte al servidor PostgreSQL usando `pgdatabase` como hostname en lugar de `localhost`.

## Networking entre contenedores

Cuando ejecutas contenedores de forma individual con `docker run`, por defecto no pueden comunicarse entre sí fácilmente. Necesitas crear una red Docker compartida:

```bash
# Crear una red
docker network create taxi_network

# Levantar PostgreSQL en esa red
docker run -d --rm \
    --name pgdatabase \
    --network taxi_network \
    -e POSTGRES_USER="root" \
    -e POSTGRES_PASSWORD="root" \
    -e POSTGRES_DB="taxi" \
    -v taxi_postgres_data:/var/lib/postgresql \
    -p 5432:5432 \
    postgres:18

# Ejecutar tu script Python en la misma red
docker run --rm \
    --network taxi_network \
    -e DB_HOST=pgdatabase \
    -v $(pwd)/data:/app/data \
    python_pipeline:3.13
```

Fíjate que:

* Ambos contenedores están en la red `taxi_network`
* El script Python usa `pgdatabase` como hostname (el nombre que le dimos al contenedor PostgreSQL)
* No necesitamos publicar el puerto 5432 si solo vamos a acceder desde otros contenedores, pero lo mantenemos para poder conectarnos también desde el host

> [!NOTE]
> Docker Compose crea automáticamente una red compartida para todos los servicios definidos en el archivo `docker-compose.yml`, por eso no necesitamos crearla manualmente cuando lo usamos.

## Buenas prácticas para PostgreSQL en Docker

### Usa variables de entorno para credenciales

Nunca escribas credenciales directamente en el código. Usa variables de entorno, o archivos `.env`:

```bash
# .env
POSTGRES_HOST_PORT=5433
POSTGRES_DB=newyork_taxi
POSTGRES_USER=root
POSTGRES_PASSWORD=1234
```

Y referencia las variables desde tu Docker Compose para que, sin necesidad de modificarlo, pueda ser usado con diferentes valores:

```yaml
services:
  pgdatabase:
    image: postgres:18
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-root}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-root}
      POSTGRES_DB: ${POSTGRES_DB:-taxi}
    volumes:
      - taxi_postgres_data:/var/lib/postgresql
    ports:
      - ${POSTGRES_HOST_PORT:-5432}:5432
    networks:
      - taxi_postgres_network
```

Ahora, solo con lanzar 

> [!NOTE]
> Recuerda añadir `.env` a tu `.gitignore` para no subir credenciales a Git.

Alternativamente, puedes especificar las variables en el momento de iniciar los servicios sin necesidad de crear un fichero `.env`:

```bash
POSTGRES_HOST_PORT=5433 docker compose up -d
```

## Resumen

En este módulo hemos aprendido a:

1. Levantar un servidor PostgreSQL con Docker
2. Conectarnos a PostgreSQL con `pgcli` para ejecutar consultas manualmente
3. Usar pgAdmin como interfaz gráfica
4. Orquestar múltiples servicios con Docker Compose
5. Configurar networking entre contenedores
6. Asegurar la persistencia de datos con volúmenes

Con estas herramientas ya tienes lo fundamental para crear pipelines de datos que procesen información y la almacenen en PostgreSQL, todo ello usando contenedores Docker que facilitan el despliegue y la colaboración.
