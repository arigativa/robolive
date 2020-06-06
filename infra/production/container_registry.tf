resource "azurerm_container_registry" "robolive" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name = "robolive"
}

