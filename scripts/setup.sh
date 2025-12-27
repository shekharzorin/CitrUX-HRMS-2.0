#!/bin/bash

# Citrux HRMS - Server Setup Script
# Run this on a fresh Ubuntu 24.04 / 22.04 LTS server (e.g. Oracle Cloud Free Tier)

set -e # Exit on error

echo "🚀 Starting Citrux HRMS Server Setup..."

# 1. Update System
echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Dependencies
echo "📦 Installing Git, Curl, Unzip, Nginx..."
sudo apt install -y git curl unzip nginx build-essential

# 3. Install Node.js (v20 LTS)
echo "📦 Installing Node.js v20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ Node.js is already installed."
fi

# 4. Install PM2 (Process Manager)
echo "📦 Installing PM2..."
sudo npm install -g pm2

# 5. Configure Firewall (UFW)
echo "🛡️ Configuring Firewall..."
# Check if UFW is active, if not enable it carefully (ssh allowed)
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable

# 6. Setup Directory Structure
echo "📂 Setting up project directory..."
mkdir -p ~/citrux-hrms
# Ensure permissions are correct
sudo chown -R $USER:$USER ~/citrux-hrms

echo "✅ Server dependencies installed successfully!"
echo ""
echo "👉 NEXT STEPS:"
echo "1. Clone your repo: git clone https://github.com/shekharzorin/hrms.git ~/citrux-hrms"
echo "2. Run 'scripts/nginx-conf-gen.sh' to setup your domain."
echo "3. Push code to GitHub to trigger the deployment action."
