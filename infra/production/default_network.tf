resource "azurerm_virtual_network" "default" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name = "robolive-vnet"
  address_space = [
    "10.0.0.0/16"
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

resource "azurerm_subnet" "firewall" {
  resource_group_name  = azurerm_resource_group.robolive.name
  virtual_network_name = azurerm_virtual_network.default.name

  name = "AzureFirewallSubnet"
  address_prefixes = [
    "10.0.1.0/24"
  ]
}

resource "azurerm_network_security_group" "web" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name = "signallingAndRelay-nsg"

  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "80"
    direction                  = "Inbound"
    name                       = "allowHTTP"
    description                = ""
    priority                   = 290
    protocol                   = "TCP"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "443"
    direction                  = "Inbound"
    name                       = "allowHTTPS"
    description                = ""
    priority                   = 291
    protocol                   = "TCP"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "22"
    direction                  = "Inbound"
    name                       = "SSH"
    description                = ""
    priority                   = 300
    protocol                   = "TCP"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "46000-46100"
    direction                  = "Inbound"
    name                       = "allowInboundForRelay"
    description                = ""
    priority                   = 330
    protocol                   = "*"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "46000-46100"
    direction                  = "Outbound"
    name                       = "allowOutboundForRelay"
    description                = ""
    priority                   = 331
    protocol                   = "*"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "8080"
    direction                  = "Inbound"
    name                       = "allowRelay"
    description                = ""
    priority                   = 320
    protocol                   = "*"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "8443"
    direction                  = "Inbound"
    name                       = "allowTlsForRelay"
    description                = ""
    priority                   = 310
    protocol                   = "TCP"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "4443"
    direction                  = "Inbound"
    name                       = "WS_SIGNALLING"
    description                = ""
    priority                   = 340
    protocol                   = "TCP"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "9030"
    direction                  = "Inbound"
    name                       = "UDP_SIGNALLING"
    description                = ""
    priority                   = 360
    protocol                   = "UDP"
  }
  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "9031"
    direction                  = "Inbound"
    name                       = "TCP_SIGNALLING"
    description                = ""
    priority                   = 350
    protocol                   = "TCP"
  }

  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "3476"
    direction                  = "Inbound"
    name                       = "REGISTRY_3476"
    description                = ""
    priority                   = 3476
    protocol                   = "TCP"
  }

  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "3477"
    direction                  = "Inbound"
    name                       = "REGISTRY_3477"
    description                = ""
    priority                   = 3477
    protocol                   = "TCP"
  }

  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "3478"
    direction                  = "Inbound"
    name                       = "REGISTRY_3478"
    description                = ""
    priority                   = 3478
    protocol                   = "TCP"
  }

  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "3479"
    direction                  = "Inbound"
    name                       = "REGISTRY_3479"
    description                = ""
    priority                   = 3479
    protocol                   = "TCP"
  }

  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "3480"
    direction                  = "Inbound"
    name                       = "REGISTRY_3480"
    description                = ""
    priority                   = 3480
    protocol                   = "TCP"
  }

  security_rule {
    access                     = "Allow"
    source_address_prefix      = "*"
    source_port_range          = "*"
    destination_address_prefix = "*"
    destination_port_range     = "10477"
    direction                  = "Inbound"
    name                       = "ENVOY_REGISTRY_10477"
    description                = ""
    priority                   = 3577
    protocol                   = "TCP"
  }
}
