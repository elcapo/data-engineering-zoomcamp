locals {
  bucket_name = (
    var.bucket_name != ""
    ? var.bucket_name
    : "${var.project_id}-${var.name_prefix}-data"
  )

  vm_full_name        = "${var.name_prefix}-${var.vm_name}"
  network_name        = "${var.name_prefix}-net"
  subnet_name         = "${var.name_prefix}-subnet"
  service_account_id  = "${var.name_prefix}-orchestrator"
  bigquery_dataset_id = var.bigquery_dataset_id
}
