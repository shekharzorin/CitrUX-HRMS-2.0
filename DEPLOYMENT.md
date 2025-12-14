# Deployment Guide for AWS EC2

This guide outlines the steps to deploy the Citrux HRMS application (React Frontend + Node.js/Express Backend + SQLite Database) on an AWS EC2 instance running Ubuntu.

## Prerequisites

1.  **AWS Account**: Access to the AWS Console.
2.  **Domain Name (Optional)**: If you want to use a custom domain (e.g., `hrms.yourcompany.com`).
3.  **SSH Client**: To connect to the server (Terminal on Mac/Linux, PowerShell or PuTTY on Windows).

---

## Step 1: Launch an EC2 Instance

1.  Log in to the **AWS Management Console**.
2.  Navigate to **EC2** and click **Launch Instance**.
3.  **Name**: `Citrux-HRMS-Server`.
4.  **AMI**: Select **Ubuntu Server 24.04 LTS (HVM)** (or 22.04).
5.  **Instance Type**: `t3.micro` (Free Tier eligible) or `t3.small` (recommended for better performance).
6.  **Key Pair**: Create a new key pair or select an existing one. **Download the `.pem` file** and keep it safe.
7.  **Network Settings**:
    *   Allow SSH traffic from anywhere (0.0.0.0/0) or My IP.
    *   Allow HTTP traffic from the internet (0.0.0.0/0).
    *   Allow HTTPS traffic from the internet (0.0.0.0/0).
8.  **Storage**: 8GB or more (gp3).
9.  Click **Launch Instance**.

---

## Step 2: Connect to the Server

Open your terminal (PowerShell on Windows) and run the following command (replace with your key path and instance IP):

```bash
# Set permissions for key file (Linux/Mac only)
chmod 400 your-key.pem

# Connect via SSH
ssh -i "path/to/your-key.pem" ubuntu@<your-ec2-public-ip>
```

---

## Step 3: Server Setup & Installation

Update the system and install necessary packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip nginx
```

### Install Node.js (v20)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

---

## Step 4: Clone the Repository

We will clone the project into the home directory.

```bash
cd ~
git clone <your-repository-url> citrux-hrms
cd citrux-hrms
```

*(Note: If your repo is private, you may need to set up an SSH deployment key or use HTTPS with a Personal Access Token).*

---

## Step 5: Backend Deployment

1.  Navigate to the server directory:
    ```bash
    cd ~/citrux-hrms/server
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    Create a `.env` file:
    ```bash
    nano .env
    ```
    Paste your production variables:
    ```env
    PORT=5000
    DATABASE_URL="file:./dev.db"
    JWT_SECRET="your-super-secret-key"
    # Add other variables from your local .env
    ```
    (Press `Ctrl+X`, then `Y`, then `Enter` to save).

4.  Build the TypeScript code:
    ```bash
    npm run build
    ```

5.  Initialize the Database:
    ```bash
    npx prisma migrate deploy
    npx prisma generate
    ```

6.  Create Uploads Directory:
    ```bash
    mkdir -p uploads
    ```

7.  Start the Server with PM2:
    ```bash
    pm2 start dist/index.js --name "citrux-api"
    pm2 save
    pm2 startup
    # Follow the instructions output by the startup command to persistence
    ```

---

## Step 6: Frontend Deployment

1.  Navigate to the client directory:
    ```bash
    cd ~/citrux-hrms/client
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Build the project:
    ```bash
    npm run build
    ```
    This will create a `dist` folder containing the static files.

---

## Step 7: Configure Nginx

We will configure Nginx to serve the React frontend and reverse-proxy API requests to the Node.js backend.

1.  Create a new Nginx configuration file:
    ```bash
    sudo nano /etc/nginx/sites-available/citrux
    ```

2.  Paste the following configuration (replace `your_domain_or_ip`):

    ```nginx
    server {
        listen 80;
        server_name <your-ec2-public-ip-or-domain>;

        root /home/ubuntu/citrux-hrms/client/dist;
        index index.html;

        # Frontend - Support React Router
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Backend API Proxy
        location /api/ {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Serve Uploaded Files
        location /uploads/ {
            alias /home/ubuntu/citrux-hrms/server/uploads/;
        }
    }
    ```

3.  Enable the configuration:
    ```bash
    sudo ln -s /etc/nginx/sites-available/citrux /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default
    ```

4.  Test and Restart Nginx:
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

Now, navigating to your EC2 Public IP in a browser should show the application!

---

## Step 8: SSL Configuration (Optional but Recommended)

If you have a customized domain pointing to this IP:

1.  Install Certbot:
    ```bash
    sudo apt install -y certbot python3-certbot-nginx
    ```

2.  Generate SSL Certificate:
    ```bash
    sudo certbot --nginx -d yourdomain.com
    ```

---

## Updating the Application

When you have new changes to deploy:

**Backend:**
```bash
cd ~/citrux-hrms/server
git pull
npm install
npm run build
npx prisma migrate deploy
pm2 restart citrux-api
```

**Frontend:**
```bash
cd ~/citrux-hrms/client
git pull
npm install
npm run build
# No restart needed for Nginx, as it serves static files
```
