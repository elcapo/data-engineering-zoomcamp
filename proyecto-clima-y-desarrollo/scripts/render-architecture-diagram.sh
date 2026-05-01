#!/usr/bin/env bash
# Render the README's architecture Mermaid block to docs/resources/charts/architecture.png
# using the official mermaid-cli Docker image. Idempotent: re-runs overwrite the PNG.

set -euo pipefail

README="${README:-README.md}"
OUTPUT="${OUTPUT:-docs/resources/charts/architecture.png}"
MERMAID_IMAGE="${MERMAID_IMAGE:-minlag/mermaid-cli:11.4.0}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

[ -f "$README" ] || fail "$README not found (set README=... if it's elsewhere)"

step "Extracting Mermaid block from $README..."
# Write the temp file inside the project so the mermaid-cli container (which
# only has $(pwd) bind-mounted) can read it.
TMP_MMD=".architecture.mmd"
trap 'rm -f "$TMP_MMD"' EXIT

awk '
  /^```mermaid[[:space:]]*$/ { capture = 1; next }
  /^```[[:space:]]*$/ && capture { capture = 0; exit }
  capture { print }
' "$README" > "$TMP_MMD"

[ -s "$TMP_MMD" ] || fail "No Mermaid block found in $README"
ok "Extracted $(wc -l < "$TMP_MMD") lines of Mermaid"

# Strip GitHub-only edge syntax (e.g. "WB L_WB_L_Kestra_0@-->" or
# "L_WB_L_Kestra_0@{ curve: linear }") that mermaid-cli's parser rejects.
# Drop lines that are pure edge-style declarations, then strip inline edge IDs.
step "Preprocessing for mermaid-cli compatibility..."
sed -i \
    -e '/^[[:space:]]*L_[A-Za-z0-9_]\+@{[^}]*}[[:space:]]*$/d' \
    -e 's/[[:space:]]L_[A-Za-z0-9_]\+@/ /g' \
    "$TMP_MMD"
ok "Preprocessing complete"

mkdir -p "$(dirname "$OUTPUT")"

step "Rendering with $MERMAID_IMAGE → $OUTPUT..."
# --user 0: under rootless Docker, container UID 0 maps to the host user, so
# files land owned by the operator. Under root Docker, the bind mount falls
# back to the host file owner anyway.
docker run --rm \
  --user 0 \
  -v "$(pwd):/data" \
  -w /data \
  "$MERMAID_IMAGE" \
  -i "$TMP_MMD" \
  -o "$OUTPUT" \
  -b transparent \
  --width 2400 \
  --scale 2 \
  2>&1 | tail -10

[ -f "$OUTPUT" ] || fail "Render produced no output"
ok "Wrote $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
