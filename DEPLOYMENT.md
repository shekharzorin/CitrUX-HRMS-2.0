# Citrux HRMS - Deployment Guide (No Credit Card)

This guide shows you how to deploy Citrux HRMS for **free** using services that do **not** require a credit card:
1.  **Neon.tech**: Database (PostgreSQL)
2.  **Render**: Backend API
3.  **Vercel**: Frontend UI

---

## Step 1: Database Setup (Neon.tech)

1.  Go to [Neon.tech](https://neon.tech) and sign up (Free).
2.  Create a new **Project**.
3.  It will show you a **Connection String** that looks like: `postgres://user:password@ep-xyz.aws.neon.tech/neondb...`
4.  **Copy this string**. We will need it later.

---

## Step 2: Backend Deployment (Render)

1.  Go to [Render.com](https://render.com) and sign up (Free).
2.  Click **New +** -> **Web Service**.
3.  Connect your **GitHub Repository**.
4.  Select the `server` directory (if asked for Root Directory).
5.  **Settings**:
    - **Name**: `citrux-api`
    - **Runtime**: `Node`
    - **Build Command**: `npm install && npm run build`
    - **Start Command**: `node dist/index.js`
6.  **Environment Variables** (Add these):
    - `DATABASE_URL`: *Paste your Neon Connection String mostly here*
    - `JWT_SECRET`: *Any random secret password*
    - `NODE_ENV`: `production`
7.  Click **Create Web Service**.
8.  Wait for it to deploy. Once done, copy your **Backend URL** (e.g., `https://citrux-api.onrender.com`).

---

## Step 3: Frontend Deployment (Vercel)

1.  Go to [Vercel.com](https://vercel.com) and sign up (Free).
2.  Click **Add New...** -> **Project**.
3.  Import your **GitHub Repository**.
4.  **Configure Project**:
    - **Framework Preset**: `Vite`
    - **Root Directory**: Click `Edit` and select `client`.
5.  **Environment Variables**:
    - `VITE_API_URL`: *Paste your Render Backend URL* (e.g., `https://citrux-api.onrender.com/api`) -> **IMPORTANT**: Add `/api` at the end.
6.  Click **Deploy**.

---

## Final Step: Connect Them

1.  Go back to your **server** code in GitHub (or on your computer).
2.  Look at `client/vercel.json`. Update the `destination` URL to match your real Render backend if you want Vercel to proxy requests (optional, but good for avoiding CORS).
    ```json
    "destination": "https://YOUR-REAL-APP-NAME.onrender.com/api/$1"
    ```
3.  Push that change to GitHub.

---

## Important Limitations (Free Tier)

- **Sleeping Server**: Render's free server goes to sleep after 15 minutes of inactivity. The first time you open the app, it might take **30-60 seconds** to wake up. This is normal.
- **Uploads**: Since Render's filesystem is ephemeral/temporary, **any profile photos or documents you upload will be DELETED** when the server restarts. To fix this, you would need to integrate a cloud storage service like Cloudinary in the future.
