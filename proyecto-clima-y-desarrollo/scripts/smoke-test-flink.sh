#!/usr/bin/env bash
# End-to-end smoke test for the Flink streaming slice.
# Polls OpenAQ once, then asserts that Flink consumed the topic and wrote
# rows to raw.openaq_measurements via JDBC.

set -euo pipefail

COUNTRIES_ARG="${COUNTRIES:-ES}"
PARAMETERS_ARG="${PARAMETERS:-pm25,no2}"
PG_USER="${POSTGRES_USER:-climate}"
PG_DB="${POSTGRES_DB:-climate}"
FLINK_PORT="${FLINK_PORT:-8082}"
WAIT_SECONDS="${WAIT_SECONDS:-30}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

step "Checking OPENAQ_API_KEY in .env..."
grep -E '^OPENAQ_API_KEY=.+' .env >/dev/null 2>&1 \
  || fail "OPENAQ_API_KEY is empty in .env. Set it before running this test."
ok "API key present"

step "Waiting for flink-job-submitter to finish..."
for _ in $(seq 1 60); do
  state=$(docker compose ps -a --format '{{.Service}} {{.State}}' \
            | awk '$1 == "flink-job-submitter" {print $2}')
  case "$state" in
    exited) ok "flink-job-submitter exited"; break ;;
    *) sleep 3 ;;
  esac
done
[ "$state" = "exited" ] || fail "flink-job-submitter did not exit (state=$state)"

step "Asking Flink REST API for running jobs..."
RUNNING=$(curl -sf "http://localhost:${FLINK_PORT}/jobs/overview" \
            | python3 -c 'import json,sys;d=json.load(sys.stdin);print(sum(1 for j in d["jobs"] if j["state"]=="RUNNING"))')
[ "$RUNNING" -ge 1 ] || fail "Expected ≥1 RUNNING Flink job, got $RUNNING"
ok "$RUNNING Flink job(s) running"

step "Polling OpenAQ for $COUNTRIES_ARG / $PARAMETERS_ARG (max 20 locations)..."
docker compose run --rm openaq-producer \
  openaq-poll --countries "$COUNTRIES_ARG" --parameters "$PARAMETERS_ARG" --max-locations 20

step "Waiting ${WAIT_SECONDS}s for Flink to checkpoint..."
sleep "$WAIT_SECONDS"

step "Verifying raw.openaq_measurements has rows..."
COUNT=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -tAc \
        "SELECT count(*) FROM raw.openaq_measurements;")
COUNT=$(echo "$COUNT" | tr -d '[:space:]')
[ "$COUNT" -ge 1 ] || fail "raw.openaq_measurements is empty"
ok "raw.openaq_measurements has $COUNT rows"

printf "\n\033[1;32m✓ Flink smoke test passed.\033[0m\n"
