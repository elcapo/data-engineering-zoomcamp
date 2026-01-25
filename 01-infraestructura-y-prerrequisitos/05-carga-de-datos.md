# Infraestructura y prerrequisitos

## Carga de datos

Por fin, vamos a comenzar a implementar nuestro script de carga de datos. En particular, vamos a leer uno de los ficheros del [New York City Tax Dataset](https://www1.nyc.gov/site/tlc/about/tlc-trip-record-data.page); en particular, el [fichero CSV de taxis amarillos de enero de 2021](https://github.com/DataTalksClub/nyc-tlc-data/releases/download/yellow/yellow_tripdata_2021-01.csv.gz).

> [!NOTE]
> Aunque en este capítulo nos centremos en los datos de enero de 2021, en el próximo capítulo, vamos a añadir parámetros a nuestro script para que pueda leer el fichero de otros años y meses sin necesidad de moficiar el código.

## Exploración de datos

Con Pandas, es bastante sencillo cargar los datos de un CSV, incluso a partir de su versión comprimida y a través de una URL:

```python
import pandas as pd

prefix = 'https://github.com/DataTalksClub/nyc-tlc-data/releases/download/yellow/'
df = pd.read_csv(prefix + 'yellow_tripdata_2021-01.csv.gz', nrows=100)

df.head()
```

```
   VendorID tpep_pickup_datetime tpep_dropoff_datetime  ...  improvement_surcharge  total_amount  congestion_surcharge
0         1  2021-01-01 00:30:10   2021-01-01 00:36:12  ...                    0.3         11.80                   2.5
1         1  2021-01-01 00:51:20   2021-01-01 00:52:19  ...                    0.3          4.30                   0.0
2         1  2021-01-01 00:43:30   2021-01-01 01:11:06  ...                    0.3         51.95                   0.0
3         1  2021-01-01 00:15:48   2021-01-01 00:31:01  ...                    0.3         36.35                   0.0
4         2  2021-01-01 00:31:49   2021-01-01 00:48:21  ...                    0.3         24.36                   2.5

[5 rows x 18 columns]
```

## Gestión de tipos de datos

Antes de continuar, conviene que añadamos información en nuestra llamada a `read_csv` para que sepa gestionar correctamente el tipo de dato de cada columna.

```python
dtype = {
    "VendorID": "Int64",
    "passenger_count": "Int64",
    "trip_distance": "float64",
    "RatecodeID": "Int64",
    "store_and_fwd_flag": "string",
    "PULocationID": "Int64",
    "DOLocationID": "Int64",
    "payment_type": "Int64",
    "fare_amount": "float64",
    "extra": "float64",
    "mta_tax": "float64",
    "tip_amount": "float64",
    "tolls_amount": "float64",
    "improvement_surcharge": "float64",
    "total_amount": "float64",
    "congestion_surcharge": "float64"
}

parse_dates = [
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime"
]

df = pd.read_csv(
    prefix + 'yellow_tripdata_2021-01.csv.gz',
    dtype=dtype,
    parse_dates=parse_dates
)
```

## Carga de datos en PostgreSQL

Para cargar los datos en nuestro servidor PostgreSQL, vamos a necesitar añadir dos librerías a nuestro proyecto: **sqlalchemy** y **psycopg2-binary**.

```bash
uv add sqlalchemy psycopg2-binary
```

### Conexión a PostgreSQL

Ahora podemos usar **sqlalchemy** para crear una conexión a la base de datos:

```python
from sqlalchemy import create_engine
engine = create_engine('postgresql://root:root@localhost:5432/ny_taxi')
```

### Obtener la consulta de creación de la tabla

Ahora viene lo interesante. Teniendo el _dataframe_ de Pandas ya cargado con los tipos de datos de cada columna y una conexión a nuestro PostgreSQL, podemos obtener la consulta SQL que crearía la tabla en el servidor usando una función específica de Pandas para esto:

```python
print(pd.io.sql.get_schema(df, name='yellow_taxi_data', con=engine))
```

```sql
CREATE TABLE yellow_taxi_data (
	"VendorID" BIGINT, 
	tpep_pickup_datetime TIMESTAMP WITHOUT TIME ZONE, 
	tpep_dropoff_datetime TIMESTAMP WITHOUT TIME ZONE, 
	passenger_count BIGINT, 
	trip_distance FLOAT(53), 
	"RatecodeID" BIGINT, 
	store_and_fwd_flag TEXT, 
	"PULocationID" BIGINT, 
	"DOLocationID" BIGINT, 
	payment_type BIGINT, 
	fare_amount FLOAT(53), 
	extra FLOAT(53), 
	mta_tax FLOAT(53), 
	tip_amount FLOAT(53), 
	tolls_amount FLOAT(53), 
	improvement_surcharge FLOAT(53), 
	total_amount FLOAT(53), 
	congestion_surcharge FLOAT(53)
)
```

### Crear la tabla

Además de obtener la consulta que crea la tabla, también podemos decirle a Pandas que cree la tabla:

```python
df.head(n=0).to_sql(name='yellow_taxi_data', con=engine, if_exists='replace')
```

En la práctica, para nuestra implementación del flujo de datos, optamos por encapsular el código dos funciones:

```python
def read_header(filename):
    return pd.read_csv(
        filename,
        dtype=get_column_types(),
        parse_dates=get_date_columns(),
        nrows=0,
    )

def create_table_schema(connection_string, table_name):
    df = read_header()
    engine = create_engine(connection_string)
    df.head(0).to_sql(
        name=table_name,
        con=engine,
        if_exists='replace',
        index=False
    )
```

### Iterar datos por lotes

Otra funcionalidad de Pandas que nos va a venir muy bien para cargar datos es la de iterar un conjunto de datos por lotes. El fichero que estamos tratando tiene más de un millón de filas (en concreto, 1.369.765) por lo que iterarlas e insertarlas una a una llevaría más tiempo del necesario.

Combinando los argumentos `iterator` y `chunksize`, al llamar a `read_csv` podemos decirle a Pandas que nos prepare un iterador que nos devuelva los datos en lotes de un cierto tamaño.

```python
df_iter = pd.read_csv(
    prefix + 'yellow_tripdata_2021-01.csv.gz',
    dtype=dtype,
    parse_dates=parse_dates,
    iterator=True,
    chunksize=100000
)

for i, df_chunk in enumerate(df_iter):
    print(f"La iteración {i + 1} tiene {len(df_chunk)} registros")
```

### Insertar un lote en PostgreSQL

Gracias al mismo método `to_sql` de Pandas que usamos para crear la tabla, podemos insertar un lote de registros en PostgreSQL con una única llamada:

```python
df_chunk.to_sql(name='yellow_taxi_data', con=engine, if_exists='append')
```

### Bucle de inserción

#### Versión simple

Combinando las técnicas que acabamos de ver, ya podemos crear un primer bucle que rellena la tabla PostgreSQL con los registros de nuestro CSV:

```python
first = True
for index, df_chunk in tqdm(enumerate(df_iter)):
    if first:
        create_table_schema(connection_string, target_table)
        first = False

    insert_chunk(df_chunk, connection_string, target_table, index)
```

#### Versión informativa

Gracias a una nueva dependencia, `tqdm`, podemos hacer que nuestro proceso nos informe con una barra de progreso según empieza a procesar cada lote de datos con una modificación mínima.

En primer lugar, instalamos la librería:

```bash
uv add tqdm
```

Luego, modificamos el bucle:

```python
from tqdm.auto import tqdm

for df_chunk in tqdm(df_iter):
    # Lo demás sigue igual
```

#### Versión paralelizada

Aunque nuestro proceso, al ir por lotes, es bastante eficiente, podemos tratar de hacerlo más rápido haciendo que se lancen varias inserciones en paralelo. Para conseguirlo, primero vamos a escribir una función que recibe un lote y se encarga de insertar los registros en PostgreSQL.

```python
def insert_chunk(chunk, connection_string, table_name, chunk_id):
    try:
        engine = create_engine(connection_string)
        chunk.to_sql(
            name=table_name,
            con=engine,
            if_exists='append',
            index=False
        )
        return chunk_id
    except:
        raise
```

Ahora, podemos usar los **threads** de Python para ir lanzando varios lotes en paralelo sin tener que esperar a que termine el anterior.

```python
with ThreadPoolExecutor(max_workers=max_workers) as executor:
    futures = {}

    for index, chunk in tqdm(enumerate(iterate_rows(chunksize=chunksize))):
        future = executor.submit(
            insert_chunk, 
            chunk, 
            connection_string, 
            target_table, 
            index
        )
        futures[future] = index
```

#### Comparativa

| Versión | Registros | ETA |
| --- | --- | --- |
| Por lotes en serie | 1.369.765 | 7m 41s |
| Por lotes en paralelo | 1.369.765 |  5m 09s |

> [!NOTE]
> En la carpeta [pipeline/](pipeline/) puedes encontrar las versiones completas y funcionales de los procesos que se han descrito en este artículo.
