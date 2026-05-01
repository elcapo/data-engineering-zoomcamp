#!/usr/bin/env bash
# Orchestrator VM bootstrap.
#
# Installs Docker + Compose plugin and prepares the host. The actual
# docker-compose stack (cloud profile of the project's compose file with
# BigQuery + GCS env vars) is deployed by the operator after first SSH —
# this script keeps a clear separation between infrastructure (Terraform)
# and application (compose). Re-running the script is safe.

set -euxo pipefail

if ! command -v docker >/dev/null 2>&1; then
    apt-get update
    apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg git make

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    codename=$(. /etc/os-release && echo "$VERSION_CODENAME")
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $codename stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update
    apt-get install -y --no-install-recommends \
        docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

usermod -aG docker "${SSH_USER:-climate}" || true

mkdir -p /opt/climate
chown "${SSH_USER:-climate}":"${SSH_USER:-climate}" /opt/climate

cat > /etc/motd <<EOF
========================================================================
  Climate-and-development orchestrator VM (provisioned by Terraform)
  Next step: clone the repo into /opt/climate and bring up the cloud
  compose profile with BigQuery + GCS env vars.
========================================================================
EOF
