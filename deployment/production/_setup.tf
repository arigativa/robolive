provider "aws" {
  region = "eu-central-1"
  # TODO revoke these token before public release
  access_key = "AKIA2HISUM5U7HWXCIHO"
  secret_key = "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"
}

terraform {
  backend "s3" {
    # TODO revoke these token before public release
    access_key = "AKIA2HISUM5U7HWXCIHO"
    secret_key = "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"
    bucket = "robolive-terraform-state"
    key    = "production"
    region = "eu-central-1"
  }
}