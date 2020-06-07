import re

from ansible.plugins.inventory import BaseInventoryPlugin
from python_terraform import *
import json
import tempfile
import traceback

DOCUMENTATION = r'''
    name: signalling_and_relay
    plugin_type: inventory
    short_description: Returns Ansible inventory from CSV
    description: Returns Ansible inventory from CSV
    options:
      terraform_path:
          description: Path to Terraform sources (`terraform output` will be invoked there)
          required: true
'''


class InventoryModule(BaseInventoryPlugin):
    NAME = 'signalling_and_relay'

    def verify_file(self, path):
        return super(InventoryModule, self).verify_file(path)

    def parse(self, inventory, loader, path, cache=True):
        # call base method to ensure properties are available for use with other helper methods
        try:
            super(InventoryModule, self).parse(inventory, loader, path, cache)
            self._read_config_data(path)
            self.populate(self.get_inventory())
        except Exception:
            self.log("parse() failed with")
            traceback.print_exc()

    def populate(self, inventory):
        for item in inventory:
            host = item['host']
            self.inventory.add_host(host=host)
            for k, v in item['variables'].items():
                self.inventory.set_variable(host, k, v)

    def get_inventory(self):
        terraform_path = self.get_option('terraform_path')
        signalling_instance = self._get_terraform_output(terraform_path, 'signalling_and_relay__credentials')

        host = 'signalling_and_relay'

        ssh_key_fd, ssh_key_file = tempfile.mkstemp()
        os.write(ssh_key_fd, bytes(signalling_instance['ssh_key'], encoding='utf8'))
        os.close(ssh_key_fd)

        return [
            {
                'host': host,
                'variables': {
                    'ansible_host': signalling_instance['public_ip'],
                    'ansible_user': signalling_instance['username'],
                    'ansible_ssh_private_key_file': ssh_key_file,
                    'host_private_ip': signalling_instance['private_ip'],
                    'host_public_ip': signalling_instance['public_ip'],
                }
            }
        ]

    def _get_terraform_output(self, path, variable):
        terraform = Terraform(working_dir=path)
        ret, out, err = terraform.cmd('output', '-json')

        if ret != 0:
            self.log("terraform failed: " + out + "\n\terr:" + err)
            raise RuntimeError(err)

        # fix log in Github Actions
        out = re.sub(r'^[^\\[{]+([\\[{])', '\\1', out)

        self.log("terraform output: " + out)
        json_out = json.loads(out)
        return json_out[variable]['value']

    def log(self, message):
        print(message)
