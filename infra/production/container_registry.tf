resource "azurerm_container_registry" "robolive" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name          = "robolive"
  admin_enabled = true
  sku           = "Standard"
}

resource "github_actions_secret" "container_registry_registry" {
  repository      = var.robolive_github_repository
  secret_name     = "DOCKER_REGISTRY"
  plaintext_value = azurerm_container_registry.robolive.login_server
}

resource "github_actions_secret" "container_registry_username" {
  repository      = var.robolive_github_repository
  secret_name     = "DOCKER_USERNAME"
  plaintext_value = azurerm_container_registry.robolive.admin_username
}

resource "github_actions_secret" "container_registry_password" {
  repository      = var.robolive_github_repository
  secret_name     = "DOCKER_PASSWORD"
  plaintext_value = azurerm_container_registry.robolive.admin_password
}
