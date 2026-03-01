# Taller: **Ingestión de datos de una API con DLT**

## ¿Cómo se definen con **esquemas** en DLT?

A lo largo de esta serie hemos construido, paso a paso, un pipeline completo: fuentes, recursos, pipeline y destino. En todos esos artículos ha aparecido en segundo plano un concepto transversal que lo sostiene todo: el **esquema**. En este artículo lo ponemos en el centro.

## ¿Qué es un **esquema** en DLT?

Un **esquema** en **dlt** describe la estructura de los datos normalizados: las tablas que existen, las columnas de cada tabla, sus tipos de datos, y las instrucciones sobre cómo procesar y cargar los datos. Es el contrato entre tu fuente de datos y tu destino.

Lo más importante es que **dlt genera el esquema automáticamente**: no hace falta escribir DDL ni definir tablas a mano. Cuando el pipeline se ejecuta por primera vez, **dlt** inspecciona los datos que produce cada recurso, infiere los tipos de las columnas y guarda el esquema resultante en el directorio de trabajo del pipeline (`~/.dlt/pipelines/<pipeline_name>`).

En ejecuciones posteriores, compara los datos entrantes con el esquema almacenado y aplica solo las migraciones necesarias (nuevas columnas, nuevas tablas) en el destino.

## El esquema del taxi-pipeline

Tras ejecutar el taxi-pipeline, podemos inspeccionar el esquema que **dlt** ha inferido:

```python
from taxi_pipeline import pipeline

print(pipeline.default_schema.to_pretty_yaml())
```

El resultado es un archivo YAML con la estructura completa de las tablas creadas, del que aquí mostramos un fragmento representativo:

```yaml
name: taxi_api
tables:
  rides:
    columns:
      vendor_name:
        data_type: text
        nullable: true
      pickup_datetime:
        data_type: timestamp
        nullable: true
      dropoff_datetime:
        data_type: timestamp
        nullable: true
      passenger_count:
        data_type: bigint
        nullable: true
      trip_distance:
        data_type: double
        nullable: true
      fare_amount:
        data_type: double
        nullable: true
      total_amount:
        data_type: double
        nullable: true
      _dlt_load_id:
        data_type: text
        nullable: false
      _dlt_id:
        data_type: text
        nullable: false
        unique: true
```

Este esquema refleja exactamente lo que **dlt** ha guardado en DuckDB.

## Las tablas internas de DLT

Además de la tabla `rides`, **dlt** crea automáticamente tres tablas internas en cada destino. Estas tablas son fundamentales para el funcionamiento del pipeline y conviene conocerlas.

### `_dlt_loads`: el registro de cargas

Cada vez que el pipeline se ejecuta con éxito, **dlt** añade una fila a `_dlt_loads`. Esta tabla es el registro histórico de todas las cargas realizadas:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `load_id` | text | Identificador único de la carga |
| `schema_name` | text | Nombre del esquema utilizado |
| `schema_version_hash` | text | Hash del esquema en este momento |
| `status` | bigint | `0` = completado |
| `inserted_at` | timestamp | Cuándo se registró la carga |

Solo las filas con `status = 0` representan cargas completas. Esto permite coordinar transformaciones posteriores que solo procesen datos completamente cargados.

### `_dlt_version`: el historial de esquemas

Cada vez que el esquema cambia (se añade una columna, se crea una tabla nueva), **dlt** guarda una nueva versión en `_dlt_version`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `version` | bigint | Número de versión del esquema |
| `schema_name` | text | Nombre del esquema |
| `version_hash` | text | Hash del contenido del esquema |
| `schema` | text | El esquema completo en JSON |
| `inserted_at` | timestamp | Cuándo se guardó esta versión |

Esta tabla es la que permite detectar los cambios descritos en el segundo artículo de esta serie: si el esquema ha cambiado entre ejecuciones, **dlt** lo detecta comparando el hash.

### `_dlt_pipeline_state`: el estado incremental

Esta tabla almacena el estado interno del pipeline entre ejecuciones: los cursores de las cargas incrementales, los identificadores de la última carga procesada, y cualquier otro dato necesario para saber desde dónde retomar la siguiente ejecución.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `pipeline_name` | text | Nombre del pipeline |
| `state` | text | El estado serializado (JSON) |
| `version` | bigint | Versión de esta entrada de estado |
| `created_at` | timestamp | Cuándo se guardó este estado |
| `_dlt_load_id` | text | Referencia a `_dlt_loads` |
| `_dlt_id` | text | Identificador único de la fila |

### Las columnas `_dlt_id` y `_dlt_load_id`

