variable "project_id" {
  description = "GCP project ID where the stack will be deployed."
  type        = string
}

variable "region" {
  description = "GCP region for regional resources."
  type        = string
  default     = "europe-southwest1"
}

variable "zone" {
  description = "GCP zone for the VM and its data disk."
  type        = string
  default     = "europe-southwest1-a"
}

variable "instance_name" {
  description = "Name for the Compute Engine instance and related resources."
  type        = string
  default     = "gdelt-stack"
}

variable "machine_type" {
  description = "Compute Engine machine type. The full stack (Flink + Kafka + Postgres + Metabase) needs at least 16 GB RAM."
  type        = string
  default     = "e2-standard-4"
}

variable "boot_disk_size_gb" {
  description = "Size of the VM boot disk in GB."
  type        = number
  default     = 20
}

variable "data_disk_size_gb" {
  description = "Size of the persistent data disk that holds Docker volumes (Postgres, Kestra, Metabase, pgAdmin) and the cloned repo."
  type        = number
  default     = 50
}

variable "ssh_user" {
  description = "Linux user that owns the SSH public key on the VM."
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key (the literal contents of an id_*.pub file) added to the VM via metadata."
  type        = string
}

variable "allowed_app_cidrs" {
  description = "CIDR blocks allowed to reach the application UIs (Kestra, Redpanda Console, Flink, pgAdmin, Metabase). Default is open; restrict to your office/home IP for production."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "git_repo_url" {
  description = "Git repository to clone on the VM."
  type        = string
  default     = "https://github.com/elcapo/data-engineering-zoomcamp.git"
}

variable "git_branch" {
  description = "Git branch to check out."
  type        = string
  default     = "main"
}

variable "project_subdirectory" {
  description = "Subdirectory inside the cloned repo that contains the docker-compose stack."
  type        = string
  default     = "proyecto-analisis-de-gdelt"
}

variable "labels" {
  description = "Labels applied to all GCP resources that support them."
  type        = map(string)
  default = {
    project = "gdelt"
    managed = "terraform"
  }
}
