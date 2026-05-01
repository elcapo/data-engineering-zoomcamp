output "bucket_name" {
  value       = google_storage_bucket.data.name
  description = "GCS bucket used by World Bank ingestion + Spark Parquet output."
}

output "bigquery_dataset_id" {
  value       = google_bigquery_dataset.warehouse.dataset_id
  description = "BigQuery dataset for staging + intermediate + marts."
}

output "service_account_email" {
  value       = google_service_account.orchestrator.email
  description = "Service account assumed by the VM and by Dataproc batches."
}

output "vm_external_ip" {
  value = (
    length(var.allowed_ssh_cidrs) > 0
    ? google_compute_instance.orchestrator.network_interface[0].access_config[0].nat_ip
    : null
  )
  description = "External IP of the orchestrator VM (null when SSH is IAP-only)."
}

output "vm_ssh_command" {
  value       = "gcloud compute ssh ${google_compute_instance.orchestrator.name} --zone=${var.zone} --tunnel-through-iap"
  description = "Shortcut to connect to the VM via IAP (works regardless of public IP)."
}

output "kestra_url_hint" {
  value = (
    length(var.allowed_ui_cidrs) > 0 && length(var.allowed_ssh_cidrs) > 0
    ? "http://${google_compute_instance.orchestrator.network_interface[0].access_config[0].nat_ip}:${var.kestra_port}"
    : "use 'gcloud compute start-iap-tunnel ${google_compute_instance.orchestrator.name} ${var.kestra_port} --zone=${var.zone}'"
  )
  description = "How to reach the Kestra UI once the compose stack is running."
}
