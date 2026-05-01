#!/usr/bin/env bash
# End-to-end smoke test for the OpenAQ slice.
# Polls /latest for one country, publishes to Redpanda, then consumes back to
# verify ≥1 message landed with the expected key + JSON shape.

set -euo pipefail

COUNTRIES_ARG="${COUNTRIES:-ES}"
PARAMETERS_ARG="${PARAMETERS:-pm25,no2}"
TOPIC="${OPENAQ_TOPIC:-openaq.measurements}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

step "Checking OPENAQ_API_KEY in .env..."
if ! grep -E '^OPENAQ_API_KEY=.+' .env >/dev/null 2>&1; then
  fail "OPENAQ_API_KEY is empty in .env. Get a free key at https://explore.openaq.org/register and set it before running this test."
fi
ok "API key present"

step "Waiting for redpanda-init to finish (creates compacted topic)..."
for _ in $(seq 1 30); do
  state=$(docker compose ps --format '{{.Service}} {{.State}}' \
            | awk '$1 == "redpanda-init" {print $2}')
  case "$state" in
    exited) ok "redpanda-init exited"; break ;;
    *) sleep 2 ;;
  esac
done

step "Verifying topic config has cleanup.policy=compact..."
TOPIC_DESC=$(docker compose exec -T redpanda rpk topic describe "$TOPIC" --print-configs 2>&1)
if ! echo "$TOPIC_DESC" | grep -q 'cleanup.policy[[:space:]]*compact'; then
  echo "$TOPIC_DESC"
  fail "Topic $TOPIC is missing cleanup.policy=compact"
fi
ok "Topic $TOPIC is compacted"

step "Running openaq-poll for $COUNTRIES_ARG (parameters=$PARAMETERS_ARG, max 20 locations)..."
docker compose run --rm openaq-producer \
  openaq-poll --countries "$COUNTRIES_ARG" --parameters "$PARAMETERS_ARG" --max-locations 20

step "Consuming up to 5 messages from $TOPIC..."
SAMPLE_FILE=$(mktemp)
trap 'rm -f "$SAMPLE_FILE"' EXIT
docker compose exec -T redpanda \
  rpk topic consume "$TOPIC" --num 5 --offset start --format '%k|%v\n' \
  > "$SAMPLE_FILE"

LINES=$(wc -l < "$SAMPLE_FILE" | tr -d '[:space:]')
[ "$LINES" -gt 0 ] || fail "No messages found in $TOPIC"
ok "Consumed $LINES messages"

step "Validating first message shape..."
FIRST=$(head -n 1 "$SAMPLE_FILE")
KEY="${FIRST%%|*}"
VALUE="${FIRST#*|}"

echo "$KEY" | grep -Eq '^[0-9]+:[a-z0-9]+:[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' \
  || fail "Key '$KEY' does not match <int>:<param>:<iso8601>"
ok "Key format valid"

for field in location_id parameter value datetime_utc country_iso; do
  echo "$VALUE" | grep -q "\"$field\":" || fail "Field '$field' missing from value: $VALUE"
done
ok "Value JSON has all required fields"

printf "\n\033[1;32m✓ OpenAQ smoke test passed.\033[0m\n"
