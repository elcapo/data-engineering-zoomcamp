# Análisis del Boletín Oficial de Canarias (BOC)

Esta carpeta contiene la implementación del proyecto de análisis de datos del Boletín Oficial de Canarias utilizando Kestra para la orquestación de flujos de trabajo y dbt para el modelado y transformación de datos.

## Requisitos Previos

- Docker y Docker Compose instalados
- Al menos 4GB de RAM disponible
- Conexión a internet para descargar imágenes y datos

## Configuración

### 0. Crear las Imágenes Base

Para que los flujos que usan ciertas dependencias Python se ejecuten a velocidades razonables, así como para poder usar código personalizado Python en nuestros flujos, se ha preparado una imagen específica que debe ser "compilada" con la etiqueta `boc-python`.

```bash
docker build -t boc-python:latest -f ./boc-python.Dockerfile .
```

> [!NOTE]
> Un ejemplo de flujo que usa esta imagen es [extract_year_index](./flows/main_boc.extract_year_index.yaml).

### 1. Configurar Variables de Entorno

El proyecto incluye un archivo `env.template` con las variables de entorno necesarias. Para configurar tu entorno:

```bash
# Copiar el template
cp env.template .env

# Editar el archivo .env con tus valores
nano .env  # o usa tu editor preferido
```

#### Variables Disponibles

El archivo `env.template` contiene las siguientes variables:

```bash
# PostgreSQL - Servidor de datos (frontend)
POSTGRES_DATA_HOST=frontend-server-hostname
POSTGRES_DATA_USER=root
POSTGRES_DATA_PASSWORD=password

# Kestra - Orquestador
KESTRA_PORT=8080
KESTRA_USER=admin@domain.local
KESTRA_PASSWORD=Admin1234!
KESTRA_GEMINI_APIKEY=foo

# MinIO - Almacenamiento de objetos
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=miniopass
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
```

**Notas importantes:**
- `KESTRA_USER` debe ser una dirección de email válida
- `KESTRA_PASSWORD` debe tener al menos 8 caracteres, incluir una mayúscula y un número
- Cambia estos valores por defecto en entornos de producción

### 2. Iniciar los Servicios

Una vez configurado el archivo `.env`, inicia todos los servicios con Docker Compose:

```bash
# Iniciar todos los servicios en segundo plano
docker compose up -d

# Ver los logs de todos los servicios
docker compose logs -f

# Ver el estado de los servicios
docker compose ps
```

#### Despliegue en producción

El archivo `docker-compose.prod.yml` añade atributos específicos de producción (política de reinicio automático). Úsalo combinado con el compose base:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

| Servicio | Política de reinicio | Motivo |
|---|---|---|
| `kestra_postgres` | `unless-stopped` | Servicio persistente; no reiniciar si se para manualmente |
| `minio` | `unless-stopped` | Servicio persistente; no reiniciar si se para manualmente |
| `minio_client` | `on-failure` | Init container: reintenta si falla, pero no se reinicia tras salir con éxito |
| `kestra` | `unless-stopped` | Servicio persistente; no reiniciar si se para manualmente |

### 3. Verificar que los Servicios están Activos

El proyecto incluye los siguientes servicios:

| Servicio | Puerto | URL | Descripción |
|----------|--------|-----|-------------|
| **Kestra** | 8080 | http://localhost:8080 | Orquestador de flujos de trabajo |
| **PostgreSQL (Kestra)** | - | interno | Base de datos interna de Kestra |
| **MinIO** | 9000 | http://localhost:9000 | Almacenamiento de objetos (API S3) |
| **MinIO Console** | 9001 | http://localhost:9001 | Interfaz web de MinIO |
| **pgAdmin** *(opcional)* | 8085 | http://localhost:8085 | Interfaz web para PostgreSQL (ver abajo) |

> [!NOTE]
> El servidor PostgreSQL de datos (base de datos `boc`) se ejecuta en el **servidor de frontend** y es referenciado desde este stack mediante la variable `POSTGRES_DATA_HOST`.

#### Acceder a Kestra

1. Abre tu navegador en http://localhost:8080
2. Inicia sesión con las credenciales configuradas en `.env`:
   - Usuario: valor de `KESTRA_USER`
   - Contraseña: valor de `KESTRA_PASSWORD`

#### Acceder a pgAdmin *(opcional)*

pgAdmin está disponible como stack adicional en `docker-compose.pgadmin.yml`. Para arrancarlo:

```bash
docker compose -f docker-compose.yml -f docker-compose.pgadmin.yml up -d pgadmin
```

1. Abre tu navegador en http://localhost:8085
2. Inicia sesión con:
   - Email: `admin@admin.com` (por defecto)
   - Contraseña: `root` (por defecto)

