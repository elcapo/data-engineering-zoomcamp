output "instance_name" {
  description = "Name of the deployed Compute Engine VM."
  value       = google_compute_instance.vm.name
}

output "external_ip" {
  description = "Static external IP attached to the VM."
  value       = google_compute_address.static_ip.address
}

output "ssh_command" {
  description = "SSH command (uses Identity-Aware Proxy, no public SSH port)."
  value       = "gcloud compute ssh ${var.instance_name} --tunnel-through-iap --zone ${var.zone} --project ${var.project_id}"
}

output "app_urls" {
  description = "Public URLs for the stack web UIs."
  value = {
    kestra           = "http://${google_compute_address.static_ip.address}:8080"
    redpanda_console = "http://${google_compute_address.static_ip.address}:8081"
    flink            = "http://${google_compute_address.static_ip.address}:8082"
    pgadmin          = "http://${google_compute_address.static_ip.address}:8083"
    metabase         = "http://${google_compute_address.static_ip.address}:8084"
  }
}
