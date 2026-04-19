locals {
  app_ports = ["8080", "8081", "8082", "8083", "8084"]
}

# --- Network ---

resource "google_compute_network" "vpc" {
  name                    = "${var.instance_name}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.instance_name}-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

resource "google_compute_address" "static_ip" {
  name   = "${var.instance_name}-ip"
  region = var.region
}

# --- Firewall ---

# SSH only via Identity-Aware Proxy. Connect with:
#   gcloud compute ssh <instance> --tunnel-through-iap --zone <zone>
resource "google_compute_firewall" "ssh_iap" {
  name      = "${var.instance_name}-ssh-iap"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"

  source_ranges = ["35.235.240.0/20"]
  target_tags   = [var.instance_name]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

resource "google_compute_firewall" "apps" {
  name      = "${var.instance_name}-apps"
  network   = google_compute_network.vpc.name
  direction = "INGRESS"

  source_ranges = var.allowed_app_cidrs
  target_tags   = [var.instance_name]

  allow {
    protocol = "tcp"
    ports    = local.app_ports
  }
}

# --- Service account ---

resource "google_service_account" "vm" {
  account_id   = "${var.instance_name}-sa"
  display_name = "Service account for ${var.instance_name}"
}

resource "google_project_iam_member" "vm_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.vm.email}"
}

resource "google_project_iam_member" "vm_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.vm.email}"
}

# --- Persistent data disk (survives VM recreation) ---

resource "google_compute_disk" "data" {
  name   = "${var.instance_name}-data"
  type   = "pd-balanced"
  zone   = var.zone
  size   = var.data_disk_size_gb
  labels = var.labels
}

# --- VM ---

resource "google_compute_instance" "vm" {
  name         = var.instance_name
  machine_type = var.machine_type
  zone         = var.zone
  tags         = [var.instance_name]
  labels       = var.labels

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
      size  = var.boot_disk_size_gb
      type  = "pd-balanced"
    }
  }

  attached_disk {
    source      = google_compute_disk.data.id
    device_name = "gdelt-data"
    mode        = "READ_WRITE"
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id
    access_config {
      nat_ip = google_compute_address.static_ip.address
    }
  }

  service_account {
    email  = google_service_account.vm.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    ssh-keys               = "${var.ssh_user}:${var.ssh_public_key}"
    enable-oslogin         = "FALSE"
    block-project-ssh-keys = "TRUE"
  }

  metadata_startup_script = templatefile("${path.module}/startup.sh.tftpl", {
    repo_url     = var.git_repo_url
    branch       = var.git_branch
    subdirectory = var.project_subdirectory
  })

  allow_stopping_for_update = true
}
