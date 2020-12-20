terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "robolive"

    workspaces {
      name = "production"
    }
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 2.13"
    }

    github = {
      source  = "hashicorp/github"
      version = "~> 2.8"
    }

    tls = {
      source  = "hashicorp/tls"
      version = "~> 3.0.0"
    }
  }
}

provider "azurerm" {
  skip_provider_registration  = true
  skip_credentials_validation = true
}

provider "github" {
  organization = "arigativa"
}

variable "robolive_github_repository" {
  default = "robolive"
}
