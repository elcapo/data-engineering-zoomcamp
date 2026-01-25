# Infraestructura y prerrequisitos

## Dockerizar PostgreSQL

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