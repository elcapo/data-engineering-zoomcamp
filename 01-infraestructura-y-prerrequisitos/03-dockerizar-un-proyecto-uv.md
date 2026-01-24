# Infraestructura y prerrequisitos

## Dockerizar un proyecto `uv`

### `Dockerfile` y el comando `docker build`

Antes de empezar a Dockerizar nuestra aplicación, vamos a echar un vistazo a una característica de Docker que no llegamos a explicar en la [introducción a Docker](01-introduccion-a-docker.md). Imagina que quieres crear un contenedor Docker con la imagen de Python pero que también incluya alguna librería adicional.

En ese caso, sería recomendable que creases un fichero `Dockerfile`; que no es más que un fichero de texto que sigue una sintaxis de Docker específica para crear imágenes personalizadas. Como mínimo, tendrás que añadir una cláusula **FROM** en la que indicas qué imagen quieres usar como base.

```Dockerfile
FROM python:3.13-slim
```

Una vez creado el fichero, desde la misma carpeta en la que está el fichero puedes crear una imagen basada en ese fichero.

```bash
docker build -t python_pipeline:3.13 .
```

En este caso, le habríamos añadido la etiqueta **python_pipeline:3.13** a nuestra nueva imagen. Esta etiqueta podemos ahora usarla para crear contenedores:

```bash
docker run --rm -it python_pipeline:3.13 pipeline
```

Como de esperar, esto sería equivalente a levantar un contenedor con la imagen **python:3.13-slim**.

### Crear una imagen personalizada

Ahora vamos a empezar con lo interesante. Imagina que queremos que la imagen tenga tanto **pandas** (para que soporte funcionalidades de análisis de datos) como **pyarrow** (para que soporte ficheros de tipo _parquet_). Podríamos modificar la imagen añadiendo una línea a nuestro fichero `Dockerfile`.

```Dockerfile
FROM python:3.13-slim

RUN pip install pandas pyarrow
```

Otros comandos interesantes nos permiten establecer un directorio de trabajo por defecto dentro de la imagen, copiar ficheros desde el host, o cambiar el punto de entrada del contenedor.

```Dockerfile
FROM python:3.13.11-slim

RUN pip install pandas pyarrow

WORKDIR /app

COPY pipeline.py pipeline.py

ENTRYPOINT ["python", "pipeline.py"]
```

Ahora, lanzar un contenedor con esta imagen algo diferente. En este caso, el contenedor tendría disponible **pandas** y **pyarrow** y ejecutaría nuestro fichero **pipeline.py** como punto de entrada.

### Usar `uv` en lugar de `pip`

Para acabar, vamos a modificar la imagen para que, esta vez, use `uv` en vez de `pip`.

```Dockerfile
FROM python:3.13.10-slim

# See: https://docs.astral.sh/uv/guides/integration/docker/#installing-uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH"

COPY "pyproject.toml" "uv.lock" ".python-version" ./

RUN uv sync --locked

COPY pipeline.py pipeline.py

ENTRYPOINT ["uv", "run", "python", "pipeline.py"]
```

