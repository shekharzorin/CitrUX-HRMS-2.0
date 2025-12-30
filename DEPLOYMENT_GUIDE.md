# Citrux HRMS - Easy Deployment Guide

This guide is designed for exactly what you need: **Free Hosting, No Credit Card, 10 minutes setup.**

We use 4 services. All are free.
1.  **Neon** (Database)
2.  **Cloudinary** (File Storage)
3.  **Render** (Backend Server)
4.  **Vercel** (Frontend Website)

---

## Step 1: Get Your Keys (Do this first)

### 1. Database (Neon.tech)
1.  Sign up at [Neon.tech](https://neon.tech).
2.  Create a Project called `hrms`.
3.  Copy the **Connection String** from the dashboard.
    *   It looks like: `postgres://neondb_owner:AbCd123...@ep-cool-frog.aws.neon.tech/neondb...`
    *   **IMPORTANT**: If the string usually starts with `psql`, **DELETE** the `psql` part. It MUST start with `postgres://` or `postgresql://`.

### 2. File Storage (Cloudinary)
1.  Sign up at [Cloudinary.com](https://cloudinary.com).
2.  Go to the "Dashboard".
3.  Copy these 3 things from the top:
    *   **Cloud Name** (e.g., `dxy...`)
    *   **API Key** (e.g., `8372...`)
    *   **API Secret** (e.g., `a7_...`)

---

## Step 2: Deploy Backend (Render)

1.  Sign up at [Render.com](https://render.com).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub Account and select the `hrms` repository.
4.  **Scroll down to Settings**:
    *   **Name**: `citrux-api` (or anything you want)
    *   **Region**: `Singapore` (closest to India) or `Frankfurt`.
    *   **Root Directory**: `server`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `node dist/index.js`
    *   **Instance Type**: `Free`
5.  **Environment Variables** (Click "Add Environment Variable" for each one):
    *   `NODE_ENV` = `production`
    *   `JWT_SECRET` = `type_any_random_long_password_here`
    *   `DATABASE_URL` = *(Paste your Neon Connection String from Step 1)*
    *   `CLOUDINARY_CLOUD_NAME` = *(Paste Cloud Name from Step 1)*
    *   `CLOUDINARY_API_KEY` = *(Paste API Key from Step 1)*
    *   `CLOUDINARY_API_SECRET` = *(Paste API Secret from Step 1)*
6.  Click **Create Web Service**.
7.  Wait 2-3 minutes. It will say "Live".
8.  **Copy the Backend URL** at the top left (e.g., `https://citrux-api.onrender.com`).
9.  **Initial Setup (First Time Only)**:
    *   Go to the **"Shell"** tab in your Render service dashboard.
    *   Type this command to create tables: `npx prisma db push`
    *   Type this command to fill sample data: `npx prisma db seed`
    *   *Note: This creates the default admin user.*

---

## Step 3: Deploy Frontend (Vercel)

1.  Sign up at [Vercel.com](https://vercel.com).
2.  Click **Add New...** -> **Project**.
3.  Import the `hrms` repository.
4.  **Project Settings**:
    *   **Framework Preset**: `Vite` (It should detect this automatically).
    *   **Root Directory**: Click "Edit" and select `client`.
5.  **Environment Variables**:
    *   **Key**: `VITE_API_URL`
    *   **Value**: *(Paste your Render Backend URL from Step 2)*
        *   👉 **IMPORTANT**: Add `/api` at the end.
        *   Example: `https://citrux-api.onrender.com/api`
6.  Click **Deploy**.
7.  Wait 1 minute. Click the Image of your site to launch it!

---

## FAQ (Common Errors)7JHNJHGFDSAGTYYHJUYHTGRR

**Q: I see "Unexpected token '<'" when logging in.**
A: Your `VITE_API_URL` in Vercel is wrong. It must end with `/api`. Go to Vercel Settings -> Environment Variables, fix it, and Redeploy.

**Q: I see "Module not found" in Render logs.**
A: We fixed this! Just click "Manual Deploy" -> "Clear cache and deploy" in Render if it happens.

**Q: My profile picture disappears after 15 minutes.**
A: This happens if you didn't add the usage `CLOUDINARY_...` variables in Render. Add them and the app will use Cloudinary for permanent storage.
