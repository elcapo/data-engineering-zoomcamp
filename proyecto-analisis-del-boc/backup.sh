#!/bin/bash

# backup.sh — Crea copias de seguridad de las bases de datos y el almacenamiento del proyecto BOC.
#
# Uso:
#   ./backup.sh [directorio] [--boc-db] [--kestra-db] [--minio] [--kestra-storage]
#
# Sin flags, se hace copia de todo. Con flags, solo de los componentes indicados.
# Si no se indica directorio, se crea uno con la fecha actual en ./backups/.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Parseo de argumentos ──

BACKUP_DIR=""
DO_BOC_DB=false
DO_KESTRA_DB=false
DO_MINIO=false
DO_KESTRA_STORAGE=false
EXPLICIT=false

for arg in "$@"; do
  case "$arg" in
    --boc-db)          DO_BOC_DB=true; EXPLICIT=true ;;
    --kestra-db)       DO_KESTRA_DB=true; EXPLICIT=true ;;
    --minio)           DO_MINIO=true; EXPLICIT=true ;;
    --kestra-storage)  DO_KESTRA_STORAGE=true; EXPLICIT=true ;;
    -*)                echo "Flag desconocido: $arg"; exit 1 ;;
    *)
      if [ -z "$BACKUP_DIR" ]; then
        BACKUP_DIR="$arg"
      else
        echo "Argumento inesperado: $arg"; exit 1
      fi
      ;;
  esac
done

if [ "$EXPLICIT" = false ]; then
  DO_BOC_DB=true
  DO_KESTRA_DB=true
  DO_MINIO=true
  DO_KESTRA_STORAGE=true
fi

if [ -z "$BACKUP_DIR" ]; then
  BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y-%m-%d_%H%M%S)"
fi

# Convertir a ruta absoluta
case "$BACKUP_DIR" in
  /*) ;;
  *)  BACKUP_DIR="$PROJECT_ROOT/$BACKUP_DIR" ;;
esac

mkdir -p "$BACKUP_DIR"
echo "Directorio de backup: $BACKUP_DIR"

# ── Funciones auxiliares ──

backup_boc_db() {
  echo ""
  echo "── Backup de la base de datos boc ──"
  docker compose -f "$PROJECT_ROOT/frontend/postgres/docker-compose.yml" \
    exec -T postgresql pg_dump --user postgres boc \
    | gzip > "$BACKUP_DIR/boc.sql.gz"
  echo "   boc.sql.gz ($(du -h "$BACKUP_DIR/boc.sql.gz" | cut -f1))"
}

backup_kestra_db() {
  echo ""
  echo "── Backup de la base de datos kestra ──"
  docker compose -f "$PROJECT_ROOT/pipeline/docker-compose.yml" \
    exec -T kestra_postgres pg_dump --user kestra kestra \
    | gzip > "$BACKUP_DIR/kestra.sql.gz"
  echo "   kestra.sql.gz ($(du -h "$BACKUP_DIR/kestra.sql.gz" | cut -f1))"
}

backup_minio() {
  echo ""
  echo "── Backup de los buckets de MinIO ──"
  mkdir -p "$BACKUP_DIR/minio"

  # Leemos las credenciales del .env del pipeline (con valores por defecto)
  MINIO_USER=$(grep -oP 'MINIO_ROOT_USER=\K.*' "$PROJECT_ROOT/pipeline/.env" 2>/dev/null || echo "minio")
  MINIO_PASS=$(grep -oP 'MINIO_ROOT_PASSWORD=\K.*' "$PROJECT_ROOT/pipeline/.env" 2>/dev/null || echo "miniopass")

  docker compose -f "$PROJECT_ROOT/pipeline/docker-compose.yml" \
    run --rm -T \
    -v "$BACKUP_DIR/minio":/backup \
    --entrypoint sh minio_client -c "
      mc alias set local http://minio:9000 '${MINIO_USER:-minio}' '${MINIO_PASS:-miniopass}' --quiet
      mc mirror --quiet local/boc-raw /backup/boc-raw
      mc mirror --quiet local/boc-markdown /backup/boc-markdown
    "

  echo "   minio/boc-raw ($(du -sh "$BACKUP_DIR/minio/boc-raw" 2>/dev/null | cut -f1 || echo "vacío"))"
  echo "   minio/boc-markdown ($(du -sh "$BACKUP_DIR/minio/boc-markdown" 2>/dev/null | cut -f1 || echo "vacío"))"
}

backup_kestra_storage() {
  echo ""
  echo "── Backup del almacenamiento de Kestra ──"
  mkdir -p "$BACKUP_DIR/kestra-storage"

  # Copiamos el contenido del volumen kestra-data usando un contenedor temporal
  docker compose -f "$PROJECT_ROOT/pipeline/docker-compose.yml" \
    run --rm -T \
    -v "$BACKUP_DIR/kestra-storage":/backup \
    --entrypoint sh kestra -c "cp -a /app/storage/. /backup/"

  echo "   kestra-storage ($(du -sh "$BACKUP_DIR/kestra-storage" | cut -f1))"
}

# ── Ejecución ──

ERRORS=0

if [ "$DO_BOC_DB" = true ]; then
  backup_boc_db || { echo "ERROR: falló el backup de boc"; ERRORS=$((ERRORS + 1)); }
fi

if [ "$DO_KESTRA_DB" = true ]; then
  backup_kestra_db || { echo "ERROR: falló el backup de kestra"; ERRORS=$((ERRORS + 1)); }
fi

if [ "$DO_MINIO" = true ]; then
  backup_minio || { echo "ERROR: falló el backup de MinIO"; ERRORS=$((ERRORS + 1)); }
fi

if [ "$DO_KESTRA_STORAGE" = true ]; then
  backup_kestra_storage || { echo "ERROR: falló el backup de Kestra storage"; ERRORS=$((ERRORS + 1)); }
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "Backup completado con $ERRORS error(es)."
  exit 1
else
  echo "Backup completado: $BACKUP_DIR"
fi
