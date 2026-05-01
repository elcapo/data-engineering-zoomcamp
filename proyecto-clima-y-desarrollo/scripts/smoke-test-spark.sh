#!/usr/bin/env bash
# End-to-end smoke test for the Spark backfill slice.
# Reads a single (location, year) from the public OpenAQ S3 dump,
# writes Parquet to MinIO, and upserts into raw.openaq_measurements.

set -euo pipefail

LOCATIONS_ARG="${SPARK_BACKFILL_LOCATIONS:-2178}"
YEARS_ARG="${SPARK_BACKFILL_YEARS:-2023}"
COUNTRY_ISO_ARG="${SPARK_BACKFILL_COUNTRY_ISO:-ES}"
BUCKET="${STORAGE_BUCKET:-climate}"
PG_USER="${POSTGRES_USER:-climate}"
PG_DB="${POSTGRES_DB:-climate}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

step "Waiting for dbt-init to finish (creates raw schema)..."
for _ in $(seq 1 30); do
  state=$(docker compose ps --format '{{.Service}} {{.State}}' \
            | awk '$1 == "dbt-init" {print $2}')
  case "$state" in
    exited) ok "dbt-init exited"; break ;;
    *) sleep 2 ;;
  esac
done

step "Snapshotting current row count in raw.openaq_measurements..."
BEFORE=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
         "SELECT count(*) FROM raw.openaq_measurements WHERE country_iso = '$COUNTRY_ISO_ARG';")
BEFORE=$(echo "$BEFORE" | tr -d '[:space:]')
ok "Before: $BEFORE rows for country_iso=$COUNTRY_ISO_ARG"

step "Running spark-backfill for locations=$LOCATIONS_ARG years=$YEARS_ARG ($COUNTRY_ISO_ARG)..."
docker compose run --rm spark-backfill \
  --locations "$LOCATIONS_ARG" \
  --years "$YEARS_ARG" \
  --country-iso "$COUNTRY_ISO_ARG"

step "Verifying Parquet was written to MinIO..."
PARQUET_COUNT=$(docker compose exec -T minio sh -c \
  "mc alias set local http://minio:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null \
   && mc ls --recursive local/$BUCKET/openaq/cleansed/ | grep -c '\.parquet' || true")
PARQUET_COUNT=$(echo "$PARQUET_COUNT" | tr -d '[:space:]')
[ "${PARQUET_COUNT:-0}" -ge 1 ] || fail "No Parquet files found under openaq/cleansed/"
ok "$PARQUET_COUNT Parquet file(s) written"

step "Verifying raw.openaq_measurements grew..."
AFTER=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
        "SELECT count(*) FROM raw.openaq_measurements WHERE country_iso = '$COUNTRY_ISO_ARG';")
AFTER=$(echo "$AFTER" | tr -d '[:space:]')
[ "$AFTER" -gt "$BEFORE" ] \
  || fail "Row count did not increase (before=$BEFORE after=$AFTER) — backfill may have missed the dump"
ok "raw.openaq_measurements grew from $BEFORE → $AFTER rows"

step "Re-running once to verify idempotency (ON CONFLICT DO NOTHING)..."
docker compose run --rm spark-backfill \
  --locations "$LOCATIONS_ARG" \
  --years "$YEARS_ARG" \
  --country-iso "$COUNTRY_ISO_ARG"

AFTER_2=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
          "SELECT count(*) FROM raw.openaq_measurements WHERE country_iso = '$COUNTRY_ISO_ARG';")
AFTER_2=$(echo "$AFTER_2" | tr -d '[:space:]')
[ "$AFTER_2" -eq "$AFTER" ] \
  || fail "Re-run inserted duplicates (was=$AFTER now=$AFTER_2)"
ok "Re-run was idempotent ($AFTER_2 rows unchanged)"

printf "\n\033[1;32m✓ Spark smoke test passed.\033[0m\n"