Estas dos columnas aparecen en **todas** las tablas de datos que crea **dlt** (no solo en las internas):

- **`_dlt_id`**: identificador único de cada fila. Se genera automáticamente y permite relacionar registros de tablas raíz con sus tablas hijas.
- **`_dlt_load_id`**: identifica la carga con la que se insertó la fila. Enlaza cada registro con su entrada en `_dlt_loads`.

Estas dos columnas son las que usamos en el primer artículo para relacionar libros con sus autores:

```sql
SELECT *
FROM open_library_data.books__author_name
WHERE _dlt_parent_id = '81gxpNirHrV1ZA'
```

## La convención de nombres

Cuando **dlt** normaliza los nombres de campos y tablas, aplica por defecto la convención `snake_case`:

| Nombre original | Nombre normalizado |
|-----------------|-------------------|
| `vendorName` | `vendor_name` |
| `tripDistance` | `trip_distance` |
| `pickup_DateTime` | `pickup_datetime` |
| `TotalAmount` | `total_amount` |
| `author__key` (anidado) | `author__key` |

Las reglas que aplica son:

1. Convertir a minúsculas.
2. Sustituir caracteres no alfanuméricos por `_`.
3. Colapsar múltiples `_` consecutivos en uno.
4. Añadir `_` al inicio si el nombre comienza por un número.
5. Expresar el anidamiento con `__` (doble guion bajo).

Si necesitamos preservar los nombres originales tal como vienen de la fuente (útil cuando los campos ya usan snake_case o cuando queremos mantener mayúsculas para un destino sensible a ellas), podemos cambiar la convención a `direct`:

```toml
# .dlt/config.toml
[schema]
naming = "direct"
```

## Tipos de datos

**dlt** infiere el tipo de dato de cada columna a partir de los valores observados. Esta es la tabla de tipos disponibles:

| Tipo dlt | Ejemplos de Python | Tipo SQL habitual |
|----------|-------------------|-------------------|
| `text` | `"hello"` | `VARCHAR` |
| `bigint` | `9876543210` | `BIGINT` |
| `double` | `45.678` | `DOUBLE` / `FLOAT` |
| `bool` | `True`, `False` | `BOOLEAN` |
| `decimal` | `Decimal("4.56")` | `DECIMAL(p, s)` |
| `timestamp` | `datetime.now()`, `"2024-01-01T12:00:00Z"` | `TIMESTAMP` |
| `date` | `date(2024, 1, 1)` | `DATE` |
| `time` | `time(14, 0, 0)` | `TIME` |
| `binary` | `b'\x00\x01'` | `BINARY` |
| `json` | `{"a": 1}`, `[1, 2, 3]` | `JSON` / `TEXT` |
| `wei` | `2**56` | Para enteros Ethereum de 256 bits |

El tipo `json` merece especial atención: cuando se asigna a una columna, **dlt** almacena el valor como JSON sin aplanaarlo ni crear tablas hijas. Es útil cuando queremos conservar la estructura original de un campo complejo sin normalizarlo.

### Autodetectores de tipo

**dlt** incluye un sistema de detección automática de tipos que reconoce ciertos formatos en los valores de texto. El autodetector activo por defecto es `iso_timestamp`, que convierte strings con formato ISO 8601 (`"2024-01-15T12:30:00Z"`) al tipo `timestamp` en lugar de dejarlos como `text`.

En el taxi-pipeline, esto hace que los campos `pickup_datetime` y `dropoff_datetime` se infieran automáticamente como `timestamp` aunque la API los entregue como strings.

Para deshabilitar este comportamiento (por ejemplo, si queremos que las fechas lleguen como texto), podemos modificar el esquema de la fuente:

```python
source = taxi_source()
source.schema.remove_type_detection("iso_timestamp")
```

El conjunto completo de autodetectores disponibles es:

```yaml
settings:
  detections:
    - timestamp       # objetos datetime de Python
    - iso_timestamp   # strings ISO 8601
    - iso_date        # strings de fecha sin hora
    - large_integer   # enteros grandes (wei)
    - hexbytes_to_text
    - wei_to_double
```

### Tipos preferidos

Cuando queremos garantizar que ciertas columnas siempre se infieran con un tipo concreto, podemos declararlo en la sección `preferred_types` del esquema:

```python
from dlt.common.schema.typing import TSimpleRegex

source = taxi_source()
source.schema.update_preferred_types({
    TSimpleRegex("re:_at$"):     "timestamp",  # cualquier campo que termine en _at
    TSimpleRegex("pickup_datetime"): "timestamp",
    TSimpleRegex("total_amount"):   "double",
})
```

