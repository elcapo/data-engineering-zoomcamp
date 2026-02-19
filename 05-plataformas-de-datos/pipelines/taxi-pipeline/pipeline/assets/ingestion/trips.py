"""@bruin

# Define el nombre del artefacto (patrón recomendado: schema.asset_name).
# - Convención en este módulo: usar un esquema `ingestion.` para las tablas de ingestión en bruto.
name: ingestion.trips

# Define el tipo de artefacto.
# Documentación: https://getbruin.com/docs/bruin/assets/python
type: python

# Elige una versión de la imagen de Python (Bruin ejecuta Python en entornos aislados).
# Ejemplo: python:3.11
image: python:3.11

# Conexión a utilizar
connection: duckdb-default

# Elige la materialización (opcional, pero recomendado).
# Funcionalidad de Bruin: la materialización en Python te permite devolver un DataFrame (o list[dict]) y Bruin lo carga en tu destino.
# Esta suele ser la forma más sencilla de construir artefactos de ingestión en Bruin.
# Alternativa (avanzada): puedes omitir la materialización en Python de Bruin y escribir un artefacto de Python "plano" que escriba manualmente
# en DuckDB (u otro destino) usando tu propia librería cliente y SQL. En ese caso:
# - normalmente omites el bloque `materialization:`
# - NO necesitas una función `materialize()`; simplemente ejecutas código Python
# Documentación: https://getbruin.com/docs/bruin/assets/python#materialization
materialization:
  # elige `table` o `view` (la ingestión generalmente debería ser una tabla)
  type: table
  # elige una estrategia.
  # estrategia sugerida: append
  strategy: append

# Define las columnas de salida (nombres + tipos) para metadatos, lineage y checks de calidad.
# Consejo: marca los identificadores estables como `primary_key: true` si planeas usar `merge` más adelante.
# Documentación: https://getbruin.com/docs/bruin/assets/columns
columns:
  - name: pickup_datetime
    type: timestamp
    description: "Fecha y hora en que se inició el taxímetro"
  - name: dropoff_datetime
    type: timestamp
    description: "Fecha y hora en que se detuvo el taxímetro"

@bruin"""

# Añade los imports necesarios para tu ingesta (por ejemplo, pandas, requests).
# - Coloca las dependencias en el `requirements.txt` más cercano
# Documentación: https://getbruin.com/docs/bruin/assets/python
import io
import os
import json
from datetime import datetime, timezone
import pandas as pd
import requests

# Implementa `materialize()` solo si estás usando la materialización en Python de Bruin.
# Si eliges el enfoque de escritura manual (sin bloque `materialization:`), elimina esta función e implementa la ingesta
# como un script Python estándar.
def materialize():
    """
    Ingesta usando el contexto de ejecución de Bruin.

    Conceptos de Bruin usados:

    - Variables de ventana de fechas integradas:
      - BRUIN_START_DATE / BRUIN_END_DATE (YYYY-MM-DD)
      - BRUIN_START_DATETIME / BRUIN_END_DATETIME (datetime en formato ISO)
      Documentación: https://getbruin.com/docs/bruin/assets/python#environment-variables

    - Variables del pipeline:
      - Leer el JSON desde BRUIN_VARS, por ejemplo `taxi_types`
      Documentación: https://getbruin.com/docs/bruin/getting-started/pipeline-variables

    Objetivos de la implementación:
    - Usar las fechas de inicio/fin + `taxi_types` para generar una lista de endpoints de origen para la ventana de ejecución.
    - Obtener los datos de cada endpoint, parsearlos a DataFrames y concatenarlos.
    - Añadir una columna como `extracted_at` para lineage/debugging (timestamp de la extracción).
    - Preferir append-only en la ingesta; gestionar duplicados en staging.
    """

    start_date = os.environ["BRUIN_START_DATE"]
    end_date = os.environ["BRUIN_END_DATE"]
    taxi_types = json.loads(os.environ["BRUIN_VARS"]).get("taxi_types", ["yellow"])

    # Generar la lista de meses entre las fechas de inicio y fin
    start_month = pd.to_datetime(start_date).to_period("M").to_timestamp()
    end_month = pd.to_datetime(end_date).to_period("M").to_timestamp()
    months = pd.date_range(start=start_month, end=end_month, freq="MS")

    base_url = "https://d37ci6vzurychx.cloudfront.net/trip-data"
    extracted_at = datetime.now(timezone.utc)

    # Obtener los ficheros parquet desde:                                                                                                                                               
    # https://d37ci6vzurychx.cloudfront.net/trip-data/{taxi_type}_tripdata_{year}-{month}.parquet
    dataframes = []
    for taxi_type in taxi_types:
        for month in months:
            url = f"{base_url}/{taxi_type}_tripdata_{month.year}-{month.month:02d}.parquet"
            response = requests.get(url)
            response.raise_for_status()
            df = pd.read_parquet(io.BytesIO(response.content))
            df["taxi_type"] = taxi_type
            df["extracted_at"] = extracted_at
            dataframes.append(df)

    return pd.concat(dataframes, ignore_index=True)
