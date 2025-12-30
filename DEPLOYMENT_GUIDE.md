# Citrux HRMS - Complete Deployment Guide

This guide covers the **100% Free Tier** deployment using:
- **Neon.tech**: PostgreSQL Database
- **Cloudinary**: File Storage (Images/PDFs)
- **Render**: Backend Hosting
- **Vercel**: Frontend Hosting

---

## 1. Database Setup (Neon)
1.  Go to [Neon.tech](https://neon.tech) and Sign Up.
2.  Create a **New Project**.
3.  Copy the **Connection String** (`postgres://...`).
    - *Note*: Ensure you select the **Pooled connection** checkbox if available, or just copy the main string.
4.  *Save this for Step 3.*

---

## 2. File Storage Setup (Cloudinary)
1.  Go to [Cloudinary.com](https://cloudinary.com) and Sign Up (Free).
2.  Go to your **Dashboard**.
3.  Copy these 3 values:
    - **Cloud Name**
    - **API Key**
    - **API Secret**
4.  *Save these for Step 3.*

---

## 3. Backend Deployment (Render)
1.  Go to [Render.com](https://render.com) and Sign Up.
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub Repo (`hrms`).
4.  **Settings**:
    - **Name**: `citrux-hrms-server` (or any name)
    - **Region**: Choose one close to you (e.g., Singapore, Frankfurt).
    - **Root Directory**: `server`
    - **Runtime**: `Node`
    - **Build Command**: `npm install && npx prisma generate && npm run build`
    - **Start Command**: `npx prisma migrate deploy && node dist/index.js`
        - *Note*: This command automatically runs database migrations before starting the server.
5.  **Environment Variables** (Add ALL of these):
    - `DATABASE_URL`: *(Value from Step 1 - Connection String)*
    - `JWT_SECRET`: *(Generate a strong random password)*
    - `NODE_ENV`: `production`
    - `CLOUDINARY_CLOUD_NAME`: *(Value from Step 2)*
    - `CLOUDINARY_API_KEY`: *(Value from Step 2)*
    - `CLOUDINARY_API_SECRET`: *(Value from Step 2)*
    - `NODE_VERSION`: `20`
6.  Click **Create Web Service**.
7.  Wait for deployment to finish. It should show a green "Live" badge.
8.  **Copy your Backend URL** (e.g., `https://citrux-hrms-server.onrender.com`).

### Optional: Seeding Initial Data
If you need the default Admin user (`admin@citrux.com` / `admin123`):
1.  Go to the **Shell** tab in your Render service dashboard.
2.  Run: `npx prisma db seed`

---

## 4. Frontend Deployment (Vercel)
1.  Go to [Vercel.com](https://vercel.com) and Sign Up.
2.  **Add New Project** -> Import `hrms` repo.
3.  **Project Settings**:
    - **Root Directory**: Click Edit -> Select `client`.
    - **Framework Preset**: `Vite` (should be auto-detected).
    - **Output Directory**: `dist` (should be default).
4.  **Environment Variables**:
    - `VITE_API_URL`: `https://YOUR-RENDER-URL.onrender.com/api`
        - *IMPORTANT*: You MUST add `/api` at the end of the URL.
5.  Click **Deploy**.

---

## 5. Verification
1.  Open your **Vercel App URL**.
2.  Try to Log In.
    - If you seeded the DB: Use `admin@citrux.com` / `admin123`.
    - If not: Sign Up a new user.
3.  **Test Uploads**: Go to "My Profile" or "Documents" and try uploading a generic image. If it works, Cloudinary is set up correctly.

---

## Troubleshooting
- **Backend Build Failed**: Check the "Logs" tab in Render.
    - If needed, clear build cache and redeploy.
- **Frontend "Network Error" or Nothing Happens**:
    - Check the browser console (F12).
    - If you see `404 Not Found` for API calls, verify `VITE_API_URL` has `/api` at the end.
    - If you see `CORS` errors, the backend might be blocking the request (though we allowed all origins `*`).
- **Database Errors**:
    - Ensure `DATABASE_URL` is correct in Render.
    - Run `npx prisma migrate deploy` in the Render Shell manually if the start command didn't fix it.
