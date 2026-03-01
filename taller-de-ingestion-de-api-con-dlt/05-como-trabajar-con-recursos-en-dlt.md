# Taller: **Ingestión de datos de una API con DLT**

## ¿Cómo se trabaja con **recursos** en DLT?

En el artículo anterior vimos que una **fuente** en **dlt** es la unidad que agrupa los endpoints de una misma API. Ahora profundizamos en el componente que hace el trabajo real: el **recurso**.

## ¿Qué es un **recurso** en DLT?

Un **recurso** en **dlt** es una función que produce datos mediante `yield`. Es el componente fundamental para extraer información: cada recurso corresponde a un endpoint y genera la tabla de destino del mismo nombre.

En el [taxi-pipeline](pipelines/taxi-pipeline/taxi_pipeline.py), el recurso `rides` se declara de forma declarativa dentro del diccionario de configuración de `rest_api_source`:

```python
"resources": [
    {
        "name": "rides",
        "endpoint": {
            "path": "",
            "paginator": {
                "type": "page_number",
                "page_param": "page",
                "base_page": 1,
                "total_path": None,
                "stop_after_empty_page": True,
            },
        },
    }
],
```

Este fragmento le dice a **dlt** que existe un recurso llamado `rides`, cómo paginar la API y qué path consultar. El resultado final es una tabla `rides` en la base de datos de destino.

## El decorador `@dlt.resource`

Además del estilo declarativo del `rest_api_source`, **dlt** ofrece el decorador `@dlt.resource` para implementar recursos con código Python arbitrario:

```python
import dlt

@dlt.resource(name="rides", write_disposition="append")
def rides():
    for page in paginate_taxi_api():
        yield page
```

Al decorar la función con `@dlt.resource`, **dlt** la convierte en un recurso que:

- infiere el nombre de la tabla a partir del parámetro `name` (o del nombre de la función si no se indica),
- controla cómo se insertan los datos con `write_disposition`,
- puede recibir parámetros de configuración inyectados desde `.dlt/config.toml`.

### Parámetros del decorador

El decorador `@dlt.resource` acepta los siguientes parámetros:

| Parámetro | Descripción |
|-----------|-------------|
| `name` | Nombre de la tabla de destino. Por defecto, el nombre de la función. |
| `table_name` | Nombre alternativo de tabla (útil con nombres dinámicos). |
| `write_disposition` | Cómo se insertan los datos: `"append"`, `"replace"` o `"merge"`. Por defecto, `"append"`. |
| `primary_key` | Columna o columnas que identifican de forma única un registro (necesario para `merge`). |
| `merge_key` | Columnas adicionales para la estrategia de mezcla. |
| `columns` | Definición explícita del esquema (tipado de columnas). |
| `max_table_nesting` | Profundidad máxima de tablas anidadas generadas por normalización. |
| `schema_contract` | Política de evolución del esquema (`"evolve"`, `"freeze"`, `"discard_rows"`, etc.). |
| `parallelized` | Si es `True`, el recurso se ejecuta en un hilo paralelo. |
| `file_format` | Formato de archivo intermedio (`"parquet"`, `"csv"`, etc.). |
| `selected` | Si es `False`, el recurso existe pero no se carga por defecto. |

## Modos de escritura (`write_disposition`)

El parámetro `write_disposition` controla qué ocurre cada vez que el pipeline se ejecuta. Los tres modos disponibles son:

### `"append"` (por defecto)

Añade los nuevos registros al final de la tabla sin modificar los existentes. Es el comportamiento por defecto y el que usa el taxi-pipeline:

```python
@dlt.resource(name="rides", write_disposition="append")
def rides():
    yield from paginate_taxi_api()
```

Cada ejecución del pipeline agrega más viajes a la tabla `rides`.

### `"replace"`

Elimina todo el contenido de la tabla y la repuebla con los datos de la ejecución actual. Útil para tablas de referencia que deben mantenerse sincronizadas con la fuente:

```python
@dlt.resource(name="zones", write_disposition="replace")
def zones():
    yield from fetch_taxi_zones()
```

### `"merge"`

Actualiza los registros existentes y añade los nuevos, usando `primary_key` para identificar duplicados. Requiere declarar la clave primaria:

```python
@dlt.resource(
    name="rides",
    write_disposition="merge",
    primary_key="vendor_name",
)
def rides():
    yield from paginate_taxi_api()
```

> [!NOTE]
> El modo `"merge"` es el adecuado para cargas incrementales: en cada ejecución solo se transfieren los registros nuevos o modificados, y **dlt** se encarga de insertar o actualizar según corresponda.

## Recursos parametrizados

Los recursos son funciones Python, por lo que pueden recibir parámetros:

```python
@dlt.resource(name="rides", write_disposition="append")
def rides(start_date: str = "2019-01-01"):
    for page in paginate_taxi_api(since=start_date):
        yield page

# Ejecutar para un rango específico
pipeline.run(rides(start_date="2019-06-01"))
```

Los parámetros también pueden inyectarse automáticamente desde `.dlt/config.toml`:

```toml
[sources.taxi_api.rides]
start_date = "2019-01-01"
```

## Definición explícita del esquema

Cuando queremos que **dlt** use tipos de datos concretos en lugar de inferirlos, podemos declarar el esquema con el parámetro `columns`:

```python
@dlt.resource(
    name="rides",
    columns={
        "vendor_name":       {"data_type": "text"},
        "pickup_datetime":   {"data_type": "timestamp"},
        "dropoff_datetime":  {"data_type": "timestamp"},
        "passenger_count":   {"data_type": "bigint"},
        "trip_distance":     {"data_type": "double"},
        "fare_amount":       {"data_type": "double"},
        "tip_amount":        {"data_type": "double"},
        "total_amount":      {"data_type": "double"},
    },
)
def rides():
    yield from paginate_taxi_api()
```

También se puede usar un modelo **Pydantic** como esquema, lo que además valida los datos en tiempo de extracción:

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Ride(BaseModel):
    vendor_name: str
    pickup_datetime: datetime
    dropoff_datetime: datetime
    passenger_count: int
    trip_distance: float
    fare_amount: float
    tip_amount: Optional[float]
    total_amount: float

@dlt.resource(name="rides", columns=Ride)
def rides():
    yield from paginate_taxi_api()
```

## Transformaciones sobre recursos

Una de las capacidades más prácticas de **dlt** es poder transformar los datos en el mismo momento de la extracción, sin necesidad de pasos adicionales.

### `add_map`: transformar cada registro

`add_map` aplica una función a cada registro antes de cargarlo. Es útil para limpiar, renombrar o enriquecer campos:

```python
def convert_distance_to_km(ride):
    """Convierte trip_distance de millas a kilómetros."""
    ride["trip_distance_km"] = ride.get("trip_distance", 0) * 1.60934
    return ride

pipeline.run(rides().add_map(convert_distance_to_km))
```

### `add_filter`: descartar registros

`add_filter` descarta los registros que no cumplen una condición. Solo pasan los registros para los que la función devuelve `True`:

```python
# Solo viajes con al menos un pasajero y distancia mayor a 0
pipeline.run(
    rides().add_filter(
        lambda ride: ride.get("passenger_count", 0) > 0
                  and ride.get("trip_distance", 0) > 0
    )
)
```

Los filtros son componibles: podemos encadenar varios sobre el mismo recurso:

```python
source = taxi_source()
source.rides.add_filter(lambda r: r.get("passenger_count", 0) > 0)
source.rides.add_filter(lambda r: r.get("trip_distance", 0) > 0)
pipeline.run(source)
```

### `add_yield_map`: expandir un registro en varios

`add_yield_map` permite que una función transformadora devuelva cero, uno o varios registros por cada registro de entrada:

```python
def split_ride_by_passenger(ride):
    """Genera un registro por cada pasajero del viaje."""
    for i in range(ride.get("passenger_count", 1)):
        yield {**ride, "passenger_index": i}

pipeline.run(rides().add_yield_map(split_ride_by_passenger))
```

## Transformadores: recursos que dependen de otros

Un **transformador** es un recurso especial que recibe su entrada de otro recurso en lugar de de una API directamente. Se declara con el decorador `@dlt.transformer` y permite encadenar llamadas a la API cuando el resultado de un endpoint es necesario para consultar el siguiente.

Imaginemos que la API del taxi expone un endpoint de detalles del conductor que requiere el `vendor_name` de cada viaje:

```python
@dlt.resource(name="rides", write_disposition="append")
def rides():
    yield from paginate_taxi_api()

@dlt.transformer(data_from=rides, name="driver_details")
def driver_details(ride):
    vendor = ride["vendor_name"]
    yield fetch_driver_info(vendor)
```

Al ejecutar `pipeline.run(driver_details)`, **dlt** primero extrae los `rides` y luego, por cada viaje, consulta los detalles del conductor.

### El operador `|` (pipe)

El operador `|` es la forma más compacta de encadenar recursos y transformadores en el momento de la ejecución, sin necesidad de declarar la dependencia en la definición:

```python
# Encadenar rides con driver_details en una sola expresión
pipeline.run(rides() | driver_details)
```

Esto es especialmente útil cuando queremos reutilizar el mismo transformador con diferentes fuentes de entrada:

```python
@dlt.transformer(name="driver_details")
def driver_details(ride):
    yield fetch_driver_info(ride["vendor_name"])

# Producción: todos los viajes
pipeline.run(rides() | driver_details)

