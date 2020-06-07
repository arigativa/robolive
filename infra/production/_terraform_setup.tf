terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "robolive"

    workspaces {
      name = "production"
    }
  }
}

provider "azurerm" {
  version                     = "~> 2.13"
  skip_provider_registration  = true
  skip_credentials_validation = true
  features {}
}

provider "github" {
  version      = "~> 2.8"
  organization = "arigativa"
}

variable "robolive_github_repository" {
  default = "robolive"
}
