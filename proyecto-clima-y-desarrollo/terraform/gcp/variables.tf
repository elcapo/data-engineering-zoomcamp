variable "project_id" {
  type        = string
  description = "GCP project ID where every resource is created."
}

variable "region" {
  type        = string
  default     = "europe-west1"
  description = "GCP region for regional resources (subnet, Dataproc, Looker)."
}

variable "zone" {
  type        = string
  default     = "europe-west1-b"
  description = "GCP zone for the orchestrator VM."
}

variable "name_prefix" {
  type        = string
  default     = "climate"
  description = "Prefix applied to every resource name to keep them grouped."
}

variable "labels" {
  type = map(string)
  default = {
    project = "climate-and-development"
    managed = "terraform"
  }
  description = "Labels attached to billable resources."
}

# --- Storage / Warehouse ---

variable "bucket_name" {
  type        = string
  default     = ""
  description = "GCS bucket name. Defaults to '<project_id>-<name_prefix>-data' when empty."
}

variable "bucket_location" {
  type        = string
  default     = "EU"
  description = "GCS bucket location (multi-region or region)."
}

variable "bigquery_dataset_id" {
  type        = string
  default     = "climate"
  description = "BigQuery dataset ID for staging + marts."
}

variable "bigquery_location" {
  type        = string
  default     = "EU"
  description = "BigQuery dataset location."
}

# --- Orchestrator VM ---

variable "vm_name" {
  type        = string
  default     = "orchestrator"
  description = "Name of the GCE VM that hosts Kestra + Redpanda + PyFlink."
}

variable "vm_machine_type" {
  type        = string
  default     = "e2-standard-2"
  description = "Machine type of the orchestrator VM (2 vCPU / 8 GiB by default)."
}

variable "vm_disk_size_gb" {
  type        = number
  default     = 50
  description = "Boot disk size for the orchestrator VM (GiB)."
}

variable "vm_image" {
  type        = string
  default     = "debian-cloud/debian-12"
  description = "Source image for the orchestrator VM."
}

variable "ssh_user" {
  type        = string
  default     = "climate"
  description = "Linux user provisioned on the VM (also used in the SSH command output)."
}

variable "ssh_public_key" {
  type        = string
  description = "Public SSH key (full line, e.g. 'ssh-ed25519 AAAA... user@host') installed on the VM."
}

variable "allowed_ssh_cidrs" {
  type        = list(string)
  default     = []
  description = "CIDR ranges allowed to SSH into the VM. Empty = no inbound SSH (use IAP)."
}

variable "allowed_ui_cidrs" {
  type        = list(string)
  default     = []
  description = "CIDR ranges allowed to reach Kestra (8080) + Flink UI (8081). Empty = no inbound UI."
}

variable "kestra_port" {
  type        = number
  default     = 8080
  description = "Port the Kestra UI listens on (forwarded by the firewall)."
}

variable "flink_ui_port" {
  type        = number
  default     = 8081
  description = "Port the Flink JobManager UI listens on."
}