# Desarrollo: solo los primeros 5 lotes
pipeline.run(rides().add_limit(5) | driver_details)
```

## Limitación de datos con `add_limit`

Durante el desarrollo, `add_limit` permite ejecutar el recurso sobre un subconjunto de datos para verificar que la lógica es correcta sin esperar a que se descarguen todos los registros:

```python
# Procesar solo los primeros 3 lotes de paginación
pipeline.run(rides().add_limit(3))

# Procesar durante un máximo de 20 segundos
pipeline.run(rides().add_limit(max_time=20))

# Limitar por número de filas en lugar de yields
pipeline.run(rides().add_limit(100, count_rows=True))
```

> [!NOTE]
> Por defecto, `add_limit` limita el número de **yields** del generador (es decir, el número de páginas o lotes), no el número de filas. En el taxi-pipeline, donde cada página contiene varios viajes, `add_limit(3)` extraerá los registros de las tres primeras páginas.

## Despacho a múltiples tablas

Un mismo recurso puede escribir en tablas diferentes según el contenido de cada registro. Esto es útil cuando la API devuelve eventos de distintos tipos en un mismo endpoint:

```python
@dlt.resource(table_name=lambda ride: f"rides_{ride['payment_type']}")
def rides():
    yield from paginate_taxi_api()
```

Con esto, un viaje pagado con tarjeta iría a la tabla `rides_credit_card` y uno pagado en efectivo a `rides_cash`.

También se puede usar `dlt.mark.with_table_name` para marcar registros individualmente dentro del generador:

```python
@dlt.resource
def rides():
    for ride in paginate_taxi_api():
        table = f"rides_{ride.get('payment_type', 'unknown')}"
        yield dlt.mark.with_table_name(ride, table)
```

## Recursos paralelos y asíncronos

Cuando una fuente tiene varios recursos independientes entre sí, podemos acelerar la extracción ejecutándolos en paralelo:

```python
@dlt.resource(name="rides", parallelized=True)
def rides():
    yield from paginate_taxi_api()

@dlt.resource(name="zones", parallelized=True)
def zones():
    yield from fetch_taxi_zones()

pipeline.run([rides(), zones()])
```

Para operaciones de red, la alternativa asíncrona es aún más eficiente y no requiere configuración adicional:

```python
import httpx

@dlt.resource(name="rides")
async def rides():
    async with httpx.AsyncClient() as client:
        async for page in async_paginate(client):
            yield page
```

## El recurso `rides` del taxi-pipeline con `@dlt.resource`

Integrando todo lo anterior, así quedaría el recurso `rides` del taxi-pipeline reescrito con el decorador `@dlt.resource`, preparado para producción:

```python
import dlt
import requests

BASE_URL = "https://us-central1-dlthub-analytics.cloudfunctions.net/data_engineering_zoomcamp_api"

def convert_distance_to_km(ride):
    ride["trip_distance_km"] = ride.get("trip_distance", 0) * 1.60934
    return ride

@dlt.resource(
    name="rides",
    write_disposition="append",
    columns={
        "vendor_name":     {"data_type": "text"},
        "pickup_datetime": {"data_type": "timestamp"},
        "trip_distance":   {"data_type": "double"},
        "total_amount":    {"data_type": "double"},
    },
)
def rides():
    page = 1
    while True:
        response = requests.get(BASE_URL, params={"page": page}).json()
        if not response:
            break
        yield response
        page += 1

if __name__ == "__main__":
    pipeline = dlt.pipeline(
        pipeline_name="taxi_pipeline",
        destination="duckdb",
        dataset_name="taxi_data",
        dev_mode=True,
        progress="log",
    )
    load_info = pipeline.run(
        rides()
        .add_filter(lambda r: r.get("trip_distance", 0) > 0)
        .add_map(convert_distance_to_km)
    )
    print(load_info)
```

## Resumen

Los recursos son el componente central de cualquier pipeline en **dlt**: son los que extraen, transforman y definen cómo se cargan los datos. Las capacidades más importantes son:

| Capacidad | Mecanismo |
|-----------|-----------|
| Controlar la inserción | `write_disposition` (`append`, `replace`, `merge`) |
| Definir el esquema | `columns` con dict o modelo Pydantic |
| Transformar registros | `add_map`, `add_yield_map` |
| Filtrar registros | `add_filter` |
| Encadenar recursos | `@dlt.transformer` y operador `\|` |
| Limitar para pruebas | `add_limit` |
| Escribir en varias tablas | `table_name` dinámico o `dlt.mark.with_table_name` |
| Paralelizar la extracción | `parallelized=True` o funciones `async` |

Para más información, consulta la documentación oficial de **dlt** sobre [recursos](https://dlthub.com/docs/general-usage/resource) (en inglés).
