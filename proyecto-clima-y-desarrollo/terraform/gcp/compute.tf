resource "google_compute_instance" "orchestrator" {
  name         = local.vm_full_name
  machine_type = var.vm_machine_type
  zone         = var.zone
  tags         = [local.vm_full_name]
  labels       = var.labels

  boot_disk {
    initialize_params {
      image = var.vm_image
      size  = var.vm_disk_size_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id

    # External IP is granted only when the operator allowed an SSH CIDR;
    # otherwise the VM is reachable via IAP only.
    dynamic "access_config" {
      for_each = length(var.allowed_ssh_cidrs) > 0 ? [1] : []
      content {}
    }
  }

  service_account {
    email  = google_service_account.orchestrator.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    ssh-keys = "${var.ssh_user}:${var.ssh_public_key}"
    SSH_USER = var.ssh_user
  }

  metadata_startup_script = file("${path.module}/startup.sh")

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  depends_on = [
    google_storage_bucket_iam_member.orchestrator_bucket,
    google_bigquery_dataset_iam_member.orchestrator_data_editor,
  ]
}
