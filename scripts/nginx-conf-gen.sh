#!/bin/bash

# Citrux HRMS - Nginx Config Generator
# Run this AFTER cloning the repo on the server

echo "🌐 Citrux HRMS Nginx Setup"
read -p "Enter your Domain Name or Public IP (e.g., hrms.example.com or 123.45.67.89): " DOMAIN_NAME

CONFIG_FILE="/etc/nginx/sites-available/citrux"

# Create Nginx Config
echo "📝 Generating Nginx configuration for $DOMAIN_NAME..."

sudo bash -c "cat > $CONFIG_FILE" <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    root /home/$USER/citrux-hrms/client/dist;
    index index.html;

    # Frontend - React Router Support
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Uploads
    location /uploads/ {
        alias /home/$USER/citrux-hrms/server/uploads/;
    }
}
EOF

# Enable Site
echo "🔗 Enabling site..."
sudo ln -sf $CONFIG_FILE /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and Restart
echo "🔄 Restarting Nginx..."
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Nginx setup complete! Your app should be visible at http://$DOMAIN_NAME"

# Optional SSL Setup
read -p "Do you want to setup free SSL (HTTPS) with Certbot? (y/n): " INSTALL_SSL
if [[ "$INSTALL_SSL" == "y" || "$INSTALL_SSL" == "Y" ]]; then
    echo "🔒 Installing Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d $DOMAIN_NAME
fi
