#!/usr/bin/env bash
# Bulk OpenAQ historical backfill: for each ISO2 country in the list, fetch
# the location IDs from the OpenAQ v3 API (paginating as needed) and submit
# the Spark backfill job for the given year window.
#
# Usage:
#   scripts/openaq-backfill-all.sh                     # uses env defaults
#   scripts/openaq-backfill-all.sh ES,FR 2020-2023     # explicit countries + years
#
# Env defaults (read from .env via Compose, or the shell when present):
#   COUNTRIES               ISO2 list, e.g. "US,DE,CN,MX,IN,ZA"
#   SPARK_BACKFILL_YEARS    e.g. "2018-2025" or "2018,2020,2022"
#   OPENAQ_API_KEY          required to query the locations endpoint
#   OPENAQ_API_BASE_URL     default https://api.openaq.org
#   OPENAQ_PAGE_LIMIT       default 1000 (max accepted by the v3 API)
#
# Resume / idempotency:
#   - Each per-country invocation is independent. Re-running this script after
#     a partial failure skips nothing on its own — but the Spark job's upsert
#     uses ON CONFLICT DO NOTHING, so re-runs do not duplicate rows.
#   - Per-country output and a status line are appended to logs/openaq-backfill/.
#     Inspect that directory to see which countries succeeded.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

COUNTRIES_ARG="${1:-${COUNTRIES:-}}"
YEARS_ARG="${2:-${SPARK_BACKFILL_YEARS:-}}"
API_BASE="${OPENAQ_API_BASE_URL:-https://api.openaq.org}"
PAGE_LIMIT="${OPENAQ_PAGE_LIMIT:-1000}"
LOG_DIR="${LOG_DIR:-logs/openaq-backfill}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*" >&2; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

[ -n "$COUNTRIES_ARG" ] \
  || fail "No countries given. Pass as arg, or set COUNTRIES in .env (e.g. US,DE,CN,MX,IN,ZA)."
[ -n "$YEARS_ARG" ] \
  || fail "No years given. Pass as 2nd arg, or set SPARK_BACKFILL_YEARS in .env (e.g. 2018-2025)."
[ -n "${OPENAQ_API_KEY:-}" ] \
  || fail "OPENAQ_API_KEY is required to query the OpenAQ /v3/locations endpoint."

mkdir -p "$LOG_DIR"

# Fetch all OpenAQ location IDs for an ISO2 code, paginating until the result
# set is exhausted. Echos a comma-separated list to stdout. Tolerates the v3
# API's 4xx responses past the last page (treats them as "no more results")
# and surfaces hard errors (auth, network) by returning non-zero.
fetch_location_ids() {
  local iso="$1"
  python3 - "$iso" "$API_BASE" "$PAGE_LIMIT" "$OPENAQ_API_KEY" <<'PY'
import json, sys, urllib.parse, urllib.request

iso, api_base, page_limit, api_key = sys.argv[1:5]
page_limit = int(page_limit)

ids = []
page = 1
while True:
    qs = urllib.parse.urlencode({"iso": iso, "limit": page_limit, "page": page})
    req = urllib.request.Request(
        f"{api_base}/v3/locations?{qs}",
        headers={"X-API-Key": api_key, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.load(resp)
    except urllib.error.HTTPError as e:
        # 4xx past the last page is the normal "no more results" signal.
        if 400 <= e.code < 500:
            break
        sys.stderr.write(f"HTTP {e.code} fetching {iso} page {page}: {e.reason}\n")
        sys.exit(1)
    except urllib.error.URLError as e:
        sys.stderr.write(f"Network error fetching {iso} page {page}: {e}\n")
        sys.exit(1)
    results = payload.get("results") or []
    if not results:
        break
    ids.extend(str(r["id"]) for r in results if r.get("id") is not None)
    if len(results) < page_limit:
        break
    page += 1

print(",".join(ids))
PY
}

step "Plan"
printf "  Countries : %s\n" "$COUNTRIES_ARG"
printf "  Years     : %s\n" "$YEARS_ARG"
printf "  Logs dir  : %s\n" "$LOG_DIR"

declare -a SUCCEEDED FAILED EMPTY
SUCCEEDED=()
FAILED=()
EMPTY=()

IFS=',' read -r -a COUNTRY_LIST <<< "$COUNTRIES_ARG"
for ISO in "${COUNTRY_LIST[@]}"; do
  ISO=$(printf '%s' "$ISO" | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')
  [ -n "$ISO" ] || continue

  step "[$ISO] discovering OpenAQ location IDs..."
  if ! LOCS=$(fetch_location_ids "$ISO"); then
    warn "[$ISO] OpenAQ /v3/locations call failed — skipping."
    FAILED+=("$ISO")
    continue
  fi

  COUNT=$(printf '%s' "$LOCS" | tr ',' '\n' | grep -c . || true)
  if [ "${COUNT:-0}" -eq 0 ]; then
    warn "[$ISO] no locations returned — nothing to backfill."
    EMPTY+=("$ISO")
    continue
  fi
  ok "[$ISO] $COUNT location id(s)"

  LOG_FILE="$LOG_DIR/${ISO}.log"
  step "[$ISO] running spark-backfill (years=$YEARS_ARG, locations=$COUNT) → $LOG_FILE"
  if docker compose run --rm spark-backfill \
        --locations "$LOCS" \
        --years "$YEARS_ARG" \
        --country-iso "$ISO" >"$LOG_FILE" 2>&1; then
    ok "[$ISO] backfill succeeded"
    SUCCEEDED+=("$ISO")
  else
    warn "[$ISO] backfill failed — see $LOG_FILE"
    FAILED+=("$ISO")
  fi
done

step "Summary"
printf "  Succeeded : %s\n" "${SUCCEEDED[*]:-(none)}"
printf "  Empty     : %s\n" "${EMPTY[*]:-(none)}"
printf "  Failed    : %s\n" "${FAILED[*]:-(none)}"

if [ ${#FAILED[@]} -gt 0 ]; then
  exit 1
fi
