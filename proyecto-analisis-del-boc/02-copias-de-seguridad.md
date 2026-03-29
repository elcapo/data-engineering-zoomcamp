# Copias de seguridad

Este documento explica cómo crear y restaurar copias de seguridad de los datos persistentes del proyecto.

## Datos que se respaldan

| Componente | Contenido | Flag |
|---|---|---|
| Base de datos `boc` | Documentos del BOC, índices, logs de descarga y extracción | `--boc-db` |
| Base de datos `kestra` | Estado interno de Kestra, historial de ejecuciones | `--kestra-db` |
| Buckets de MinIO | HTML comprimido (`boc-raw`) y markdown (`boc-markdown`) | `--minio` |
| Almacenamiento de Kestra | Almacenamiento local de ficheros de Kestra (`/app/storage`) | `--kestra-storage` |

## Requisitos previos

Los contenedores del componente que se quiera respaldar deben estar en ejecución. Para una copia completa, deben estar arrancados tanto los servicios de `pipeline/` como los de `frontend/postgres/`.

## Crear una copia de seguridad

### Copia completa

```bash
./backup.sh
```

Crea un directorio con marca de tiempo en `backups/` (por ejemplo `backups/2026-03-29_143000/`) con todo el contenido.

Se puede indicar un directorio de destino:

```bash
./backup.sh /ruta/al/directorio
```

### Copia parcial

Se pueden combinar los flags para elegir qué componentes respaldar:

```bash
# Solo las bases de datos
./backup.sh --boc-db --kestra-db

# Solo MinIO
./backup.sh --minio

# Solo la base de datos de la aplicación
./backup.sh --boc-db
```

### Estructura del directorio de backup

```
backups/2026-03-29_143000/
├── boc.sql.gz              # pg_dump comprimido de la BD boc
├── kestra.sql.gz           # pg_dump comprimido de la BD kestra
├── minio/
│   ├── boc-raw/            # Mirror del bucket boc-raw
│   │   └── documents/...
│   └── boc-markdown/       # Mirror del bucket boc-markdown
│       └── documents/...
└── kestra-storage/         # Copia del volumen /app/storage de Kestra
```

## Restaurar una copia de seguridad

### Restauración completa

```bash
./restore.sh backups/2026-03-29_143000
```

Restaura todos los componentes que encuentre en el directorio. Pide confirmación antes de cada paso.

### Restauración parcial

```bash
# Solo la base de datos de la aplicación
./restore.sh backups/2026-03-29_143000 --boc-db

# Solo MinIO y Kestra storage
./restore.sh backups/2026-03-29_143000 --minio --kestra-storage
```

## Notas sobre consistencia

Una copia completa (`./backup.sh`) ejecuta los respaldos en secuencia, no de forma atómica. Si los servicios están procesando datos mientras se hace la copia, los distintos componentes pueden reflejar estados ligeramente diferentes. Por ejemplo, MinIO podría contener un documento cuya entrada en PostgreSQL aún no se haya volcado.

**Para maximizar la consistencia:**

- Crear la copia cuando no haya flujos de Kestra en ejecución.
- Si no es posible, priorizar la copia de la base de datos `boc` y MinIO juntos, ya que son los que tienen relaciones más estrechas.

**Sobre restauraciones parciales:**

- Restaurar solo `--boc-db` sin restaurar `--minio` (o viceversa) puede dejar los datos del índice desincronizados con los documentos almacenados en MinIO.
- Restaurar solo `--kestra-db` sin `--kestra-storage` puede dejar referencias rotas en el historial de ejecuciones de Kestra.
- La base de datos `boc` se puede restaurar de forma independiente si lo único que se necesita es recuperar el índice de búsqueda, ya que el frontend solo depende de PostgreSQL.

## Técnica utilizada

- **PostgreSQL:** `pg_dump` en formato SQL plano, comprimido con gzip. Es el formato más portable y permite restauraciones sencillas con `psql`.
- **MinIO:** `mc mirror` para crear copias locales de los buckets. Preserva la estructura de directorios y permite restaurar con `mc mirror --overwrite`.
- **Kestra storage:** Copia directa del volumen Docker a través de un contenedor temporal.
