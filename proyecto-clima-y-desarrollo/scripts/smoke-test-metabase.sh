#!/usr/bin/env bash
# End-to-end smoke test for the Metabase slice.
# Asserts that Metabase booted, that the bootstrap container created the
# admin user, and that the climate-warehouse Postgres data source is registered
# and pointing at the right database.

set -euo pipefail

# This test hits Metabase on a host port, so it needs the same port mapping
# docker compose uses. Load .env if present (other smoke tests don't need it
# because they go through docker exec / compose run).
if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

METABASE_PORT="${METABASE_PORT:-3000}"
METABASE_URL="http://localhost:${METABASE_PORT}"
ADMIN_EMAIL="${METABASE_ADMIN_EMAIL:-admin@climate.local}"
ADMIN_PASSWORD="${METABASE_ADMIN_PASSWORD:-}"
WAREHOUSE_NAME="${METABASE_WAREHOUSE_NAME:-climate-warehouse}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

if [ -z "$ADMIN_PASSWORD" ] && [ -f .env ]; then
  ADMIN_PASSWORD=$(grep -E '^METABASE_ADMIN_PASSWORD=' .env | head -n1 | cut -d= -f2- | tr -d '"')
fi
[ -n "$ADMIN_PASSWORD" ] || fail "METABASE_ADMIN_PASSWORD is empty (check .env)"

step "Waiting for metabase-init to finish (creates admin + data source)..."
for _ in $(seq 1 90); do
  state=$(docker compose ps -a --format '{{.Service}} {{.State}}' \
            | awk '$1 == "metabase-init" {print $2}')
  case "$state" in
    exited) ok "metabase-init exited"; break ;;
    *) sleep 3 ;;
  esac
done
[ "${state:-}" = "exited" ] || fail "metabase-init did not finish (state=${state:-?})"

step "Hitting Metabase /api/health..."
HEALTH=""
for _ in $(seq 1 30); do
  RAW=$(curl -sf "$METABASE_URL/api/health" 2>/dev/null || true)
  if [ -n "$RAW" ]; then
    HEALTH=$(printf '%s' "$RAW" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("status",""))
except json.JSONDecodeError:
    print("")')
  fi
  [ "$HEALTH" = "ok" ] && break
  sleep 2
done
[ "$HEALTH" = "ok" ] || fail "Metabase /api/health did not return status=ok within 60s (got '$HEALTH')"
ok "Metabase reports healthy"

step "Logging in as $ADMIN_EMAIL..."
SESSION_ID=$(curl -sf -X POST "$METABASE_URL/api/session" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
[ -n "$SESSION_ID" ] || fail "Could not obtain a Metabase session token"
ok "Session acquired"

step "Verifying '$WAREHOUSE_NAME' data source is registered..."
DB_INFO=$(curl -sf "$METABASE_URL/api/database" \
            -H "X-Metabase-Session: $SESSION_ID" \
          | python3 -c "
import json, sys
payload = json.load(sys.stdin)
dbs = payload.get('data') or payload  # Metabase response shape varies
target = '$WAREHOUSE_NAME'
match = next((d for d in dbs if d.get('name') == target), None)
if match is None:
    print('NOT_FOUND')
    sys.exit(0)
print(f\"{match.get('engine','?')}|{(match.get('details') or {}).get('dbname','?')}\")
")
[ "$DB_INFO" != "NOT_FOUND" ] || fail "'$WAREHOUSE_NAME' is not registered in Metabase"
ENGINE="${DB_INFO%%|*}"
DBNAME="${DB_INFO##*|}"
[ "$ENGINE" = "postgres" ] || fail "Expected engine=postgres, got '$ENGINE'"
[ "$DBNAME" = "${POSTGRES_DB:-climate}" ] || fail "Expected dbname='${POSTGRES_DB:-climate}', got '$DBNAME'"
ok "Data source '$WAREHOUSE_NAME' → $ENGINE/$DBNAME"

printf "\n\033[1;32m✓ Metabase smoke test passed.\033[0m\n"
