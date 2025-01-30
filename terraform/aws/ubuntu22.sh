#!/bin/bash

# update
sudo apt-get update && sudo apt-get -y upgrade

sh -c "$(curl -fsSL https://get.docker.com)"
dockerd

# certbot
# sudo apt-get install -y certbot
# sudo certbot certonly --standalone --agree-tos --redirect -m pengliheng111@gmail.com -d plhh.org --non-interactive


sudo apt-get install -y gcc g++ make

curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
sudo apt-get install -y npm
sudo npm install pnpm nodemon -g

# made port can be visited in public network
# sudo apt-get install ufw
# ufw --force enable
# ufw allow 80/tcp
# ufw allow 443/tcp
# ufw allow 443/udp
# ufw allow 3000:9999/tcp
# ufw disable



# # install zsh
# sudo apt-get install -y zsh
# # sudo rm -rf /root/.oh-my-zsh
# sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
# sudo chsh -s $(which zsh)

# # add 2 zsh plugin
# git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
# git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# # setup zsh config

# echo 'alias public_ip="dig -4 TXT +short o-o.myaddr.l.google.com @ns1.google.com"

# export ZSH="$HOME/.oh-my-zsh"

# ZSH_THEME="bira"

# plugins=(
#   ansible
#   docker
#   emoji
#   git
#   git-flow
#   terraform
#   github
#   yarn
#   aws
#   npm
#   nvm
#   zsh-autosuggestions
#   zsh-syntax-highlighting
# )

# source $ZSH/oh-my-zsh.sh' > ~/.zshrc