Para conectar pgAdmin al servidor de datos:
- Host: valor de `POSTGRES_DATA_HOST`
- Puerto: `5432`
- Database: `boc`
- Usuario: valor de `POSTGRES_DATA_USER`
- Contraseña: valor de `POSTGRES_DATA_PASSWORD`

#### Acceder a MinIO Console

1. Abre tu navegador en http://localhost:9001
2. Inicia sesión con:
   - Usuario: valor de `MINIO_ROOT_USER` (por defecto: `minio`)
   - Contraseña: valor de `MINIO_ROOT_PASSWORD` (por defecto: `miniopass`)

El bucket `boc-raw` se crea automáticamente al arrancar el stack. Los HTMLs descargados del BOC se almacenan con la siguiente estructura:

```
boc-raw/
 ├── archive/
 │    └── archive.html          ← índice de años
 ├── years/
 │    ├── 2024.html             ← índice de boletines por año
 │    └── 2023.html
 ├── issues/
 │    ├── 2024-001.html         ← índice de disposiciones por boletín
 │    └── 2024-002.html
 └── documents/
      └── 2024/001/
               └── 001.html    ← texto completo de cada disposición
```

## Arquitectura

```
┌─────────────┐
│   Kestra    │  ← Orquestación de pipelines
└──────┬──────┘
       │
       ├─→ Descarga HTMLs del BOC
       │          │
       │          ↓
       │   ┌──────────────┐
       │   │    MinIO     │  ← Almacenamiento raw (bucket boc-raw)
       │   └──────────────┘
       │          │
       ├─→ Extrae y carga en PostgreSQL
       │
       └─→ Ejecuta transformaciones dbt
              │
              ↓
       ┌──────────────┐
       │  PostgreSQL  │  ← Almacenamiento de datos estructurados
       └──────────────┘
              │
              ↓
       ┌──────────────┐
       │     dbt      │  ← Transformaciones y modelos
       └──────────────┘
```

Consulta [docs/kestra/01-fuentes-de-datos.md](docs/kestra/01-fuentes-de-datos.md) para tener información concreta sobre los datos que descargamos del BOC.

## Uso

### Detener los Servicios

```bash
# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes (¡CUIDADO: elimina todos los datos!)
docker compose down -v
```

### Reiniciar un Servicio Específico

```bash
# Reiniciar Kestra
docker compose restart kestra

# Ver logs de un servicio específico
docker compose logs -f kestra
```

### Acceder a la Base de Datos

El servidor PostgreSQL de datos está en el servidor de frontend (`POSTGRES_DATA_HOST`). Para conectar desde la línea de comandos:

```bash
# Exportar la contraseña para facilitar la conexión
export PGPASSWORD=$(grep POSTGRES_DATA_PASSWORD .env | cut -d'=' -f2)

# Conectar al servidor remoto
psql -h $(grep POSTGRES_DATA_HOST .env | cut -d'=' -f2) -U root -d boc
```

## Solución de Problemas

### Los servicios no inician

```bash
# Verificar logs
docker compose logs

# Verificar que no hay conflictos de puertos
netstat -tlnp | grep -E '8080|8085|5432'
```

### Error de permisos en Kestra (`Permission denied` al conectar con Docker)

Este proyecto asume que Docker corre en **modo rootless**, que es el predeterminado en instalaciones recientes de Ubuntu. En rootless Docker el socket activo está en `$XDG_RUNTIME_DIR/docker.sock` (normalmente `/run/user/1000/docker.sock`), no en `/var/run/docker.sock`. El docker-compose ya usa `${XDG_RUNTIME_DIR}/docker.sock` como volumen para que coincida.

Si arrancas el stack sin tener `XDG_RUNTIME_DIR` definido en el entorno, el compose fallará al resolver la ruta. Puedes exportarla manualmente:

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
docker compose up -d
```

Si usas Docker en modo clásico (no rootless), cambia el volumen en `docker-compose.yml`:

```yaml
- /var/run/docker.sock:/var/run/docker.sock
```

### El bucket `boc-raw` no existe

El servicio `minio_client` crea el bucket automáticamente al arrancar. Si por algún motivo no lo hizo:

```bash
docker compose run --rm minio_client \
  /bin/sh -c "mc alias set local http://minio:9000 minio miniopass && mc mb local/boc-raw"
```

### Limpiar y reiniciar desde cero

```bash
# Detener todos los servicios y eliminar volúmenes
docker compose down -v

# Eliminar imágenes (opcional)
docker compose down --rmi all

# Volver a iniciar
docker compose up -d
```

## Contribuir

Este proyecto es parte del curso de Data Engineering Zoomcamp. Las contribuciones son bienvenidas a través de pull requests.

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## Recursos

- [Kestra Documentation](https://kestra.io/docs)
- [dbt Documentation](https://docs.getdbt.com/)
- [Boletín Oficial de Canarias](https://www.gobiernodecanarias.org/boc/)
