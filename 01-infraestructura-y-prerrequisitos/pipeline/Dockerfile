# Usar la imagen oficial de Python (slim) como base
FROM python:3.13.11-slim

# Instalar uv copiando el binario desde la imagen oficial
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/

# Establecer `app/` como directorio de trabajo
WORKDIR /app

# Añadir el entorno virtual al PATH para que Python encuentre las dependencias
ENV PATH="/app/.venv/bin:$PATH"

# Copiar primero solo los archivos de dependencias
# para aprovechar la cache de Docker si las dependencias no cambian
COPY "pyproject.toml" "uv.lock" ".python-version" ./

# Instalar dependencias usando el archivo de bloqueo
# --locked asegura que se instalen las versiones exactas especificadas
RUN uv sync --locked

# Copiar el código de la aplicación al final
# Si solo cambia el código, Docker reutiliza las capas anteriores
COPY taxi_dataset.py taxi_dataset.py
COPY ingestion_parallel.py ingestion_parallel.py
COPY ingestion_chunked.py ingestion_chunked.py
COPY pipeline.py pipeline.py

# Lanzar el script `pipeline.py` al iniciar
ENTRYPOINT ["uv", "run", "python", "pipeline.py"]

# Documentar la imagen
LABEL org.opencontainers.image.title="Zoomcamp Pipeline"
LABEL org.opencontainers.image.description="Pipeline ETL para procesamiento de datos"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="carlos.capote@hawara.es"
