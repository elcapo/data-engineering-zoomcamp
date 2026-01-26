# Infraestructura y prerrequisitos

## Dockerizar el script de carga

* Notas originales (en inglés): [Dockerizing the Ingestion Script](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/01-docker-terraform/docker-sql/08-dockerizing-ingestion.md)

Una vez que tenemos PostgreSQL y pgAdmin corriendo en contenedores, el siguiente paso lógico es dockerizar también nuestro script de carga de datos. Esto nos permite tener toda la infraestructura del pipeline completamente contenedorizada, facilitando el despliegue y la colaboración.

## Crear el Dockerfile para el script

Necesitas un `Dockerfile` que defina cómo construir la imagen de tu script Python:

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Copiar archivos de dependencias
COPY pyproject.toml uv.lock ./

# Instalar uv y dependencias
RUN pip install uv && \
    uv sync --frozen

# Copiar el código del script
COPY ingest_data.py ./

# Ejecutar el script
CMD ["uv", "run", "python", "ingest_data.py"]
```

### Explicación del Dockerfile

* **`FROM python:3.13-slim`**: Usa una imagen base de Python ligera
* **`WORKDIR /app`**: Establece el directorio de trabajo dentro del contenedor
* **`COPY pyproject.toml uv.lock ./`**: Copia los archivos de dependencias primero (para aprovechar el caché de Docker)
* **`RUN pip install uv && uv sync --frozen`**: Instala uv y las dependencias del proyecto
* **`COPY ingest_data.py ./`**: Copia el script principal
* **`CMD`**: Define el comando que se ejecutará cuando inicie el contenedor

## Adaptar el script para usar variables de entorno

Tu script debe leer las credenciales de conexión desde variables de entorno en lugar de tenerlas hardcodeadas:

```python
import os
from sqlalchemy import create_engine

# Leer configuración desde variables de entorno
db_host = os.getenv('DB_HOST', 'localhost')
db_port = os.getenv('DB_PORT', '5432')
db_name = os.getenv('DB_NAME', 'taxi')
db_user = os.getenv('DB_USER', 'root')
db_password = os.getenv('DB_PASSWORD', 'root')

# Crear conexión
engine = create_engine(
    f'postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'
)
```

Esto hace que el script sea más flexible y seguro, ya que las credenciales pueden variar según el entorno sin necesidad de modificar el código.

## Construir la imagen Docker

Una vez que tengas el Dockerfile listo, construye la imagen:

```bash
docker build -t taxi_ingest:latest .
```

El parámetro `-t` permite asignarle un nombre (tag) a la imagen para poder referenciarla fácilmente.

## Networking entre contenedores

Para que nuestro script dockerizado pueda conectarse a PostgreSQL, ambos contenedores deben estar en la misma red Docker.

Cuando ejecutas contenedores de forma individual con `docker run`, por defecto no pueden comunicarse entre sí fácilmente. Necesitas crear una red Docker compartida:

```bash
# Crear una red
docker network create taxi_network

# Levantar PostgreSQL en esa red
docker run -d \
    --name pgdatabase \
    --network taxi_network \
    -e POSTGRES_USER="root" \
    -e POSTGRES_PASSWORD="root" \
    -e POSTGRES_DB="taxi" \
    -v taxi_postgres_data:/var/lib/postgresql/data \
    -p 5432:5432 \
    postgres:18

# Ejecutar tu script Python en la misma red
docker run --rm \
    --network taxi_network \
    -e DB_HOST=pgdatabase \
    -e DB_PORT=5432 \
    -e DB_NAME=taxi \
    -e DB_USER=root \
    -e DB_PASSWORD=root \
    -v $(pwd)/data:/app/data \
    taxi_ingest:latest
```

### Aspectos clave del networking

* Ambos contenedores están en la red `taxi_network`
* El script Python usa `pgdatabase` como hostname (el nombre que le dimos al contenedor PostgreSQL)
* No necesitamos publicar el puerto 5432 si solo vamos a acceder desde otros contenedores, pero lo mantenemos para poder conectarnos también desde el host
* El flag `--rm` en el contenedor del script hace que se elimine automáticamente al terminar su ejecución

## Siguiente paso: Docker Compose

Gestionar múltiples contenedores con `docker run` puede volverse tedioso rápidamente. Cada vez que quieres ejecutar el pipeline necesitas recordar todos los comandos, redes, y variables de entorno.

**Docker Compose** simplifica considerablemente este proceso permitiéndote definir todos los servicios en un único archivo de configuración. En el [siguiente módulo](09-orquestar-servicios-con-docker-compose.md) veremos cómo orquestar PostgreSQL, pgAdmin y nuestro script de carga usando Docker Compose.

## Resumen

En este módulo hemos aprendido a:

1. Crear un Dockerfile para un script Python de carga de datos
2. Adaptar el script para usar variables de entorno
3. Construir una imagen Docker del script
4. Configurar networking entre contenedores usando redes personalizadas
5. Ejecutar el script dockerizado conectándose a PostgreSQL

Con el script dockerizado, ahora tenemos todos los componentes de nuestro pipeline en contenedores individuales. El siguiente paso es orquestarlos todos juntos con Docker Compose.
