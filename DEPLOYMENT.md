# Deploying Checkpoint

This guide covers deploying the Checkpoint app (React frontend + FastAPI backend) to production.

## Overview

- **Frontend**: React + Vite → deploy to **Vercel** or **Netlify**
- **Backend**: FastAPI → deploy to **Railway**, **Render**, or **Fly.io**
- **Database & Auth**: Already on Supabase (no changes needed)

---

## 1. Deploy the Backend

### Railway (recommended)

1. Go to [railway.app](https://railway.app) and create a project.
2. **Add a new service** → "Deploy from GitHub repo" → select your repo.
3. Keep **Root Directory** empty (use repo root).
4. Set **Build Command**: `pip install -r backend/requirements.txt`
5. Set the **Start Command**:
   ```
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
6. Add **Environment Variables** (from `.env`):
   - `DATABASE_URL`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_PROJECT_REF`
   - `RAWG_API_KEY`
   - `STEAM_API_KEY`
   - `STEAMGRIDDB_API_KEY`
   - `FRONTEND_URL` = your frontend URL (e.g. `https://checkpoint.vercel.app`)
7. Railway will assign a URL like `https://your-app.railway.app`. Note this for the frontend.

### Render

1. Go to [render.com](https://render.com) → New → Web Service.
2. Connect your repo, set **Root Directory** to `backend`.
3. **Build Command**: `pip install -r requirements.txt` (create one if missing)
4. **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Add the same environment variables as above.
6. Note your backend URL (e.g. `https://checkpoint-api.onrender.com`).

---

## 2. Deploy the Frontend

### Vercel

1. Go to [vercel.com](https://vercel.com) → Import your repo.
2. Set **Root Directory** to `frontend` (so build runs from the frontend folder).
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `dist`
5. Add **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` = your backend URL (e.g. `https://your-app.railway.app`)
6. Deploy. Vercel will give you a URL like `https://checkpoint.vercel.app`.

### Netlify

1. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git.
2. Set **Base directory** to `frontend`.
3. **Build command**: `npm run build`
4. **Publish directory**: `dist`
5. Add the same environment variables as Vercel.
6. Deploy.

---

## 3. Supabase Configuration

In your Supabase project:

1. **Authentication → URL Configuration**:
   - **Site URL**: your frontend URL (e.g. `https://checkpoint.vercel.app`)
   - **Redirect URLs**: add `https://checkpoint.vercel.app/**` (and any custom domains)

2. Your database and JWT secret stay the same; no migration needed.

---

## 4. Quick Checklist

- [ ] Backend deployed with all env vars
- [ ] `FRONTEND_URL` set on backend (for CORS)
- [ ] Frontend deployed with `VITE_API_URL` pointing to backend
- [ ] Supabase redirect URLs updated
- [ ] Test login, API calls, and Steam achievements

---

## 5. Optional: Single Domain (advanced)

To serve both frontend and API from one domain (e.g. `api.checkpoint.app` and `checkpoint.app`), use Vercel rewrites or a reverse proxy. The current setup works with separate domains.
