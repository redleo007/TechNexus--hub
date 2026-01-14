# Quick Deployment Guide - TechNexus to Netlify & Render

## Prerequisites
- GitHub account with your repository pushed
- Netlify account (https://netlify.com)
- Render account (https://render.com)
- Supabase account with database configured (https://supabase.com)

---

## STEP 1: Prepare Your Code

### 1.1 Push to GitHub
```bash
git add .
git commit -m "Deploy configuration"
git push origin main
```

### 1.2 Verify Configuration Files
Ensure these files exist in your repo root:
- ✅ `netlify.toml` - Netlify configuration
- ✅ `render.yaml` - Render configuration
- ✅ `DEPLOYMENT_GUIDE.md` - Full documentation

---

## STEP 2: Deploy Backend to Render

### 2.1 Create Render Service
1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Select your GitHub repository
4. Select branch: **main**

### 2.2 Configure Backend Service
Fill in these details:

| Field | Value |
|-------|-------|
| **Name** | `technexus-backend` |
| **Environment** | `Node` |
| **Region** | Choose closest to your users |
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

### 2.3 Add Environment Variables
Click **"Add Environment Variable"** for each:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `SUPABASE_URL` | (Get from Supabase dashboard) |
| `SUPABASE_KEY` | (Get from Supabase dashboard) |

### 2.4 Deploy
- Click **"Create Web Service"**
- Wait for deployment to complete
- **Copy your Render backend URL** (looks like: `https://technexus-backend.onrender.com`)

---

## STEP 3: Deploy Frontend to Netlify

### 3.1 Connect Repository
1. Go to https://netlify.com and sign in
2. Click **"New site from Git"**
3. Click **"GitHub"**
4. Select your repository: `TechNexus--hub`
5. Select branch: **main**

### 3.2 Configure Build Settings
When Netlify shows build configuration:

| Field | Value |
|-------|-------|
| **Base directory** | (leave empty) |
| **Build command** | `cd frontend && npm run build` |
| **Publish directory** | `frontend/dist` |

### 3.3 Add Environment Variables
1. Click **"Deploy site"** first (it may fail - that's OK)
2. After deployment, go to **"Site settings"** → **"Build & deploy"** → **"Environment"**
3. Click **"Add environment variable"**
4. Add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://technexus-backend.onrender.com` |

*Replace with your actual Render URL from Step 2.4*

### 3.4 Trigger Rebuild
1. Go to **"Deployments"**
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for build to complete

---

## STEP 4: Test Your Deployment

### 4.1 Test Backend
```bash
curl https://technexus-backend.onrender.com/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-14T..."}
```

### 4.2 Test Frontend
1. Visit your Netlify URL (shown in Netlify dashboard)
2. Should see your app loaded
3. Check browser console for any errors

### 4.3 Test API Connection
1. In your app, try any API action (e.g., loading events)
2. Open browser DevTools → Network tab
3. You should see API requests to your Render backend

---

## Troubleshooting

### Backend won't start
**Check:**
- Render logs: Dashboard → Select service → Logs
- All environment variables are set correctly
- Supabase URL and KEY are valid

**Fix:** Go to Render service settings → Environment → re-enter variables

### Frontend shows "API not responding"
**Check:**
- `VITE_API_URL` is correctly set in Netlify
- Backend is running (test with health check)
- Browser console for CORS errors

**Fix:** Verify Render URL is correct and accessible

### Build failures
**Check:**
- Build logs in respective dashboards
- All npm scripts exist in package.json
- Node version compatibility (18+)

**Fix:** Review error logs and ensure dependencies are installed

### Supabase connection errors
**Check:**
- SUPABASE_URL and SUPABASE_KEY are correct
- Database tables exist (run migrations if needed)
- CORS is enabled in Supabase

**Fix:** Verify keys in Supabase Settings → API

---

## Continuous Deployment

From now on:
1. **Make code changes** in your local repo
2. **Push to GitHub**: `git push origin main`
3. **Netlify & Render** automatically rebuild and deploy
4. Your app updates automatically! 🚀

---

## URLs After Deployment

| Component | URL |
|-----------|-----|
| **Frontend** | https://[your-netlify-site].netlify.app |
| **Backend API** | https://technexus-backend.onrender.com/api |
| **Health Check** | https://technexus-backend.onrender.com/health |

---

## Need Help?

See detailed documentation in: `DEPLOYMENT_GUIDE.md`

Key files:
- Backend config: `backend/package.json`
- Frontend config: `frontend/package.json`, `frontend/vite.config.ts`
- Deployment configs: `netlify.toml`, `render.yaml`
