resource "google_compute_network" "vpc" {
  name                    = local.network_name
  auto_create_subnetworks = false
  description             = "Dedicated VPC for the climate-and-development pipeline."
}

resource "google_compute_subnetwork" "subnet" {
  name          = local.subnet_name
  ip_cidr_range = "10.10.0.0/24"
  network       = google_compute_network.vpc.id
  region        = var.region

  private_ip_google_access = true
}

resource "google_compute_firewall" "ssh" {
  count   = length(var.allowed_ssh_cidrs) > 0 ? 1 : 0
  name    = "${local.network_name}-allow-ssh"
  network = google_compute_network.vpc.name

  source_ranges = var.allowed_ssh_cidrs
  target_tags   = [local.vm_full_name]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

resource "google_compute_firewall" "ui" {
  count   = length(var.allowed_ui_cidrs) > 0 ? 1 : 0
  name    = "${local.network_name}-allow-ui"
  network = google_compute_network.vpc.name

  source_ranges = var.allowed_ui_cidrs
  target_tags   = [local.vm_full_name]

  allow {
    protocol = "tcp"
    ports    = [tostring(var.kestra_port), tostring(var.flink_ui_port)]
  }
}

# Always allow IAP-tunneled SSH (no public exposure required).
resource "google_compute_firewall" "iap_ssh" {
  name    = "${local.network_name}-allow-iap-ssh"
  network = google_compute_network.vpc.name

  source_ranges = ["35.235.240.0/20"] # Google IAP range
  target_tags   = [local.vm_full_name]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}
