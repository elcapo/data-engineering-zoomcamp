# Pipeline ETL con Docker

Este proyecto contiene una pipeline ETL dockerizada con PostgreSQL y pgAdmin para administración de la base de datos.

## Servicios

### 1. postgres
Servidor PostgreSQL 18 donde se almacenan los datos procesados por la pipeline.

- **Puerto**: 5432 (configurable)
- **Usuario por defecto**: root
- **Base de datos por defecto**: taxi

### 2. pgadmin
Interfaz web para administrar la base de datos PostgreSQL.

- **Puerto**: 8085 (configurable)
- **Email por defecto**: admin@admin.com
- **URL de acceso**: http://localhost:8085

## Requisitos previos

- Docker
- Docker Compose

## Variables de entorno

Puedes personalizar la configuración creando un archivo `.env` en este directorio:

```env
# PostgreSQL
POSTGRES_USER=root
POSTGRES_PASSWORD=root
POSTGRES_DB=taxi
POSTGRES_HOST_PORT=5432

# pgAdmin
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=root
PGADMIN_HOST_PORT=8085
```

## Uso

### Levantar los servicios

```bash
docker compose up -d
```

Esto iniciará PostgreSQL y pgAdmin. La pipeline se ejecuta manualmente según sea necesario (ver sección de Desarrollo).

### Detener los servicios

```bash
docker compose down
```

### Eliminar volúmenes (resetear datos)

```bash
docker compose down -v
```

## Desarrollo

### Estructura de archivos

- `pipeline.py`: Script principal de la pipeline (por implementar)
- `pyproject.toml`: Dependencias del proyecto
- `uv.lock`: Versiones bloqueadas de las dependencias
- `.python-version`: Versión de Python utilizada
- `Dockerfile`: Imagen Docker para la pipeline
- `docker-compose.yml`: Orquestación de servicios

### Escribir el código de la pipeline

El archivo `pipeline.py` debe implementar la lógica ETL. Ejemplo básico:

```python
import os
import psycopg2

# Obtener credenciales desde variables de entorno
DB_USER = os.getenv('POSTGRES_USER', 'root')
DB_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'root')
DB_NAME = os.getenv('POSTGRES_DB', 'taxi')
DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
DB_PORT = os.getenv('POSTGRES_PORT', '5432')

# Conectar a la base de datos
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD
)

# Implementar el proceso ETL
# ...

# Cerrar la conexión
conn.close()
```

### Ejecutar la pipeline

La pipeline no está incluida como un servicio en `docker-compose.yml` porque es un proceso que se ejecuta y termina (no necesita estar corriendo constantemente).

Para ejecutar la pipeline manualmente:

```bash
docker compose run --rm \
    --network pipeline_taxi_postgres_network \
    -e POSTGRES_USER=${POSTGRES_USER:-root} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-root} \
    -e POSTGRES_DB=${POSTGRES_DB:-taxi} \
    -e POSTGRES_HOST=postgres \
    -e POSTGRES_PORT=5432 \
    $(docker build -q .)
```

O más fácil, si prefieres crear un comando personalizado, puedes usar:

```bash
docker build -t pipeline:latest .
docker run --rm \
    --network pipeline_taxi_postgres_network \
    -e POSTGRES_USER=${POSTGRES_USER:-root} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-root} \
    -e POSTGRES_DB=${POSTGRES_DB:-taxi} \
    -e POSTGRES_HOST=postgres \
    -e POSTGRES_PORT=5432 \
    pipeline:latest
```

### Reconstruir la imagen tras cambios

Después de modificar el código o las dependencias:

```bash
docker build -t pipeline:latest .
```

## Conectar pgAdmin a PostgreSQL

1. Accede a http://localhost:8085
2. Inicia sesión con las credenciales configuradas
3. Añade un nuevo servidor:
   - **Host**: postgres
   - **Port**: 5432
   - **Database**: taxi (o el configurado)
   - **Username**: root (o el configurado)
   - **Password**: root (o el configurado)