O directamente en el archivo YAML del esquema exportado.

### Columnas variantes

Cuando **dlt** encuentra un valor cuyo tipo no puede coercerse al tipo ya inferido para esa columna, no lanza un error: crea una **columna variante** con el sufijo `__v_<tipo>`. Por ejemplo, si `passenger_count` se infirió como `bigint` pero en algún registro llega como `"unknown"`, **dlt** creará automáticamente la columna `passenger_count__v_text`.

Este comportamiento es el que se describe en el segundo artículo de esta serie como la respuesta de **dlt** a los cambios de tipo de datos.

## Definir el esquema explícitamente

Aunque la inferencia automática es suficiente en la mayoría de los casos, a veces necesitamos ser explícitos. **dlt** ofrece varias formas de hacerlo.

### Con el parámetro `columns` en `@dlt.resource`

```python
@dlt.resource(
    name="rides",
    columns={
        "vendor_name":      {"data_type": "text",      "nullable": False},
        "pickup_datetime":  {"data_type": "timestamp", "nullable": True},
        "trip_distance":    {"data_type": "double",    "nullable": True},
        "passenger_count":  {"data_type": "bigint",    "nullable": True},
        "total_amount":     {"data_type": "decimal",   "nullable": True,
                             "precision": 10, "scale": 2},
    },
)
def rides():
    yield from paginate_taxi_api()
```

### Con un modelo Pydantic

Los modelos Pydantic ofrecen además validación de datos en tiempo de extracción:

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
    tip_amount: Optional[float] = None
    total_amount: float

@dlt.resource(name="rides", columns=Ride)
def rides():
    yield from paginate_taxi_api()
```

Los campos `Optional` se marcan como `nullable=True`; los tipos `list` y `dict` se mapean a `json`.

### Con `apply_hints` en tiempo de ejecución

Cuando trabajamos con fuentes dinámicas o necesitamos aplicar hints programáticamente:

```python
source = taxi_source()
source.rides.apply_hints(
    columns={
        "total_amount": {"data_type": "decimal", "precision": 10, "scale": 2},
    },
    primary_key="vendor_name",
    write_disposition="merge",
)
pipeline.run(source)
```

## El contrato de esquema (`schema_contract`)

El contrato de esquema es el mecanismo que controla qué cambios está permitido hacer en el esquema durante la carga. Mientras que la inferencia automática es útil en desarrollo, en producción puede ser necesario proteger el esquema de cambios inesperados.

### Los tres niveles

El contrato opera en tres niveles independientes:

| Nivel | Cuándo se aplica |
|-------|-----------------|
| `tables` | Cuando aparece una tabla completamente nueva |
| `columns` | Cuando aparece una columna nueva en una tabla existente |
| `data_type` | Cuando cambia el tipo de una columna existente (incluyendo columnas variantes) |

### Los cuatro modos

| Modo | Comportamiento |
|------|----------------|
| `evolve` | Sin restricciones. Nuevas tablas, columnas y variantes se crean automáticamente. Es el modo por defecto. |
| `freeze` | Lanza una excepción si los datos no se ajustan al esquema existente. |
| `discard_row` | Descarta la fila completa si viola el contrato, sin lanzar error. |
| `discard_value` | Descarta solo el campo problemático de la fila y carga el resto. |

### Configuración del contrato

El contrato puede configurarse en cuatro lugares, con orden de prioridad de mayor a menor:

**1. En `pipeline.run()` — sobrescribe todo:**

```python
# Congelar completamente el esquema en producción
pipeline.run(source, schema_contract="freeze")
```

**2. En `@dlt.source` — se aplica a todos sus recursos:**

```python
@dlt.source(schema_contract={"columns": "freeze", "data_type": "freeze"})
def taxi_source():
    ...
```

**3. En `@dlt.resource` — puede sobrescribir el contrato del source:**

```python
@dlt.resource(schema_contract={"tables": "evolve", "columns": "discard_value"})
def rides():
    ...
```

**4. En la instancia, tras crear el source:**

```python
source = taxi_source()
source.schema_contract = {"tables": "evolve", "columns": "freeze"}
```

### Ejemplo de configuración en cascada

Retomando el ejemplo del taxi-pipeline con múltiples recursos:

```python
@dlt.resource(schema_contract={"columns": "evolve"})  # permite nuevas columnas
def rides():
    yield from paginate_taxi_api()

@dlt.resource()  # hereda el contrato del origen
def zones():
    yield from fetch_taxi_zones()

