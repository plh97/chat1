#!/bin/bash

echo $1 >> public_ip.txt
node ../../scripts/replaceIP.js ../../packages/frontend/netlify.toml $1
node ../../scripts/replaceIP.js ../../.github/workflows/github-CICD-actions.yml $1
node ../../scripts/replaceIP.js ../../ansible/ssh_config $1
# ssh-keyscan -H $1 >> ~/.ssh/known_hosts