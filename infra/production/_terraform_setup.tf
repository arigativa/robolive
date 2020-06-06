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
  skip_provider_registration  = true
  skip_credentials_validation = true
  features {}
}
