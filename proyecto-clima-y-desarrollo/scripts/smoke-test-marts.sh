#!/usr/bin/env bash
# End-to-end smoke test for the marts slice.
# Loads matching World Bank + OpenAQ slices for (USA, 2022), runs dbt seed
# and dbt build, and asserts that marts.country_year_environment has a row
# with both World Bank and OpenAQ columns populated.

set -euo pipefail

INDICATOR="${INDICATOR:-NY.GDP.PCAP.CD}"
YEAR="${YEAR:-2022}"
LOCATIONS_ARG="${SPARK_BACKFILL_LOCATIONS:-2178}"
COUNTRY_ISO_ARG="${SPARK_BACKFILL_COUNTRY_ISO:-US}"
COUNTRY_ISO3_ARG="${COUNTRY_ISO3:-USA}"
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

step "Running worldbank-ingest + worldbank-load for $INDICATOR / $YEAR..."
docker compose run --rm worldbank-producer \
  worldbank-ingest --start-year "$YEAR" --end-year "$YEAR" --indicators "$INDICATOR"
docker compose run --rm worldbank-producer \
  worldbank-load --start-year "$YEAR" --end-year "$YEAR" --indicators "$INDICATOR"

step "Running spark-backfill for locations=$LOCATIONS_ARG year=$YEAR ($COUNTRY_ISO_ARG)..."
docker compose run --rm spark-backfill \
  --locations "$LOCATIONS_ARG" \
  --years "$YEAR" \
  --country-iso "$COUNTRY_ISO_ARG"

step "Loading dbt seed (country_iso_codes)..."
docker compose run --rm dbt-init seed --select country_iso_codes

step "Running dbt build for country_year_environment + upstream..."
docker compose run --rm dbt-init build --select +country_year_environment

step "Verifying marts.country_year_environment has the expected row..."
ROW_COUNT=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
  "select count(*) from marts.country_year_environment
   where country_iso3 = '$COUNTRY_ISO3_ARG' and year = $YEAR;")
ROW_COUNT=$(echo "$ROW_COUNT" | tr -d '[:space:]')
[ "$ROW_COUNT" -ge 1 ] \
  || fail "marts.country_year_environment has no row for ($COUNTRY_ISO3_ARG, $YEAR)"
ok "Found $ROW_COUNT row for ($COUNTRY_ISO3_ARG, $YEAR)"

step "Verifying both sides of the join populated (gdp + pm25)..."
JOIN_OK=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
  "select gdp_per_capita_usd is not null and median_pm25_ugm3 is not null
     from marts.country_year_environment
    where country_iso3 = '$COUNTRY_ISO3_ARG' and year = $YEAR;")
JOIN_OK=$(echo "$JOIN_OK" | tr -d '[:space:]')
[ "$JOIN_OK" = "t" ] \
  || fail "Row for ($COUNTRY_ISO3_ARG, $YEAR) has NULL on one side of the join (got: $JOIN_OK)"
ok "Both World Bank and OpenAQ columns populated for ($COUNTRY_ISO3_ARG, $YEAR)"

step "Verifying the (country_iso3, year) btree index exists on Postgres..."
INDEX=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
  "select indexname from pg_indexes
    where schemaname = 'marts'
      and tablename  = 'country_year_environment'
      and indexname  = 'idx_country_year_environment';")
INDEX=$(echo "$INDEX" | tr -d '[:space:]')
[ "$INDEX" = "idx_country_year_environment" ] \
  || fail "Expected post-hook index 'idx_country_year_environment' not found"
ok "btree index present"

printf "\n\033[1;32m✓ Marts smoke test passed.\033[0m\n"
