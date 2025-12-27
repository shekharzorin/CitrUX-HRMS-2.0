# Citrux HRMS - Deployment Guide (Lifetime Free Tier)

This guide shows you how to deploy the Citrux HRMS application for **free** on a cloud VPS (Virtual Private Server) using the automated scripts we've created.

## Recommended Free Provider
**Oracle Cloud "Always Free" Tier**
- **Resources**: ARM Ampere A1 Compute (4 OCPUs, 24 GB RAM) - *Very powerful and free forever.*
- **OS**: Ubuntu 24.04 or 22.04 LTS.

---

## Phase 1: Initial Server Setup (One-Time)

### 1. Get Access to your Server
SSH into your fresh Ubuntu instance:
```bash
ssh -i /path/to/your/key.pem ubuntu@<YOUR_SERVER_IP>
```

### 2. Clone the Repository
Inside your server, clone the project code:
```bash
git clone https://github.com/shekharzorin/hrms.git ~/citrux-hrms
cd ~/citrux-hrms
```
*(If the repo is private, you'll need to use a Personal Access Token or SSH keys to clone)*

### 3. Run the Setup Script
We have created a magic script that installs **Node.js, Nginx, PM2, and configures the Firewall** for you.
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 4. Configure Domain & Nginx
This script generates the correct Nginx configuration to serve your site and proxy the API.
```bash
chmod +x scripts/nginx-conf-gen.sh
./scripts/nginx-conf-gen.sh
```
- Enter your **Domain Name** (e.g., `hrms.mycompany.com`) or **Public IP** if you don't have a domain.
- Say **Yes (y)** to SSL setup if you have a domain name connected.

### 5. Setup Environment Variables
Create the production environment file:
```bash
cd ~/citrux-hrms/server
cp .env.example .env
nano .env
```
- **IMPORTANT**: Change `JWT_SECRET` to a random long string.
- You can keep `DATABASE_URL="file:./dev.db"`.

### 6. Start the App Manually (First Time)
To make sure everything is working:
```bash
# Build & Start Backend
npm install
npm run build
npx prisma migrate deploy
pm2 start dist/index.js --name "citrux-api"
pm2 save
```
Now, open your browser and visit your Domain or IP. You should see the login screen!

---

## Phase 2: Automated Deployment (CI/CD)

We have included a GitHub Action (`.github/workflows/deploy.yml`) that automatically updates your server whenever you push code to the `main` branch.

### 1. Configure GitHub Secrets
Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.

Add the following secrets:

| Secret Name | Value |
| :--- | :--- |
| `HOST` | Your Server's Public IP (e.g., `123.45.67.89`) |
| `USERNAME` | Your SSH Username (usually `ubuntu` or `opc`) |
| `SSH_KEY` | The content of your private SSH key (`.pem` file). Copy the whole text including `-----BEGIN RSA PRIVATE KEY-----`. |

### 2. Trigger a Deploy
Make a change to your code on your local computer, commit, and push:
```bash
git add .
git commit -m "Testing auto deploy"
git push origin main
```
Watch the "Actions" tab in GitHub. It will login to your server, pull the code, rebuild everything, and restart the app automatically!

---

## Backup & Maintenance

### Database Backup
Your data lives in `server/prisma/dev.db`.
To backup, simply download this file:
```bash
scp -i key.pem ubuntu@<IP>:~/citrux-hrms/server/prisma/dev.db ./backup-date.db
```

### Logs
- **App Logs**: `pm2 logs citrux-api`
- **Nginx Logs**: `sudo tail -f /var/log/nginx/error.log`
