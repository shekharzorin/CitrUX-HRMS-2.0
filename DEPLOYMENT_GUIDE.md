# Citrux HRMS - Production Architecture & Deployment Guide

This document reflects the finalized, current production architecture for the Citrux HRMS system. It replaces all older guides (e.g. Vercel/Neon) to accurately reflect the live environment.

## 🏛️ System Architecture

1. **Frontend Host**: Render Static Site (`citrux-hrms-client`)
2. **Backend API Host**: Render Web Service (`citrux-hrms-api`)
3. **Database**: Supabase PostgreSQL (`aws-1-ap-south-1` region)
4. **Media Storage**: Cloudinary
5. **DNS & Custom Domains**: Hostinger (`portal.citrux.in`, `portal.isnap.in`)

---

## 🚀 How Deployment Works

The entire project is deployed automatically via **Render Blueprints**. 
We use the `render.yaml` file in the root directory to define the deployment.

When you push code to the `main` branch on GitHub:
1. Render automatically pulls the latest code.
2. Render builds the `citrux-hrms-api` service, generates the Prisma client, and starts the Node server.
3. Render builds the `citrux-hrms-client` static site using Vite and publishes the `dist/` directory, while applying SPA routing (`/* -> /index.html`).

---

## ⚙️ Environment Variables & Secrets

**IMPORTANT: Render Blueprints (`render.yaml`) do NOT automatically update existing secrets on the dashboard.**
If you need to change a sensitive variable like `DATABASE_URL` or `CLIENT_URL` in production, you must update it directly in the Render Dashboard under the `Environment` tab of the specific service.

### Backend (`citrux-hrms-api`) Environment Setup
| Variable | Value / Format | Note |
|---|---|---|
| `NODE_ENV` | `production` | Required |
| `DATABASE_URL` | `postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true` | Uses the port 6543 transaction pooler. Must not contain quotes! |
| `DIRECT_URL` | `postgresql://...pooler.supabase.com:5432/postgres` | Uses port 5432 for migrations. |
| `CLIENT_URL` | `https://citrux-hrms-client.onrender.com,https://portal.citrux.in,https://portal.isnap.in` | Required for CORS. Note the comma-separated domains. |
| `JWT_SECRET` | *(Your secret key)* | Used for login tokens |
| `CLOUDINARY_*` | *(Your cloudinary keys)* | Permanent file/profile photo storage |

### Frontend (`citrux-hrms-client`) Environment Setup
| Variable | Value / Format | Note |
|---|---|---|
| `VITE_API_URL` | `https://citrux-hrms-api.onrender.com/api` | Points to the backend API |

---

## 🌐 Custom Domains & CORS

If you ever add a new tenant domain (like `company.citrux.in`), you must do two things:
1. Add the domain in the Render Dashboard to the `citrux-hrms-client` Static Site.
2. Add the domain to the `CLIENT_URL` environment variable on the `citrux-hrms-api` Backend Service so the server does not block it via CORS.

---

## 🛠️ Local Development

To develop locally, ensure your `server/.env` looks like this:
```env
DATABASE_URL="postgresql://... (same as Render)"
DIRECT_URL="postgresql://... (same as Render)"
CLIENT_URL="http://localhost:5173"
PORT=5000
```
Then run:
- Backend: `npm run dev` in the `/server` folder
- Frontend: `npm run dev` in the `/client` folder
