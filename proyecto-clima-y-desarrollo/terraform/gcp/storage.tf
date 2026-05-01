resource "google_storage_bucket" "data" {
  name     = local.bucket_name
  location = var.bucket_location
  labels   = var.labels

  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 5
      with_state         = "ARCHIVED"
    }
  }
}

resource "google_bigquery_dataset" "warehouse" {
  dataset_id  = local.bigquery_dataset_id
  location    = var.bigquery_location
  description = "Climate-and-development dbt warehouse (staging, intermediate, marts)."
  labels      = var.labels

  delete_contents_on_destroy = false
}