@dlt.source(schema_contract={"columns": "freeze", "data_type": "freeze"})
def taxi_source():
    return rides, zones
```

Con esta configuración:

- `rides`: permite nuevas columnas (`evolve`), rechaza cambios de tipo (`freeze`).
- `zones`: rechaza tanto nuevas columnas como cambios de tipo (`freeze` en ambos, heredado del source).
- Si ejecutamos `pipeline.run(taxi_source(), schema_contract="freeze")`, ambos recursos quedan completamente congelados.

### Capturar errores de contrato

Cuando el modo es `freeze` y se viola el contrato, **dlt** lanza un `DataValidationError` envuelto en un `PipelineStepFailed`:

```python
from dlt.common.exceptions import DataValidationError
from dlt.pipeline.pipeline import PipelineStepFailed

try:
    pipeline.run(taxi_source(), schema_contract="freeze")
except PipelineStepFailed as e:
    if isinstance(e.__context__.__context__, DataValidationError):
        err = e.__context__.__context__
        print(f"Tabla: {err.table_name}")
        print(f"Columna: {err.column_name}")
        print(f"Modo: {err.contract_mode}")
        print(f"Registro: {err.data_item}")
```

## Exportar e importar el esquema

Una práctica recomendada en producción es exportar el esquema a un archivo YAML y versionarlo junto al código. Así cualquier cambio en el esquema queda registrado en el historial de Git.

Para exportar el esquema tras cada ejecución, se usa el parámetro `export_schema_path` al crear el pipeline:

```python
pipeline = dlt.pipeline(
    pipeline_name="taxi_pipeline",
    destination="duckdb",
    dataset_name="taxi_data",
    export_schema_path="schemas/export",  # exporta a schemas/export/taxi_api.schema.yaml
)
```

Y para importar un esquema previamente guardado y aplicarlo como punto de partida:

```python
pipeline = dlt.pipeline(
    pipeline_name="taxi_pipeline",
    destination="duckdb",
    dataset_name="taxi_data",
    import_schema_path="schemas/import",  # lee schemas/import/taxi_api.schema.yaml
    export_schema_path="schemas/export",
)
```

También podemos cargar el esquema automáticamente colocando un archivo llamado `{nombre_fuente}.schema.yaml` en el mismo directorio que el módulo Python de la fuente. **dlt** lo detecta y lo aplica sin ninguna configuración adicional.

## El flujo completo del esquema en el taxi-pipeline

Con todo lo anterior, el ciclo de vida del esquema en el taxi-pipeline es el siguiente:

```
1ª ejecución
    │
    ├─ dlt extrae datos de la API de taxis
    ├─ dlt infiere el esquema (rides, tipos de columnas)
    ├─ dlt crea las tablas en DuckDB
    ├─ dlt guarda el esquema en ~/.dlt/pipelines/taxi_pipeline/
    └─ dlt registra la versión en _dlt_version

2ª ejecución (mismo esquema)
    │
    ├─ dlt extrae nuevos datos
    ├─ dlt compara con el esquema guardado (sin cambios)
    └─ dlt carga los datos sin alterar las tablas

3ª ejecución (la API añade un campo nuevo)
    │
    ├─ dlt extrae datos con el campo nuevo
    ├─ dlt detecta la columna nueva
    ├─ dlt añade la columna en DuckDB (ALTER TABLE)
    ├─ dlt actualiza el esquema guardado
    └─ dlt registra la nueva versión en _dlt_version
```

## Resumen

El esquema es el componente que da coherencia a todo el pipeline. Sus capacidades más importantes son:

| Capacidad | Mecanismo |
|-----------|-----------|
| Inferencia automática | dlt infiere tipos durante la normalización |
| Ver el esquema actual | `pipeline.default_schema.to_pretty_yaml()` |
| Definir tipos explícitamente | `columns` en `@dlt.resource` o modelo Pydantic |
| Aplicar hints en tiempo de ejecución | `resource.apply_hints(...)` |
| Controlar la evolución del esquema | `schema_contract` con tres niveles y cuatro modos |
| Versionar el esquema con el código | `export_schema_path` + `import_schema_path` |
| Proteger el esquema en producción | `schema_contract="freeze"` en `pipeline.run()` |
| Tablas internas de seguimiento | `_dlt_loads`, `_dlt_version`, `_dlt_pipeline_state` |

Para más información, consulta la documentación oficial de **dlt** sobre [esquemas](https://dlthub.com/docs/general-usage/schema) y [contratos de esquema](https://dlthub.com/docs/general-usage/schema-contracts) (en inglés).
