#!/usr/bin/env bash
# Smoke test for the GCP Terraform module.
#
# Runs `terraform init -backend=false` + `terraform validate` inside the
# official hashicorp/terraform image. No GCP credentials needed — this only
# verifies that the HCL is syntactically valid and that resource references
# resolve. Real `terraform plan` against a project is exercised by the
# operator with their own credentials, not by CI.

set -euo pipefail

TERRAFORM_VERSION="${TERRAFORM_VERSION:-1.9}"
TF_DIR="${TF_DIR:-terraform/gcp}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

[ -d "$TF_DIR" ] || fail "Directory '$TF_DIR' does not exist"

step "Running 'terraform init -backend=false' (no GCP creds needed)..."
docker run --rm \
  -v "$(pwd)/$TF_DIR:/workspace:rw" \
  -w /workspace \
  "hashicorp/terraform:${TERRAFORM_VERSION}" \
  init -backend=false -input=false -no-color
ok "Provider plugins resolved"

step "Running 'terraform validate'..."
docker run --rm \
  -v "$(pwd)/$TF_DIR:/workspace:rw" \
  -w /workspace \
  "hashicorp/terraform:${TERRAFORM_VERSION}" \
  validate -no-color
ok "HCL is valid and resource references resolve"

step "Running 'terraform fmt -check -recursive' for formatting drift..."
docker run --rm \
  -v "$(pwd)/$TF_DIR:/workspace:ro" \
  -w /workspace \
  "hashicorp/terraform:${TERRAFORM_VERSION}" \
  fmt -check -recursive -no-color \
  || fail "Terraform files are not formatted — run 'terraform fmt -recursive'"
ok "Formatting clean"

# Best-effort cleanup so re-runs start clean. The .terraform directory may be
# owned by root inside the bind mount; ignore failures.
rm -rf "$TF_DIR/.terraform" "$TF_DIR/.terraform.lock.hcl" 2>/dev/null || true

printf "\n\033[1;32m✓ Terraform smoke test passed.\033[0m\n"
