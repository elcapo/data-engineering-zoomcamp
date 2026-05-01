#!/usr/bin/env bash
# Idempotently create the metabase_app database used by Metabase for its
# own state. Runs both on first Postgres boot (via /docker-entrypoint-initdb.d)
# and on subsequent boots when invoked from a one-shot postgres-init service.

set -euo pipefail

DB_NAME="${METABASE_DB_NAME:-metabase_app}"
PG_USER="${POSTGRES_USER:-climate}"

psql --no-psqlrc -v ON_ERROR_STOP=1 \
     -U "$PG_USER" -d "${POSTGRES_DB:-climate}" \
     -tc "select 1 from pg_database where datname = '$DB_NAME'" \
     | grep -q 1 \
  || psql --no-psqlrc -v ON_ERROR_STOP=1 \
          -U "$PG_USER" -d "${POSTGRES_DB:-climate}" \
          -c "create database $DB_NAME owner $PG_USER"
