# Taller: **Ingestión de datos de una API con DLT**

## ¿Cómo se trabaja con fuentes en DLT?

En los artículos anteriores hemos visto cómo **dlt** extrae, normaliza y carga datos desde una API REST, cómo gestiona la evolución del esquema y cómo optimizar la ejecución de flujos en Kestra. En este artículo profundizamos en uno de los conceptos centrales de **dlt**: las **fuentes** (`sources`).

## ¿Qué es una **fuente** en DLT?

Una **fuente** en **dlt** es una agrupación lógica de recursos, es decir, una unidad que representa todos los endpoints de una misma API. Encapsula la lógica de autenticación, la configuración del cliente HTTP y los parámetros comunes, dejando a cada recurso la responsabilidad de obtener los datos de su propio endpoint.

En el [taxi-pipeline](pipelines/taxi-pipeline/taxi_pipeline.py) que venimos usando como referencia, la fuente se construye directamente con la función de fábrica `rest_api_source`:

```python
import dlt
from dlt.sources.rest_api import rest_api_source

source = rest_api_source({
    "client": {
        "base_url": "https://us-central1-dlthub-analytics.cloudfunctions.net/data_engineering_zoomcamp_api",
    },
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
})
```

Este objeto `source` es exactamente lo que se le pasa a `pipeline.run()`:

```python
pipeline = dlt.pipeline(
    pipeline_name="taxi_pipeline",
    destination="duckdb",
    dataset_name="taxi_data",
    dev_mode=True,
    progress="log",
)
load_info = pipeline.run(source)
```

## El decorador `@dlt.source`

Además de usar `rest_api_source` como función de fábrica, **dlt** ofrece el decorador `@dlt.source` para declarar fuentes propias. Una función decorada con `@dlt.source` puede devolver o generar uno o varios recursos:

```python
import dlt

@dlt.source
def taxi_rides_source():
    @dlt.resource(name="rides")
    def rides():
        for page in paginate_api():
            yield page

    return rides
```

Al decorar la función, **dlt** la transforma en una fuente que:

- infiere su nombre a partir del nombre de la función (en este caso, `taxi_rides_source`),
- gestiona automáticamente el estado y la configuración,
- puede recibir credenciales y parámetros inyectados desde los archivos `.dlt/config.toml` y `.dlt/secrets.toml`.

### Parámetros del decorador

El decorador `@dlt.source` acepta varios parámetros opcionales que controlan el comportamiento de la fuente:

| Parámetro | Descripción |
|-----------|-------------|
| `name` | Nombre de la fuente. Por defecto toma el nombre de la función. |
| `section` | Sección de configuración en `config.toml` y `secrets.toml`. Por defecto, el nombre de la fuente. |
| `max_table_nesting` | Profundidad máxima de tablas anidadas generadas por normalización. |
| `root_key` | Si es `True`, propaga `_dlt_id` de la tabla raíz a las tablas hijas. |
| `schema_contract` | Política de evolución del esquema (`"evolve"`, `"freeze"`, `"discard_rows"`, etc.). |
| `parallelized` | Si es `True`, los recursos se ejecutan en paralelo. |

#### `max_table_nesting`

Este parámetro es especialmente relevante cuando los datos de la API contienen estructuras anidadas. En el primer artículo vimos cómo los campos `author_name` y `author_key` de la API de OpenLibrary producían tablas hijas. Con `max_table_nesting` podemos controlar hasta qué profundidad se crean esas tablas:

```python
@dlt.source(max_table_nesting=0)
def taxi_rides_source():
    ...
```

Con `max_table_nesting=0` los objetos y arrays anidados se almacenan como JSON en lugar de generar tablas adicionales. Si los registros de viajes del taxi tuviesen campos anidados (por ejemplo, una lista de paradas), este parámetro evitaría la creación de tablas derivadas.

Los valores habituales son:

- `0`: sin tablas anidadas; los datos anidados se almacenan como JSON.
- `1`: un solo nivel de anidación.
- `2` o `3`: recomendado para respuestas JSON complejas y semiestructuradas.

#### `root_key`

Cuando la fuente genera tablas hijas (por ejemplo, `rides__stops`), el parámetro `root_key=True` hace que **dlt** propague el `_dlt_id` de la tabla raíz hasta las tablas descendientes. Esto facilita la trazabilidad y los joins entre tablas:

```python
@dlt.source(root_key=True)
def taxi_rides_source():
    ...
```

## Recursos dentro de una fuente

Una fuente puede agrupar múltiples recursos. Siguiendo con el taxi como ejemplo, imaginemos que la API también expone un endpoint de zonas. Podríamos encapsularlo todo en una misma fuente:

```python
@dlt.source(name="taxi_api")
def taxi_source():
    @dlt.resource(name="rides")
    def rides():
        yield from fetch_rides()

    @dlt.resource(name="zones")
    def zones():
        yield from fetch_zones()

    return rides, zones
```

Con esto, una sola llamada a `pipeline.run(taxi_source())` cargaría tanto los viajes como las zonas.

### Fuentes con recursos generados dinámicamente

Para APIs con muchos endpoints similares, podemos crear recursos de forma dinámica en lugar de declararlos uno a uno:

```python
@dlt.source(name="taxi_api")
def taxi_source():
    endpoints = ["rides", "zones", "drivers"]
    for endpoint in endpoints:
        yield dlt.resource(
            fetch_endpoint(endpoint),
            name=endpoint
        )
```

## Selección de recursos

Cuando una fuente tiene varios recursos, no siempre queremos cargarlos todos. **dlt** permite seleccionar los recursos que nos interesan en cada ejecución.

### Con `with_resources`

