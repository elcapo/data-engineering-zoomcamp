# Infraestructura de servicios con Docker Compose

Este entorno define una infraestructura basada en contenedores para:

-   Base de datos principal del proyecto (`taxi`)
-   Administración visual de PostgreSQL mediante **pgAdmin**
-   Base de datos interna para **Kestra**
-   Orquestador de workflows **Kestra**

Todos los servicios se conectan a través de una red Docker común.

------------------------------------------------------------------------

## 🧱 Arquitectura general

Servicios desplegados:

| Servicio           | Descripción |
|--------------------|------------|
| `postgres`         | Base de datos principal de la aplicación |
| `pgadmin`          | Interfaz web para administrar PostgreSQL |
| `kestra_postgres`  | Base de datos interna de Kestra |
| `kestra`           | Motor de orquestación de workflows |

Red compartida:

`taxi-postgres-network`

Volúmenes persistentes:

```
taxi-postgres-data\
pgadmin-data\
kestra-postgres-data\
kestra-data
```

------------------------------------------------------------------------

## 🐘 PostgreSQL - Base de datos principal

### Función

Almacena los datos de la aplicación `taxi`.

| Variable | Valor por defecto |
|----------|-------------------|
| POSTGRES_DB | `taxi` |
| POSTGRES_USER | `root` |
| POSTGRES_PASSWORD | `root` |

### Acceso desde CLI

```bash
docker compose exec postgres psql -U root -d taxi
```

------------------------------------------------------------------------

## 🧰 pgAdmin - Administración de base de datos

### Acceso web

* http://localhost:8085

### Credenciales por defecto

* Email: admin@admin.com
* Password: root

------------------------------------------------------------------------

## ⚙️ Kestra - Orquestador de workflows

### Acceso web

* http://localhost:8080

### Credenciales por defecto

* Usuario: admin@kestra.io
* Password: Admin1234!

------------------------------------------------------------------------

## ▶️ Operación del entorno

### Iniciar todos los servicios

```bash
docker compose up -d
```

### Ver estado

```bash
docker compose ps
```

### Ver logs

```bash
docker compose logs -f
```

### Detener los servicios

```bash
docker compose down
```

------------------------------------------------------------------------

## 🗄️ Backups

### Backup

```bash
docker compose exec postgres pg_dump -U root taxi \> backup.sql
```

### Restaurar

```bash
cat backup.sql \| docker compose exec -T postgres psql -U root -d taxi
```

------------------------------------------------------------------------

## 📚 Resumen de accesos

| Servicio | URL |
| - | - |
| pgAdmin | http://localhost:8085 |
| Kestra | http://localhost:8080 |
