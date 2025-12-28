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
    - **Root Directory**: `server`
    - **Build Command**: `npm install && npm run build`
    - **Start Command**: `node dist/index.js`
5.  **Environment Variables** (Add ALL of these):
    - `DATABASE_URL`: *(Value from Step 1)*
    - `JWT_SECRET`: *(Random password)*
    - `NODE_ENV`: `production`
    - `CLOUDINARY_CLOUD_NAME`: *(Value from Step 2)*
    - `CLOUDINARY_API_KEY`: *(Value from Step 2)*
    - `CLOUDINARY_API_SECRET`: *(Value from Step 2)*
6.  Click **Create Web Service**.
7.  Wait for deployment. Copy your **Backend URL** (`https://xxx.onrender.com`).

---

## 4. Frontend Deployment (Vercel)
1.  Go to [Vercel.com](https://vercel.com) and Sign Up.
2.  **Add New Project** -> Import `hrms` repo.
3.  **Root Directory**: Click Edit -> Select `client`.
4.  **Environment Variables**:
    - `VITE_API_URL`: `https://YOUR-RENDER-URL.onrender.com/api`
    - *IMPORTANT*: Make sure to add `/api` at the end.
5.  Click **Deploy**.

---

## Troubleshooting
- **Frontend Error "<"**: Means Vercel can't reach Render. Check your `VITE_API_URL` variable in Vercel.
- **Backend Error "Module not found"**: We fixed this by moving Prisma to the default location.
- **Uploads not working**: Check your Cloudinary Env Vars in Render.
