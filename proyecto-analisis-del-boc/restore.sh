#!/bin/bash

# restore.sh — Restaura copias de seguridad de las bases de datos y el almacenamiento del proyecto BOC.
#
# Uso:
#   ./restore.sh <directorio> [--boc-db] [--kestra-db] [--minio] [--kestra-storage]
#
# Sin flags, se restaura todo lo que exista en el directorio. Con flags, solo los componentes indicados.

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

if [ -z "$BACKUP_DIR" ]; then
  echo "Uso: ./restore.sh <directorio-de-backup> [--boc-db] [--kestra-db] [--minio] [--kestra-storage]"
  exit 1
fi

# Convertir a ruta absoluta
case "$BACKUP_DIR" in
  /*) ;;
  *)  BACKUP_DIR="$PROJECT_ROOT/$BACKUP_DIR" ;;
esac

if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: No existe el directorio $BACKUP_DIR"
  exit 1
fi

# Si no se pidió nada explícito, activar todo lo que exista en el directorio
if [ "$EXPLICIT" = false ]; then
  [ -f "$BACKUP_DIR/boc.sql.gz" ]          && DO_BOC_DB=true
  [ -f "$BACKUP_DIR/kestra.sql.gz" ]       && DO_KESTRA_DB=true
  [ -d "$BACKUP_DIR/minio" ]               && DO_MINIO=true
  [ -d "$BACKUP_DIR/kestra-storage" ]       && DO_KESTRA_STORAGE=true
fi

echo "Restaurando desde: $BACKUP_DIR"

# ── Funciones auxiliares ──

restore_boc_db() {
  echo ""
  echo "── Restaurando la base de datos boc ──"

  if [ ! -f "$BACKUP_DIR/boc.sql.gz" ]; then
    echo "   AVISO: no se encontró boc.sql.gz, omitiendo."
    return 1
  fi

  echo "   ATENCIÓN: esto eliminará la base de datos boc actual y la recreará."
  read -rp "   ¿Continuar? [s/N] " confirm
  if [[ ! "$confirm" =~ ^[sS]$ ]]; then
    echo "   Omitido."
    return 0
  fi

  # Descomprimir, restaurar y volver a comprimir
  gunzip -k -f "$BACKUP_DIR/boc.sql.gz"

  docker compose -f "$PROJECT_ROOT/frontend/postgres/docker-compose.yml" \
    exec -T postgresql bash -c "
      dropdb --user postgres --if-exists boc
      createdb --user postgres boc
      psql --user postgres --dbname=boc < /dev/stdin
    " < "$BACKUP_DIR/boc.sql"

  rm -f "$BACKUP_DIR/boc.sql"
  echo "   Base de datos boc restaurada."
}

restore_kestra_db() {
  echo ""
  echo "── Restaurando la base de datos kestra ──"

  if [ ! -f "$BACKUP_DIR/kestra.sql.gz" ]; then
    echo "   AVISO: no se encontró kestra.sql.gz, omitiendo."
    return 1
  fi

  echo "   ATENCIÓN: esto eliminará la base de datos kestra actual y la recreará."
  read -rp "   ¿Continuar? [s/N] " confirm
  if [[ ! "$confirm" =~ ^[sS]$ ]]; then
    echo "   Omitido."
    return 0
  fi

  gunzip -k -f "$BACKUP_DIR/kestra.sql.gz"

  docker compose -f "$PROJECT_ROOT/pipeline/docker-compose.yml" \
    exec -T kestra_postgres bash -c "
      dropdb --user kestra --if-exists kestra
      createdb --user kestra kestra
      psql --user kestra --dbname=kestra < /dev/stdin
    " < "$BACKUP_DIR/kestra.sql"

  rm -f "$BACKUP_DIR/kestra.sql"
  echo "   Base de datos kestra restaurada."
}

restore_minio() {
  echo ""
  echo "── Restaurando los buckets de MinIO ──"

  if [ ! -d "$BACKUP_DIR/minio" ]; then
    echo "   AVISO: no se encontró el directorio minio/, omitiendo."
    return 1
  fi

  echo "   ATENCIÓN: esto sobrescribirá los datos actuales de MinIO con los del backup."
  read -rp "   ¿Continuar? [s/N] " confirm
  if [[ ! "$confirm" =~ ^[sS]$ ]]; then
    echo "   Omitido."
    return 0
  fi

  MINIO_USER=$(grep -oP 'MINIO_ROOT_USER=\K.*' "$PROJECT_ROOT/pipeline/.env" 2>/dev/null || echo "minio")
  MINIO_PASS=$(grep -oP 'MINIO_ROOT_PASSWORD=\K.*' "$PROJECT_ROOT/pipeline/.env" 2>/dev/null || echo "miniopass")

  docker compose -f "$PROJECT_ROOT/pipeline/docker-compose.yml" \
    run --rm -T \
    -v "$BACKUP_DIR/minio":/backup:ro \
    --entrypoint sh minio_client -c "
      mc alias set local http://minio:9000 '${MINIO_USER:-minio}' '${MINIO_PASS:-miniopass}' --quiet
      mc mb --ignore-existing local/boc-raw
      mc mb --ignore-existing local/boc-markdown
      mc mirror --overwrite --quiet /backup/boc-raw local/boc-raw
      mc mirror --overwrite --quiet /backup/boc-markdown local/boc-markdown
    "

  echo "   Buckets de MinIO restaurados."
}

restore_kestra_storage() {
  echo ""
  echo "── Restaurando el almacenamiento de Kestra ──"

  if [ ! -d "$BACKUP_DIR/kestra-storage" ]; then
    echo "   AVISO: no se encontró el directorio kestra-storage/, omitiendo."
    return 1
  fi

  echo "   ATENCIÓN: esto sobrescribirá el almacenamiento actual de Kestra."
  read -rp "   ¿Continuar? [s/N] " confirm
  if [[ ! "$confirm" =~ ^[sS]$ ]]; then
    echo "   Omitido."
    return 0
  fi

  docker compose -f "$PROJECT_ROOT/pipeline/docker-compose.yml" \
    run --rm -T \
    -v "$BACKUP_DIR/kestra-storage":/backup:ro \
    --entrypoint sh kestra -c "rm -rf /app/storage/* && cp -a /backup/. /app/storage/"

  echo "   Almacenamiento de Kestra restaurado."
}

# ── Ejecución ──

ERRORS=0

if [ "$DO_BOC_DB" = true ]; then
  restore_boc_db || { echo "ERROR: falló la restauración de boc"; ERRORS=$((ERRORS + 1)); }
fi

if [ "$DO_KESTRA_DB" = true ]; then
  restore_kestra_db || { echo "ERROR: falló la restauración de kestra"; ERRORS=$((ERRORS + 1)); }
fi

if [ "$DO_MINIO" = true ]; then
  restore_minio || { echo "ERROR: falló la restauración de MinIO"; ERRORS=$((ERRORS + 1)); }
fi

if [ "$DO_KESTRA_STORAGE" = true ]; then
  restore_kestra_storage || { echo "ERROR: falló la restauración de Kestra storage"; ERRORS=$((ERRORS + 1)); }
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "Restauración completada con $ERRORS error(es)."
  exit 1
else
  echo "Restauración completada."
fi
