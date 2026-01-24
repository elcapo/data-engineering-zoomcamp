# Infraestructura y prerrequisitos

## Dockerizar un proyecto `uv`

### `Dockerfile` y el comando `docker build`

Antes de empezar a Dockerizar nuestra aplicación, vamos a echar un vistazo a una característica de Docker que no llegamos a explicar en la [introducción a Docker](01-introduccion-a-docker.md). Imagina que quieres crear un contenedor Docker con la imagen de Python pero que también incluya alguna librería adicional.

En ese caso, sería recomendable que creases un fichero `Dockerfile`; que no es más que un fichero de texto que sigue una sintaxis de Docker específica para crear imágenes personalizadas. Como mínimo, tendrás que añadir una cláusula **FROM** en la que indicas qué imagen quieres usar como base.

```Dockerfile
FROM python:3.13.11-slim
```

Una vez creado el fichero, desde la misma carpeta en la que está el fichero puedes crear una imagen basada en ese fichero.

```bash
docker build -t python_pipeline:3.13 .
```

> [!NOTE]
> El punto al final del comando `docker build` indica el contexto de construcción, que es el directorio actual. Docker enviará todos los archivos de este directorio al daemon de Docker para construir la imagen.

En este caso, le habríamos añadido la etiqueta **python_pipeline:3.13** a nuestra nueva imagen. Esta etiqueta podemos ahora usarla para crear contenedores:

```bash
docker run --rm -it python_pipeline:3.13 pipeline
```

Como de esperar, esto sería equivalente a levantar un contenedor con la imagen **python:3.13.11-slim**.

### Crear una imagen personalizada

Ahora vamos a empezar con lo interesante. Imagina que queremos que la imagen tenga tanto **pandas** (para que soporte funcionalidades de análisis de datos) como **pyarrow** (para que soporte ficheros de tipo _parquet_). Podríamos modificar la imagen añadiendo una línea a nuestro fichero `Dockerfile`.

```Dockerfile
FROM python:3.13.11-slim

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

En este caso, el contenedor tendría disponible **pandas** y **pyarrow** y ejecutaría directamente `pipeline.py` sin necesidad de especificar el comando.

### Usar `uv` en lugar de `pip`

Ahora vamos a modificar la imagen para que, esta vez, use `uv` en vez de `pip`.

```Dockerfile
FROM python:3.13.11-slim

# Instalar uv copiando el binario desde la imagen oficial
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/

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
COPY pipeline.py pipeline.py

ENTRYPOINT ["uv", "run", "python", "pipeline.py"]
```

#### Explicación detallada de cada paso

1. **`COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/`**: Esta línea usa una característica llamada _multi-stage copy_. En lugar de instalar `uv` con pip o curl, simplemente copiamos el binario ya compilado desde la imagen oficial de `uv`. Esto es más rápido y genera una imagen más limpia.

2. **`ENV PATH="/app/.venv/bin:$PATH"`**: `uv` crea un entorno virtual en `.venv` por defecto. Al añadir esta ruta al `PATH`, nos aseguramos de que cuando ejecutemos `python`, se use el Python del entorno virtual con todas las dependencias instaladas.

3. **`COPY "pyproject.toml" "uv.lock" ".python-version" ./`**: Fíjate en que copiamos primero `pyproject.toml`, `uv.lock` y `.python-version`, y **después** el código. Esto es crucial para aprovechar la cache de capas de Docker (ver sección siguiente).

4. **`uv sync --locked`**: Este comando instala todas las dependencias especificadas en `uv.lock` con sus versiones exactas. La flag `--locked` hace que falle la construcción si `uv.lock` no está sincronizado con `pyproject.toml`, garantizando reproducibilidad.

5. **`ENTRYPOINT ["uv", "run", ...]`**: Aunque ya tenemos el PATH configurado, usar `uv run` asegura que siempre se ejecute en el contexto correcto del entorno virtual.

#### Construir y ejecutar la imagen

```bash
# Construir la imagen
docker build -t python_pipeline:3.13 .

