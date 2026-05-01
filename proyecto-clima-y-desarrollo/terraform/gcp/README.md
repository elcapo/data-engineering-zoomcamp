# Cloud infrastructure (GCP via Terraform)

Provisions everything required to run the climate-and-development pipeline
on Google Cloud:

| Resource | Purpose |
|---|---|
| GCS bucket | Equivalent of MinIO — raw payloads + Parquet for the OpenAQ Spark backfill |
| BigQuery dataset | Equivalent of Postgres — staging + intermediate + marts (dbt-bigquery profile) |
| GCE VM | Hosts Kestra + Redpanda + PyFlink (one machine, the same compose stack but cloud-tuned) |
| Service account + IAM | Least-privilege identity used by the VM and by Dataproc Serverless |
| VPC + firewall | Dedicated network, IAP-friendly SSH, opt-in public access for SSH and the Kestra/Flink UIs |

What this does **not** provision:
- **Dataproc Serverless batch templates** — submission is dynamic (`gcloud dataproc batches submit`) from Kestra at runtime; the IAM bindings here are enough for that to work.
- **Looker Studio** — connect manually to BigQuery once the warehouse is populated; reports cannot be Terraformed.
- **The application stack on the VM** — installation of Docker is automated, but bringing up the compose profile with cloud env vars is left as a follow-up step (see "After apply" below).

## Prerequisites

- A GCP project with billing enabled.
- `gcloud` authenticated against the project (`gcloud auth application-default login`).
- An SSH public key pair if you want public SSH access; otherwise plan to use IAP.
- The following APIs enabled on the project: `compute`, `storage`, `bigquery`, `dataproc`, `iap`. Enable in one shot:
  ```bash
  gcloud services enable compute.googleapis.com storage.googleapis.com \
                         bigquery.googleapis.com dataproc.googleapis.com \
                         iap.googleapis.com
  ```

## Apply

```bash
cd terraform/gcp
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars         # set project_id, ssh_public_key, allowed CIDRs

terraform init
terraform plan
terraform apply
```

Outputs include the bucket name, dataset ID, VM IP (if any), and the SSH
command. State is local by default — convert to a GCS backend before
sharing across operators if needed.

## After apply

The VM is online with Docker installed but no application running. To bring
up the cloud profile of the compose stack:

```bash
$(terraform output -raw vm_ssh_command)            # SSH in via IAP
sudo -iu climate                                    # switch to the SSH user
git clone <this-repo> /opt/climate/repo && cd /opt/climate/repo/proyecto-clima-y-desarrollo

# Populate .env.cloud with output values + secrets, then:
docker compose --env-file .env.cloud --profile cloud up -d
```

(Wiring up the cloud compose profile with BigQuery + GCS env vars is the
next slice of work; this Terraform stops at the infrastructure boundary.)

## Destroy

```bash
terraform destroy
```

Two safety knobs: the GCS bucket has `force_destroy = false` (objects must
be deleted first) and the BigQuery dataset has `delete_contents_on_destroy
= false`. Both are deliberate — production state should never be wiped by
a careless `destroy`.
