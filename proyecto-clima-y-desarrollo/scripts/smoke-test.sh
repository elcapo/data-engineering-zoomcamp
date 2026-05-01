#!/usr/bin/env bash
# End-to-end smoke test for the World Bank slice.
# Runs ingest → load → dbt build for a single indicator/year and asserts
# that data lands in MinIO, Postgres, and the staging view.

set -euo pipefail

INDICATOR="${INDICATOR:-NY.GDP.PCAP.CD}"
YEAR="${YEAR:-2022}"
BUCKET="${STORAGE_BUCKET:-climate}"
PG_USER="${POSTGRES_USER:-climate}"
PG_DB="${POSTGRES_DB:-climate}"
EXPECTED_MIN_ROWS="${EXPECTED_MIN_ROWS:-200}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

step "Waiting for dbt-init to finish (creates raw schema)..."
# `make up` already runs dbt-init with --no-deps; it should be exited 0.
# If it's still running, wait briefly.
for _ in $(seq 1 30); do
  state=$(docker compose ps --format '{{.Service}} {{.State}}' \
            | awk '$1 == "dbt-init" {print $2}')
  case "$state" in
    exited) ok "dbt-init exited"; break ;;
    running) sleep 2 ;;
    *) sleep 2 ;;
  esac
done

step "Running worldbank-ingest for $INDICATOR / $YEAR..."
docker compose run --rm worldbank-producer \
  worldbank-ingest --start-year "$YEAR" --end-year "$YEAR" --indicators "$INDICATOR"

step "Verifying MinIO object exists..."
docker compose exec -T minio sh -c \
  "mc alias set local http://minio:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null \
   && mc stat local/$BUCKET/worldbank/raw/$INDICATOR/$YEAR.json >/dev/null" \
  || fail "Object worldbank/raw/$INDICATOR/$YEAR.json not found in MinIO"
ok "MinIO object present"

step "Running worldbank-load..."
docker compose run --rm worldbank-producer \
  worldbank-load --start-year "$YEAR" --end-year "$YEAR" --indicators "$INDICATOR"

step "Verifying Postgres rows..."
COUNT=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
        "SELECT count(*) FROM raw.worldbank_indicators_raw WHERE year = $YEAR AND indicator_code = '$INDICATOR';")
COUNT=$(echo "$COUNT" | tr -d '[:space:]')
[ "$COUNT" -ge "$EXPECTED_MIN_ROWS" ] \
  || fail "Expected ≥ $EXPECTED_MIN_ROWS rows in raw, got $COUNT"
ok "raw.worldbank_indicators_raw has $COUNT rows"

step "Running dbt build for stg_worldbank__indicators..."
docker compose run --rm dbt-init build --select stg_worldbank__indicators

step "Verifying staging view has rows..."
STG_COUNT=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
            "SELECT count(*) FROM staging.stg_worldbank__indicators WHERE year = $YEAR AND indicator_code = '$INDICATOR';")
STG_COUNT=$(echo "$STG_COUNT" | tr -d '[:space:]')
[ "$STG_COUNT" -gt 0 ] || fail "staging.stg_worldbank__indicators is empty for $INDICATOR/$YEAR"
ok "staging view has $STG_COUNT rows"

printf "\n\033[1;32m✓ Smoke test passed.\033[0m\n"
