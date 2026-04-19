# GCP deployment (lift-and-shift)

Terraform skeleton that runs the GDELT stack on a single Compute Engine VM. It provisions a dedicated VPC, a static IP, a service account, a persistent data disk for Docker volumes, and a VM that bootstraps Docker and runs `make up` on first boot.

This is the simplest viable cloud deployment; it is **not** a production-grade architecture (single VM, no HA, no managed Postgres or Kafka).

## Prerequisites

- A GCP project with billing enabled and the Compute Engine API on
- `gcloud` authenticated against that project (`gcloud auth application-default login`)
- Terraform `>= 1.6`
- An SSH public key

## Usage

```bash
cd terraform/gcp
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: project_id, ssh_user, ssh_public_key, optionally allowed_app_cidrs

terraform init
terraform apply
```

When apply finishes Terraform prints the static IP and the URLs of every web UI. The VM still needs ~5–10 minutes after apply to install Docker, build images and start every container — follow `journalctl -u google-startup-scripts -f` over SSH to track progress.

## SSH access

SSH is exposed only through Identity-Aware Proxy (no public port 22). Use the command printed by `terraform output ssh_command`:

```bash
gcloud compute ssh gdelt-stack --tunnel-through-iap --zone <zone> --project <project>
```

## Persistence

Docker's `data-root` is moved to `/mnt/disks/data/docker` on the attached persistent disk, and the repo is cloned to `/mnt/disks/data/gdelt-repo`. As a result:

- Postgres / Kestra / Metabase / pgAdmin volumes survive `terraform destroy + apply`
- The randomly-generated `.env` (and its passwords) is preserved across VM recreations

If you want to start fresh, `terraform destroy` and then delete the `*-data` disk before re-applying.

## Validation

```bash
terraform fmt -check
terraform validate
terraform test          # runs plan-only assertions, no API calls
```

## Cost (rough order of magnitude)

`e2-standard-4` + 50 GB pd-balanced + static IP ≈ **120 USD/month** in `europe-southwest1`. Stop the VM with `gcloud compute instances stop gdelt-stack` when not in use to drop compute cost (disk + IP keep billing).

## What this skeleton does **not** do

- No managed Postgres (Cloud SQL), no managed Kafka (Confluent Cloud / MSK)
- No HTTPS / load balancer in front of the UIs
- No Secret Manager — passwords still come from `make init` on the VM
- No Cloud Logging for container stdout (only for the VM agent)

These are the natural next steps if the stack moves past "demo on a VM".
