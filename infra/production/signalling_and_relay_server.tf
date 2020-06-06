
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
    admin_username = "ovoshlook"
    computer_name  = "signallingAndRelay"
  }

  os_profile_linux_config {
    disable_password_authentication = true
    ssh_keys {
      key_data = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCwaMIlI2s71zYwDgDmHkELBWckLFw1lewgatIX2FKnfu4k63v9erPquubMeixj6zpfOtB933OCDsQ7FWCCKP9eYRXhFcE/iUxXEG+zu4QVkY+GEVEdLG/+5AnNufeILbthmrKa8GeZ9YcnwRKbcKZQh45pYKSPqG0+Zfrc5MYEYgs46WsQ+n45nl0IPlumuyoLdjIgmAmMJIV2weoFTl2LbVTHJXBAK4yNDUuZsf4eXFEaGiR1SJchQUHzUrAhnRPEd2jONmkDbTuqi2oQ24ldSzDC7kH8+nYsSPgl2vGXh96AdVyFtppy8R+0SJdtf0NquDe6YlL7agNOX1Fm9HA8bdDLkgs285PsxmOuCwsu8Drzoii8tyUM1Jt+c/I4P6K8W9V05A6XVBYC6RwEAhUCFz96t5CIsbKQFEffBrw4BOgSAzA85xwN7bpQ+mqCA72AjubbnSOEW7UZ0v22u+jk9NHyKiqtXpvXw8CVTxvyRTBXeNsMejcvhFbn1fAz83c= root@workstation"
      path     = "/home/ovoshlook/.ssh/authorized_keys"
    }
  }
}
