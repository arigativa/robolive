
resource "azurerm_public_ip" "signalling_and_relay" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name              = "signallingAndRelay-ip"
  allocation_method = "Dynamic"
}

resource "azurerm_network_interface" "signalling_and_relay" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name = "signallingandrelay359"
  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = azurerm_subnet.default.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.signalling_and_relay.id
  }
}

resource "azurerm_storage_account" "signalling_and_relay__bootdiagnostics" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name                     = "robolivediag774"
  account_kind             = "Storage"
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

data "azurerm_platform_image" "debian10" {
  location = azurerm_resource_group.robolive.location

  publisher = "debian"
  offer     = "debian-10"
  sku       = "10"
}

resource "azurerm_managed_disk" "signalling_and_relay__os" {
  resource_group_name = upper(azurerm_resource_group.robolive.name) // hack
  location            = azurerm_resource_group.robolive.location

  name                 = "signallingAndRelay_OsDisk_1_15def6a4a6b148a2b21b5e7ec0215620"
  storage_account_type = "Premium_LRS"
  disk_size_gb         = 30

  create_option      = "FromImage"
  os_type            = "Linux"
  image_reference_id = data.azurerm_platform_image.debian10.id
}

resource "azurerm_virtual_machine" "signalling_and_relay" {
  resource_group_name = azurerm_resource_group.robolive.name
  location            = azurerm_resource_group.robolive.location

  name = "signallingAndRelay"
  network_interface_ids = [
    azurerm_network_interface.signalling_and_relay.id
  ]
  vm_size = "Standard_B1s"
  tags    = {}
  zones   = []

  boot_diagnostics {
    enabled     = true
    storage_uri = azurerm_storage_account.signalling_and_relay__bootdiagnostics.primary_blob_endpoint
  }

  storage_os_disk {
    create_option = "FromImage"
    caching       = "ReadWrite"
    name          = azurerm_managed_disk.signalling_and_relay__os.name
  }

  os_profile {
    admin_username = "ovoshlook" // TODO change to var.ansible_user when recreate the vm
    computer_name  = "signallingAndRelay"
  }

  os_profile_linux_config {
    disable_password_authentication = true
    ssh_keys {
      key_data = tls_private_key.ansible.public_key_openssh
      path     = "/home/${var.ansible_user}/.ssh/authorized_keys"
    }
  }
}

output "signalling_and_relay__credentials" {
  sensitive = true
  value = {
    private_ip = azurerm_network_interface.signalling_and_relay.private_ip_address
    public_ip  = azurerm_public_ip.signalling_and_relay.ip_address
    username   = var.ansible_user
    ssh_key    = tls_private_key.ansible.private_key_pem
  }
}
