# Smoke test: validates the plan with required variables and asserts a few invariants.
# Run with: terraform init -backend=false && terraform test
# Uses a fake access token so plan succeeds without GCP credentials (no API calls happen at plan time).

provider "google" {
  project      = "test-project"
  region       = "us-central1"
  zone         = "us-central1-a"
  access_token = "fake-token-for-plan-only"
}

variables {
  project_id     = "test-project"
  ssh_user       = "test"
  ssh_public_key = "ssh-ed25519 AAAATESTKEY test@host"
}

run "plan_defaults" {
  command = plan

  assert {
    condition     = google_compute_instance.vm.name == "gdelt-stack"
    error_message = "Default instance name should be gdelt-stack."
  }

  assert {
    condition     = google_compute_disk.data.size == 50
    error_message = "Default data disk size should be 50 GB."
  }

  assert {
    condition     = contains(google_compute_firewall.ssh_iap.source_ranges, "35.235.240.0/20")
    error_message = "SSH firewall must only allow Google's IAP range."
  }

  assert {
    condition     = sum([for a in google_compute_firewall.apps.allow : length(a.ports)]) == 5
    error_message = "Apps firewall must expose the 5 web UI ports."
  }
}

run "plan_restricted_apps" {
  command = plan

  variables {
    allowed_app_cidrs = ["203.0.113.10/32"]
  }

  assert {
    condition     = google_compute_firewall.apps.source_ranges == toset(["203.0.113.10/32"])
    error_message = "Apps firewall must honor allowed_app_cidrs override."
  }
}
