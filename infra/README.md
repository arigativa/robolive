
Check inventory scrapped from Terraform:
```shell script
ansible-inventory -i inventory/ --list --playbook-dir ./ -vvv
```

Install dependencies:
```shell script
pip3 install -r requirements.txt
ansible-galaxy role install -r requirements.yml
```

Deploy everything:
```shell script
ansible-playbook -i inventory/ playbook.yml
```