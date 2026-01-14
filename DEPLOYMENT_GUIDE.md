# Netlify Deployment Configuration

## Frontend Deployment (Netlify)

The frontend is configured to deploy to Netlify with the following setup:

### Environment Variables Required:
```
VITE_API_URL=https://technexus-backend.onrender.com
```

### Build Settings:
- **Build command**: `cd frontend && npm run build`
- **Publish directory**: `frontend/dist`
- **Node version**: 18 or higher

### Deployment Steps:

1. **Connect Repository**
   - Go to [Netlify.com](https://app.netlify.com)
   - Click "New site from Git"
   - Select your GitHub repository (TechNexus--hub)

2. **Configure Build Settings**
   - Base directory: (leave empty - root of repo)
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/dist`

3. **Set Environment Variables**
   - In Netlify dashboard: Build & Deploy → Environment
   - Add: `VITE_API_URL` = `https://technexus-backend.onrender.com`

4. **Deploy**
   - Netlify will automatically build and deploy on push

---

## Backend Deployment (Render)

The backend is configured to deploy to Render as a Node.js web service.

### Environment Variables Required:
```
NODE_ENV=production
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Build Settings:
- **Node version**: 18 or higher
- **Build command**: `npm install && npm run build`
- **Start command**: `npm start`

### Deployment Steps:

1. **Create a Render Account**
   - Go to [Render.com](https://render.com)
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure the Service**
   - **Name**: `technexus-backend`
   - **Environment**: Node
   - **Region**: Choose nearest to your users
   - **Branch**: main

4. **Build & Start Configuration**
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm start`
   - **Root directory**: `backend`

5. **Set Environment Variables**
   - Add the following in "Environment":
     - `NODE_ENV` = `production`
     - `PORT` = `5000`
     - `SUPABASE_URL` = (get from Supabase dashboard)
     - `SUPABASE_KEY` = (get from Supabase dashboard)

6. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

---

## Update Frontend After Backend Deployment

Once Render provides your backend URL:

1. Update `VITE_API_URL` in Netlify environment variables with the Render backend URL
2. Trigger a rebuild in Netlify (or push a new commit)

---

## Database Setup

Your Supabase database is already configured. Make sure:

1. Go to [Supabase.com](https://supabase.com)
2. Create a project or use existing one
3. Run the SQL migrations from `database/SUPABASE_SETUP.sql`
4. Get your `SUPABASE_URL` and `SUPABASE_KEY`
5. Add these to both Render and Netlify environment variables

---

## Health Check

Test your backend deployment:
```
curl https://technexus-backend.onrender.com/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-14T..."}
```

---

## Troubleshooting

### Backend not connecting
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct in Render
- Check Render logs: Dashboard → Select service → Logs

### Frontend showing API errors
- Verify `VITE_API_URL` is set correctly in Netlify
- Check browser console for CORS errors
- Ensure backend is running and accessible

### Build failures
- Check build logs in respective dashboards
- Ensure all required environment variables are set
- Verify package.json scripts are correct