El método `with_resources` devuelve una copia de la fuente con solo los recursos indicados seleccionados:

```python
source = taxi_source()

# Cargar solo los viajes
pipeline.run(source.with_resources("rides"))

# Cargar viajes y zonas, pero no conductores
pipeline.run(source.with_resources("rides", "zones"))
```

### Inspeccionando los recursos disponibles

Podemos consultar qué recursos están disponibles y cuáles están seleccionados:

```python
source = taxi_source()

# Todos los recursos definidos en la fuente
print(source.resources.keys())
# dict_keys(['rides', 'zones', 'drivers'])

# Solo los actualmente seleccionados
print(source.resources.selected.keys())
# dict_keys(['rides', 'zones', 'drivers'])
```

### Deseleccionando recursos manualmente

También es posible deseleccionar un recurso concreto accediendo a él por nombre:

```python
source = taxi_source()

# Desactivar el recurso de conductores
source.drivers.selected = False

pipeline.run(source)
```

## Filtros sobre recursos

Una vez obtenida la fuente, podemos añadir filtros a cualquiera de sus recursos sin modificar su definición original. Esto es útil para depurar o para aplicar filtros en tiempo de ejecución:

```python
source = taxi_source()

# Solo viajes de más de 5 km
source.rides.add_filter(
    lambda ride: ride.get("trip_distance", 0) > 5
)

pipeline.run(source)
```

## Limitación de datos con `add_limit`

Durante el desarrollo es habitual querer ejecutar el flujo sobre un subconjunto pequeño de datos para verificar que todo funciona sin esperar a que se descarguen miles de registros. El método `add_limit` permite establecer ese límite:

```python
# Extraer solo los primeros 10 "yields" (páginas o lotes, no filas)
pipeline.run(taxi_source().add_limit(10))
```

> [!NOTE]
> `add_limit` limita el número de **yields** del generador, no el número de filas. En el taxi-pipeline, donde cada página contiene varios viajes, `add_limit(3)` extraerá los primeros tres lotes de resultados de paginación.

También se puede limitar por tiempo máximo de ejecución:

```python
# Extraer durante un máximo de 30 segundos
pipeline.run(taxi_source().add_limit(max_time=30))
```

## Configuración con `config.toml` y `secrets.toml`

Una de las ventajas de declarar fuentes con `@dlt.source` es la inyección automática de parámetros desde los archivos de configuración. Si la API del taxi requiriese autenticación, podríamos declararla así:

```python
@dlt.source
def taxi_source(api_key: str = dlt.secrets.value):
    return rest_api_source({
        "client": {
            "base_url": "https://us-central1-dlthub-analytics.cloudfunctions.net/data_engineering_zoomcamp_api",
            "auth": {
                "type": "api_key",
                "name": "X-Api-Key",
                "api_key": api_key,
                "location": "header",
            },
        },
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
    })
```

Con esta declaración, **dlt** busca automáticamente `api_key` en `.dlt/secrets.toml`:

```toml
[sources.taxi_source]
api_key = "mi-clave-secreta"
```

Y la fuente se llama exactamente igual que antes, sin pasar la clave explícitamente:

```python
pipeline.run(taxi_source())
```

> [!TIP]
> El nombre de la sección en `secrets.toml` coincide con el nombre de la fuente (`sources.<nombre_de_la_fuente>`). Si se usa el parámetro `section` en el decorador, ese valor reemplaza al nombre de la función como nombre de sección.

## La fuente del taxi-pipeline como `@dlt.source`

Con todo lo anterior, podemos reescribir el [taxi_pipeline.py](pipelines/taxi-pipeline/taxi_pipeline.py) original utilizando el decorador `@dlt.source` para obtener una versión más organizada y extensible:

```python
import dlt
from dlt.sources.rest_api import rest_api_source

@dlt.source(name="taxi_api", max_table_nesting=1)
def taxi_source():
    return rest_api_source({
        "client": {
            "base_url": "https://us-central1-dlthub-analytics.cloudfunctions.net/data_engineering_zoomcamp_api",
        },
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
    })

if __name__ == "__main__":
    pipeline = dlt.pipeline(
        pipeline_name="taxi_pipeline",
        destination="duckdb",
        dataset_name="taxi_data",
        dev_mode=True,
        progress="log",
    )
    load_info = pipeline.run(taxi_source())
    print(load_info)
```

La diferencia respecto al original es mínima en apariencia, pero estructuralmente importante:

| Aspecto | Sin `@dlt.source` | Con `@dlt.source` |
|---------|-------------------|-------------------|
| Reutilización | La fuente es un objeto suelto | La fuente es una función invocable |
| Configuración | Manual (parámetros explícitos) | Inyección automática desde `.dlt/secrets.toml` |
| Selección de recursos | No disponible sin refactorizar | `taxi_source().with_resources("rides")` |
| Filtros | No disponible sin refactorizar | `taxi_source().rides.add_filter(...)` |
| Límite para pruebas | No disponible sin refactorizar | `taxi_source().add_limit(5)` |

## Resumen

Las fuentes en **dlt** son la unidad de organización que agrupa los recursos de una misma API. Declarar una fuente con `@dlt.source` frente a usar directamente una función de fábrica como `rest_api_source` aporta:

- **Encapsulación** de la lógica de conexión y autenticación.
- **Configuración automática** mediante `config.toml` y `secrets.toml`.
- **Selección dinámica** de recursos con `with_resources`.
- **Filtros y transformaciones** aplicables en tiempo de ejecución.
- **Limitación de datos** para desarrollo y pruebas con `add_limit`.

Para más información, consulta la documentación oficial de **dlt** sobre [fuentes](https://dlthub.com/docs/general-usage/source) (en inglés).
