#!/usr/bin/env bash
# End-to-end smoke test for the Spark backfill slice.
# Reads a single (location, year) from the public OpenAQ S3 dump,
# writes Parquet to MinIO, and upserts into raw.openaq_measurements.

set -euo pipefail

LOCATIONS_ARG="${SPARK_BACKFILL_LOCATIONS:-2178}"
YEARS_ARG="${SPARK_BACKFILL_YEARS:-2023}"
# Default location 2178 is "Del Norte" in Albuquerque, New Mexico — verified
# to have year=2023 data in the public dump. Override all three vars together
# if you want to point the smoke test at a different country.
COUNTRY_ISO_ARG="${SPARK_BACKFILL_COUNTRY_ISO:-US}"
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

# Compute the year window covered by YEARS_ARG (accepts '2023', '2020-2023',
# or '2020,2022,2024'). The smoke-test assertion will scope by this window so
# we don't need to touch any pre-existing rows: Spark only writes historical
# years (e.g. 2023), Flink only writes "now" (current year), so they don't
# overlap on (location_id, datetime_utc).
read -r YEAR_MIN YEAR_MAX < <(
  printf '%s\n' "$YEARS_ARG" \
    | awk -F'[,-]' '{
        for (i = 1; i <= NF; i++) {
          y = $i + 0
          if (y > 0) {
            if (min == 0 || y < min) min = y
            if (y > max) max = y
          }
        }
      } END { print min, max }'
)
[ -n "${YEAR_MIN:-}" ] && [ -n "${YEAR_MAX:-}" ] \
  || fail "Could not parse YEARS_ARG=$YEARS_ARG into a year range"
WINDOW_LO="${YEAR_MIN}-01-01"
WINDOW_HI="$((YEAR_MAX + 1))-01-01"
SCOPE_FILTER="location_id IN ($LOCATIONS_ARG) AND datetime_utc >= '$WINDOW_LO' AND datetime_utc < '$WINDOW_HI'"

step "Running spark-backfill for locations=$LOCATIONS_ARG years=$YEARS_ARG ($COUNTRY_ISO_ARG)..."
SPARK_LOG=$(mktemp)
trap 'rm -f "$SPARK_LOG"' EXIT
docker compose run --rm spark-backfill \
  --locations "$LOCATIONS_ARG" \
  --years "$YEARS_ARG" \
  --country-iso "$COUNTRY_ISO_ARG" 2>&1 | tee "$SPARK_LOG"

step "Verifying Spark normalized at least 1 row from the dump..."
NORMALIZED=$(awk 'match($0, /Normalized [0-9]+ measurement rows/) {
                    s = substr($0, RSTART, RLENGTH); gsub(/[^0-9]/, "", s); print s
                  }' "$SPARK_LOG" | tail -n1)
[ "${NORMALIZED:-0}" -ge 1 ] \
  || fail "Spark normalized 0 rows — read+filter pipeline is broken (see log above)"
ok "Spark normalized $NORMALIZED rows"

step "Verifying Parquet was written to MinIO..."
PARQUET_LISTING=$(docker compose exec -T minio sh -c \
  "mc alias set local http://minio:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null \
   && mc ls --recursive local/$BUCKET/openaq/cleansed/ 2>/dev/null || true")
PARQUET_COUNT=$(printf '%s\n' "$PARQUET_LISTING" | awk '/\.parquet$/ {n++} END {print n+0}')
[ "${PARQUET_COUNT:-0}" -ge 1 ] || fail "No Parquet files found under openaq/cleansed/"
ok "$PARQUET_COUNT Parquet file(s) written"

step "Verifying raw.openaq_measurements has rows in [$WINDOW_LO, $WINDOW_HI)..."
AFTER=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
        "SELECT count(*) FROM raw.openaq_measurements WHERE $SCOPE_FILTER;")
AFTER=$(echo "$AFTER" | tr -d '[:space:]')
[ "$AFTER" -ge 1 ] \
  || fail "No rows for the smoke-test scope — Spark may have failed to merge into Postgres"
ok "raw.openaq_measurements has $AFTER rows in the smoke-test window"

step "Re-running once to verify idempotency (ON CONFLICT DO NOTHING)..."
docker compose run --rm spark-backfill \
  --locations "$LOCATIONS_ARG" \
  --years "$YEARS_ARG" \
  --country-iso "$COUNTRY_ISO_ARG"

AFTER_2=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
          "SELECT count(*) FROM raw.openaq_measurements WHERE $SCOPE_FILTER;")
AFTER_2=$(echo "$AFTER_2" | tr -d '[:space:]')
[ "$AFTER_2" -eq "$AFTER" ] \
  || fail "Re-run inserted duplicates (was=$AFTER now=$AFTER_2)"
ok "Re-run was idempotent ($AFTER_2 rows unchanged)"

printf "\n\033[1;32m✓ Spark smoke test passed.\033[0m\n"
