provider "aws" {
  region = "eu-central-1"
  # TODO revoke these token before public release
  access_key = "AKIA2HISUM5U7HWXCIHO"
  secret_key = "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"
}

provider "aws" {
  # AWS certs works only in that region:
  #   The specified SSL certificate doesn't exist, isn't in us-east-1 region, isn't valid, or doesn't include a valid certificate chain.
  alias = "cloudfront"
  region = "us-east-1"
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