# Ejecutar el contenedor
docker run --rm python_pipeline:3.13

# Si necesitas pasar argumentos al script
docker run --rm python_pipeline:3.13 --fecha 2024-01-01

# Si necesitas montar un volumen para acceder a datos
docker run --rm -v $(pwd)/data:/app/data python_pipeline:3.13
```

### Cache de capas en Docker

Docker construye imágenes en capas, donde cada instrucción del `Dockerfile` crea una nueva capa. Una de las características más poderosas de Docker es que reutiliza capas que no han cambiado, haciendo las reconstrucciones mucho más rápidas.

### El archivo `.dockerignore`

Similar a `.gitignore`, el archivo `.dockerignore` te permite excluir archivos y directorios del contexto de construcción de Docker. Esto es importante porque:

1. **Reduce el tamaño del contexto**: Docker no tiene que enviar archivos innecesarios al daemon
2. **Evita invalidar la cache**: Cambios en archivos ignorados no afectan la construcción
3. **Mejora la seguridad**: Evita copiar accidentalmente archivos sensibles

Crea un archivo `.dockerignore` en la raíz de tu proyecto:

```dockerignore
# Entorno virtual
.venv/

# Cache de Python
__pycache__/

# Git
.git/
```

> [!NOTE]
> Aunque copies archivos específicos con `COPY pyproject.toml ./`, el `.dockerignore` sigue siendo útil porque reduce el contexto inicial que Docker tiene que procesar.

### Flags útiles de `uv sync`

Cuando uses `uv` en Docker, estas flags pueden ser útiles:

- **`--locked`**: Falla si `uv.lock` no está sincronizado, asegurando la reproducibilidad del entorno
- **`--no-dev`**: Evita instalar dependencias de desarrollo
- **`--frozen`**: Similar a `--locked` pero más estricto, ni siquiera verifica si hay actualizaciones
- **`--no-install-project`**: Solo instala dependencias, no el proyecto en sí

```Dockerfile
# Para desarrollo (incluye herramientas de testing, linting, etc.)
RUN uv sync --locked

# Para producción (solo dependencias necesarias)
RUN uv sync --locked --no-dev
```

### Buenas prácticas adicionales

#### 1. Especificar versiones exactas de imágenes base

```Dockerfile
# No recomendado (puede cambiar sin previo aviso)
FROM python:3.13-slim

# Recomendado (versión exacta y reproducible)
FROM python:3.13.11-slim
```

#### 2. Ejecutar como usuario no-root

Por seguridad, evita ejecutar la aplicación como root:

```Dockerfile
# Crear usuario no privilegiado
RUN useradd -m -u 1000 appuser

# Cambiar permisos
RUN chown -R appuser:appuser /app

# Cambiar a usuario no privilegiado
USER appuser
```

#### 3. Usar `HEALTHCHECK` para monitoreo

Si tu aplicación es un servicio web o daemon:

```Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"
```

#### 4. Añadir metadatos con `LABEL`

```Dockerfile
LABEL org.opencontainers.image.title="Zoomcamp Pipeline"
LABEL org.opencontainers.image.description="Pipeline ETL para procesamiento de datos"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="tu-email@example.com"

# ... resto del Dockerfile
```

### Resumen de recomendaciones

1. Usa `uv` en lugar de `pip` para gestión de dependencias más rápida y fiable
2. Copia archivos de dependencias antes que el código para aprovechar la cache
3. Crea un archivo `.dockerignore` para excluir archivos innecesarios
4. Considera multi-stage builds para imágenes de producción más pequeñas
5. Usa `--locked` para garantizar instalaciones reproducibles
6. Especifica versiones exactas de imágenes base
7. Ejecuta como usuario no-root cuando sea posible
8. Añade metadata con LABEL para mejor documentación

Siguiendo estas prácticas, tendrás imágenes Docker eficientes, seguras y mantenibles para tus proyectos Python con `uv`.

