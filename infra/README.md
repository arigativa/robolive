State is storage in Terraform Cloud: https://app.terraform.io/app/robolive/workspaces

# Concepts

Terraform is used for provisioning cloud infrastructure, eg.: VMs, networks, Kubernetes clusters, queues, load balancers

Ansible is used to deploy software on VMs.

For now we have only one machine - `signallingAndRelay` (see [`signalling_and_relay_server.tf`](/infra/production/signalling_and_relay_server.tf)).

Ansible reads Terraform output for VM credentials (see [signalling_and_relay.py inventory plugin](/infra/playbook/inventory_plugins/signalling_and_relay.py)).
This plugin should be extended when new machines will be there to avoid hardcoding and allow reproducing the whole setup.

# Continuous delivery

Everything from this folder is deployed using Github Actions workflow. See [`.github/workflows/production.yml`](/.github/workflows/production.yml)

# Local setup

## Configure tooling

### Terraform

Initialize plugins:

```shell script
terraform init
```

### Ansible

```shell script
pip3 install -r requirements.txt
ansible-galaxy role install -r requirements.yml
```

## Deploy production

1. Deploy infrastructure (VMs, networks, keys):
```shell script
cd infra/production
terraform apply
```

Ansible can be used only if Terraform is initialized as well.

2. Deploy software on VMs:
```shell script
cd infra/playbook
ansible-playbook -i inventory/production playbook.yml
```

## Troubleshooting

### Check inventory scrapped by Ansible from Terraform
```shell script
cd infra/playbook
ansible-inventory -i inventory/production --list --playbook-dir ./ -vvv
```

