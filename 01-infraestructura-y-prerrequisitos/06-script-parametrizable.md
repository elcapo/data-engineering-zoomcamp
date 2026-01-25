# Infraestructura y prerrequisitos

## Script parametrizable

Durante el capítulo anterior llegamos a completar dos versiones de nuestro script de ingestión de datos plenamente funcionales. Salvo que no son realmente útiles, porque únicamente importan el fichero correspondiente a un mes en particular.

Además, aunque nuestro entorno Docker es parametrizable vía parámetros de entorno, nuestro script tiene "hardcodeados" (escritos a mano) los parámetros de conexión a PostgreSQL.

Así que vamos a hacer que nuestro script responda a parámetros de forma que podamos, en el momento de llamarlo, especificar:

* `--year [año]` el año del que queremos descargarnos los datos
* `--month [mes]` el mes del que queremos descargarnos los datos
* `--chunksize [tamaño]` el tamaño en número de registros de cada lote
* `--target-table [tabla]` el nombre de la tabla en la que vamos a insertar los datos
* `--pg-host [host]` el host al que el script debe conectarse
* `--pg-user [usuario]` el usuario con el que el script debe conectarse a la base de datos de PostgreSQL
* `--pg-password [contraseña]` la contraseña del usuario con el que vamos a conectarnos a PostgreSQL
* `--pg-port [puerto]` el puerto por el que vamos a conectarnos a PostgreSQL
* `--pg-database [base de datos]` el nombre de la base de datos a la que nos vamos a conectar

### Uso de `click` para parsear los parámetros

Para hacernos la vida más fácil, vamos a usar **click**, una dependencia que nos va a permitir implementar la especificación anterior con solo añadir unos pocos decoradores a nuestra función **ingest**.

```python
import click

@click.command()
@click.option('--year', default=2021, type=int, help='Year of the data')
@click.option('--month', default=1, type=int, help='Month of the data')
@click.option('--chunksize', default=100000, type=int, help='Chunk size for reading CSV')
@click.option('--target-table', default='yellow_taxi_data', help='Target table name')
@click.option('--pg-host', default='localhost', help='PostgreSQL host')
@click.option('--pg-user', default='root', help='PostgreSQL user')
@click.option('--pg-password', default='root', help='PostgreSQL password')
@click.option('--pg-port', default=5432, type=int, help='PostgreSQL port')
@click.option('--pg-database', default='ny_taxi', help='PostgreSQL database name')
def ingest(year, month, chunksize, target_table, pg_host, pg_user, pg_password, pg_port, pg_database):
    pass
```

### Usar los parámetros

Una vez actualizado el código de nuestro flujo de datos, ahora podemos ejecutar el proceso para otros ficheros simplemente añadiendo el parámetro en el momento de lanzarlo:

```bash
uv run pipeline.py --year 2021 --month 2
```

Si en algún momento nos olvidásemos de los argumentos que tenemos disponibles, podríamos ver qué parámetros tenemos disponibles con:

```bash
uv run pipeline.py --help
```

```
Usage: pipeline.py [OPTIONS]

Options:
  --year INTEGER       Year of the data
  --month INTEGER      Month of the data
  --chunksize INTEGER  Chunk size for reading CSV
  --target-table TEXT  Target table name
  --pg-host TEXT       PostgreSQL host
  --pg-user TEXT       PostgreSQL user
  --pg-password TEXT   PostgreSQL password
  --pg-port INTEGER    PostgreSQL port
  --pg-database TEXT   PostgreSQL database name
  --help               Show this message and exit.
```

Alternativamente, podemos lanzar el flujo de trabajo en el entorno Dockerizado:

```bash
docker compose build pipeline
docker compose run --rm pipeline --year 2021 --month 1
```
