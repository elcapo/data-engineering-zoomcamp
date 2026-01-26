# Infraestructura y prerrequisitos

## Dockerizar el script de carga

* Notas originales (en inglés): [Dockerizing the Ingestion Script](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/01-docker-terraform/docker-sql/08-dockerizing-ingestion.md)

Una vez que tenemos PostgreSQL y pgAdmin corriendo en contenedores, el siguiente paso lógico es dockerizar también nuestro script de carga de datos. Esto nos permite tener toda la infraestructura del pipeline completamente contenedorizada, facilitando el despliegue y la colaboración.

## Networking entre contenedores

Para que nuestro script dockerizado pueda conectarse a PostgreSQL, ambos contenedores deben estar en la misma red Docker.

### Opción 1: Usar `docker run` con redes personalizadas

Cuando ejecutas contenedores de forma individual con `docker run`, por defecto no pueden comunicarse entre sí fácilmente. Necesitas crear una red Docker compartida:

```bash
# Crear una red
docker network create taxi_network

# Levantar PostgreSQL en esa red
docker run -d --rm \
    --name pgdatabase \
    --network taxi_network \
    -e POSTGRES_USER="root" \
    -e POSTGRES_PASSWORD="root" \
    -e POSTGRES_DB="taxi" \
    -v taxi_postgres_data:/var/lib/postgresql \
    -p 5432:5432 \
    postgres:18

# Ejecutar tu script Python en la misma red
docker run --rm \
    --network taxi_network \
    -e DB_HOST=pgdatabase \
    -v $(pwd)/data:/app/data \
    python_pipeline:3.13
```

#### Aspectos clave del networking

* Ambos contenedores están en la red `taxi_network`
* El script Python usa `pgdatabase` como hostname (el nombre que le dimos al contenedor PostgreSQL)
* No necesitamos publicar el puerto 5432 si solo vamos a acceder desde otros contenedores, pero lo mantenemos para poder conectarnos también desde el host

### Opción 2: Usar Docker Compose (recomendado)

Docker Compose simplifica considerablemente la gestión de múltiples contenedores y crea automáticamente una red compartida.

Actualiza tu `docker-compose.yml` para incluir el servicio del script de carga:

```yaml
services:
  pgdatabase:
    image: postgres:18
    environment:
      POSTGRES_USER: "root"
      POSTGRES_PASSWORD: "root"
      POSTGRES_DB: "taxi"
    volumes:
      - taxi_postgres_data:/var/lib/postgresql
    ports:
      - 5432:5432
    networks:
      - taxi_network

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: "admin@admin.com"
      PGADMIN_DEFAULT_PASSWORD: "root"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    ports:
      - 8085:80
    networks:
      - taxi_network

  data_ingestion:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - pgdatabase
    environment:
      DB_HOST: pgdatabase
      DB_PORT: 5432
      DB_NAME: taxi
      DB_USER: root
      DB_PASSWORD: root
    volumes:
      - ./data:/app/data
    networks:
      - taxi_network

volumes:
  taxi_postgres_data:
  pgadmin_data:

networks:
  taxi_network:
```

#### Explicación del servicio de ingesta

* **`build:`**: En lugar de usar una imagen existente, construye la imagen desde un Dockerfile
* **`depends_on:`**: Asegura que PostgreSQL se inicie antes que el script
* **`environment:`**: Variables de entorno para la conexión a la base de datos
* **`volumes:`**: Monta la carpeta local `data` para que el script pueda acceder a los archivos CSV

> [!NOTE]
> Docker Compose crea automáticamente una red compartida para todos los servicios definidos en el archivo `docker-compose.yml`, por eso no necesitamos crearla manualmente cuando lo usamos.

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

## Ejecutar el pipeline completo

Con todo configurado, puedes levantar toda la infraestructura con un solo comando:

```bash
docker compose up --build
```

El flag `--build` asegura que se construya la imagen del script de carga antes de iniciar los servicios.

## Resumen

En este módulo hemos aprendido a:

1. Configurar networking entre contenedores Docker usando redes personalizadas
2. Integrar un script de carga de datos en Docker Compose
3. Crear un Dockerfile para un script Python
4. Usar variables de entorno para configurar conexiones a bases de datos
5. Orquestar PostgreSQL, pgAdmin y un script de carga con un solo comando

Con todos estos componentes dockerizados, tienes un pipeline de datos completamente portable y fácil de desplegar en cualquier entorno.
