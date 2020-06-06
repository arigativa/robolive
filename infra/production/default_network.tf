resource "azurerm_virtual_network" "default" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name = "robolive-vnet"
  address_space = [
    "10.0.0.0/24"
  ]
}

resource "azurerm_subnet" "default" {
  resource_group_name  = azurerm_resource_group.robolive.name
  virtual_network_name = azurerm_virtual_network.default.name

  name = "default"
  address_prefixes = [
    "10.0.0.0/24"
  ]
}
