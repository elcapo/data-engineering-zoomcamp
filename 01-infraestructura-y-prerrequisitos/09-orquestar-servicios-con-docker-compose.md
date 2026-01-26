# Infraestructura y prerrequisitos

## Orquestar servicios con Docker Compose

* Notas originales (en inglés): [Docker Compose](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/01-docker-terraform/docker-sql/09-docker-compose.md)

En los módulos anteriores hemos visto cómo levantar [PostgreSQL](04-dockerizar-postgresql.md), [pgAdmin](07-administrar-postgre-con-pgadmin.md), y [dockerizar nuestro script de carga](08-dockerizar-el-script-de-carga.md). Sin embargo, gestionar cada contenedor por separado con `docker run` se vuelve tedioso y propenso a errores.

**Docker Compose** resuelve este problema permitiéndonos definir y ejecutar aplicaciones multi-contenedor con un único archivo de configuración.

## Ventajas de usar Docker Compose

Comparado con `docker run`, Docker Compose ofrece:

* **Configuración declarativa**: Define todos los servicios, redes y volúmenes en un archivo YAML
* **Gestión unificada**: Inicia, detén y reconstruye todos los servicios con un solo comando
* **Networking automático**: Crea automáticamente una red compartida para todos los servicios
* **Nombres de servicio**: Los contenedores pueden comunicarse usando nombres de servicio en lugar de IPs
* **Reproducibilidad**: El mismo archivo `docker-compose.yml` funciona en cualquier máquina con Docker
* **Variables de entorno**: Soporte integrado para archivos `.env`

## Crear un archivo `docker-compose.yml`

Crea un archivo `docker-compose.yml` en la raíz de tu proyecto con la configuración de todos los servicios:

```yaml
services:
  pgdatabase:
    image: postgres:18
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-root}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-root}
      POSTGRES_DB: ${POSTGRES_DB:-taxi}
    volumes:
      - taxi_postgres_data:/var/lib/postgresql/data
    ports:
      - ${POSTGRES_HOST_PORT:-5432}:5432
    networks:
      - taxi_network

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL:-admin@admin.com}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:-root}
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    ports:
      - ${PGADMIN_HOST_PORT:-8085}:80
    networks:
      - taxi_network

volumes:
  taxi_postgres_data:
  pgadmin_data:

networks:
  taxi_network:
```

## Explicación de la estructura

### Sección `services:`

Define los contenedores que queremos ejecutar:

* **`pgdatabase:`**: Servidor PostgreSQL 18
  * **`image:`**: Usa la imagen oficial de PostgreSQL
  * **`environment:`**: Variables de entorno con valores por defecto usando la sintaxis `${VAR:-default}`
  * **`volumes:`**: Persiste los datos en un volumen nombrado
  * **`ports:`**: Mapea el puerto 5432 del contenedor al host (configurable)
  * **`networks:`**: Conecta el servicio a la red compartida

* **`pgadmin:`**: Interfaz web de administración
  * Similar a pgdatabase pero usa la imagen de pgAdmin
  * Expone el puerto 80 del contenedor en el puerto 8085 del host (configurable)

### Sección `volumes:`

Define volúmenes nombrados para persistir datos:

* **`taxi_postgres_data:`**: Almacena los datos de PostgreSQL
* **`pgadmin_data:`**: Almacena la configuración de pgAdmin

Estos volúmenes persisten incluso cuando detienes los contenedores.

### Sección `networks:`

Define redes personalizadas:

* **`taxi_network:`**: Red compartida que permite la comunicación entre servicios

Docker Compose crea esta red automáticamente y todos los servicios conectados a ella pueden comunicarse usando sus nombres de servicio.

## Configurar variables de entorno

Crea un archivo `.env` en el mismo directorio que `docker-compose.yml`:

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

Docker Compose cargará automáticamente estas variables al iniciar los servicios.

> [!NOTE]
> Recuerda añadir `.env` a tu `.gitignore` para no subir credenciales a Git.

## Comandos básicos de Docker Compose

### Levantar todos los servicios

```bash
docker compose up
```

Para ejecutarlos en segundo plano (modo detached):

```bash
docker compose up -d
```

Para reconstruir las imágenes antes de iniciar (útil después de cambios en el código):

```bash
docker compose up --build
```

### Levantar servicios específicos

Si solo quieres levantar PostgreSQL y pgAdmin (sin el script):

```bash
docker compose up -d pgdatabase pgadmin
```

### Ver logs de los servicios

Ver logs de todos los servicios:

```bash
docker compose logs
```

Ver logs de un servicio específico:

```bash
docker compose logs pgdatabase
```

Seguir los logs en tiempo real:

```bash
docker compose logs -f
```

### Detener los servicios

Detener todos los servicios (mantiene los volúmenes):

```bash
docker compose down
```

Detener y eliminar también los volúmenes (¡cuidado, esto borra los datos!):

```bash
docker compose down -v
```

### Reconstruir servicios después de cambios

Si modificas el código del script o el Dockerfile:

```bash
docker compose build pgdatabase
docker compose up -d pgdatabase
```

O en un solo comando:

```bash
docker compose up --build pgdatabase
```

## Conectar pgAdmin a PostgreSQL

Con Docker Compose, la configuración de pgAdmin es más sencilla:

1. Accede a `http://localhost:8085` (o el puerto que hayas configurado)
2. Inicia sesión con las credenciales configuradas
3. Añade un nuevo servidor:
   * **Host**: `pgdatabase` (el nombre del servicio, no `localhost`)
   * **Port**: `5432`
   * **Database**: `taxi` (o el que hayas configurado)
   * **Username**: `root` (o el que hayas configurado)
   * **Password**: `root` (o el que hayas configurado)

> [!NOTE]
> El hostname es `pgdatabase` (el nombre del servicio en Docker Compose) porque los servicios se comunican a través de la red interna de Docker, no a través del host.

## Diferencias entre `docker run` y `docker compose`

| Aspecto | `docker run` | `docker compose` |
|---------|--------------|------------------|
| **Configuración** | Comando largo con muchos flags | Archivo YAML declarativo |
| **Múltiples contenedores** | Un comando por contenedor | Un comando para todos |
| **Networking** | Crear red manualmente | Red creada automáticamente |
| **Persistencia** | Difícil de documentar | Todo en un archivo versionable |
| **Reproducibilidad** | Propenso a errores | Exactamente igual en cualquier máquina |
| **Variables de entorno** | Especificar en cada comando | Archivo `.env` centralizado |

## Resumen

En este módulo hemos aprendido a:

1. Crear un archivo `docker-compose.yml` para orquestar múltiples servicios
2. Configurar redes y volúmenes de forma declarativa
3. Usar variables de entorno con archivos `.env`
4. Gestionar servicios con comandos simples de Docker Compose
5. Ejecutar servicios de forma selectiva o todos juntos

Con Docker Compose, todo nuestro pipeline (PostgreSQL, pgAdmin y script de carga) está definido en un único archivo que puede ser compartido con el equipo y ejecutado en cualquier máquina con Docker. Esto facilita enormemente el desarrollo colaborativo y el despliegue de aplicaciones.
