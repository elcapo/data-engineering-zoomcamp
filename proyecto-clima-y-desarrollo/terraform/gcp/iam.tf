resource "google_service_account" "orchestrator" {
  account_id   = local.service_account_id
  display_name = "Climate Orchestrator (Kestra + Flink + dbt)"
  description  = "Identity used by the orchestrator VM and Dataproc batches."
}

# Bucket-scoped: read/write everything under the data bucket.
resource "google_storage_bucket_iam_member" "orchestrator_bucket" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.orchestrator.email}"
}

# Dataset-scoped: dbt writes tables, runs queries.
resource "google_bigquery_dataset_iam_member" "orchestrator_data_editor" {
  dataset_id = google_bigquery_dataset.warehouse.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.orchestrator.email}"
}

# Project-scoped: needed to create BigQuery jobs at all (job creation is a
# project-level permission, not dataset-level).
resource "google_project_iam_member" "orchestrator_bigquery_jobs" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.orchestrator.email}"
}

# Project-scoped: submit Dataproc Serverless batches for the OpenAQ backfill.
resource "google_project_iam_member" "orchestrator_dataproc" {
  project = var.project_id
  role    = "roles/dataproc.editor"
  member  = "serviceAccount:${google_service_account.orchestrator.email}"
}

# Allow the orchestrator service account to act as itself when launching
# Dataproc batches (Dataproc impersonates the SA to run the job).
resource "google_service_account_iam_member" "orchestrator_self_actas" {
  service_account_id = google_service_account.orchestrator.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.orchestrator.email}"
}

# Logging + monitoring so the VM-side agents can publish.
resource "google_project_iam_member" "orchestrator_logs" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.orchestrator.email}"
}

resource "google_project_iam_member" "orchestrator_metrics" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.orchestrator.email}"
}
