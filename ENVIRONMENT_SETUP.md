# Environment Setup Instructions

## Getting Your Supabase Credentials

### Step 1: Create or Access Supabase Project
1. Go to https://supabase.com
2. Sign in or create an account
3. Create a new project or select existing project
4. Wait for project to initialize

### Step 2: Get Your Credentials
1. In Supabase dashboard, click **"Settings"** (bottom left)
2. Click **"API"** in the sidebar
3. Find these values:

#### For Backend (Render)
- **SUPABASE_URL**: Copy the URL from "API URL" section
- **SUPABASE_KEY**: Copy the "anon public" key from "Project API keys"

### Step 3: Run Database Migrations
1. In Supabase, click **"SQL Editor"** in sidebar
2. Click **"New Query"**
3. Copy-paste the contents of `database/SUPABASE_SETUP.sql`
4. Click **"Run"**
5. Repeat for any other migrations needed:
   - `database/VOLUNTEER_ATTENDANCE.sql`
   - `database/VOLUNTEER_WORK.sql`

### Step 4: Verify Tables Created
1. In Supabase, click **"Table Editor"**
2. Verify these tables exist:
   - `events`
   - `participants`
   - `attendance`
   - `volunteers`
   - `volunteer_attendance`
   - `blocklist`
   - `settings`

---

## Environment Variables Explained

### Backend (Node.js on Render)

```env
# Node environment - should be 'production' on deployed server
NODE_ENV=production

# Port the backend runs on - Render assigns dynamically, but we set 5000
PORT=5000

# Supabase connection details
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to set:**
- Render → Select service → Settings → Environment Variables

### Frontend (React on Netlify)

```env
# API endpoint - points to your Render backend
VITE_API_URL=https://technexus-backend.onrender.com
```

**Where to set:**
- Netlify → Site settings → Build & deploy → Environment

---

## Step-by-Step Deployment Setup

### A. Prepare Supabase

1. **Create Project**
   ```
   → Go to supabase.com
   → New project
   → Wait 2-5 minutes for initialization
   ```

2. **Get Credentials**
   ```
   Settings → API
   Copy: SUPABASE_URL and anon key
   ```

3. **Run Migrations**
   ```
   SQL Editor → New Query
   Copy contents of database/SUPABASE_SETUP.sql
   Click Run
   ```

### B. Deploy Backend (Render)

1. **Create Service**
   ```
   render.com → New Web Service → Connect GitHub
   Select: TechNexus--hub repo
   ```

2. **Configure**
   ```
   Name: technexus-backend
   Environment: Node
   Root Directory: backend
   Build: npm install && npm run build
   Start: npm start
   ```

3. **Set Environment Variables**
   ```
   NODE_ENV → production
   PORT → 5000
   SUPABASE_URL → paste from Supabase
   SUPABASE_KEY → paste from Supabase
   ```

4. **Deploy**
   ```
   Click Create Web Service
   Wait for green "Live" status
   Copy your Render URL
   ```

### C. Deploy Frontend (Netlify)

1. **Connect Repository**
   ```
   netlify.com → New site from Git
   Select: GitHub → TechNexus--hub
   ```

2. **Configure Build**
   ```
   Build command: cd frontend && npm run build
   Publish directory: frontend/dist
   ```

3. **Set Environment Variables**
   ```
   VITE_API_URL → https://[your-service].onrender.com
   (Use your actual Render service URL)
   ```

4. **Deploy**
   ```
   Click Deploy site
   Wait for green "Published" status
   Your site is live!
   ```

---

## Testing Your Deployment

### 1. Test Backend Endpoint
```bash
curl https://technexus-backend.onrender.com/health
```

Expected: `{"status":"ok","timestamp":"2024-01-14T..."}`

### 2. Test Frontend
- Visit your Netlify URL
- Should see your app
- Open browser console (F12)
- No errors should appear

### 3. Test API Connection
- In the app, try loading events or data
- Open DevTools → Network tab
- See requests going to your Render backend
- Should get responses back

### 4. Test Database
- Try creating/editing data in the app
- Check Supabase Table Editor
- Data should appear in tables

---

## Troubleshooting

### "Cannot connect to API"
**Problem**: Frontend can't reach backend

**Check:**
- Is Render service running? (should show green "Live")
- Is VITE_API_URL correct in Netlify?
- Are environment variables set in Render?
- Check browser console for exact error

**Fix:**
```
1. Render dashboard → logs tab
2. Look for error messages
3. Check if process is crashing
4. Verify SUPABASE credentials
```

### "Supabase connection failed"
**Problem**: Backend can't connect to database

**Check:**
- SUPABASE_URL is correct (should start with https://xxx.supabase.co)
- SUPABASE_KEY is correct (long JWT string)
- Supabase project is running

**Fix:**
```
1. Go to Supabase Settings → API
2. Copy the EXACT values again
3. Update in Render environment variables
4. Redeploy Render service
```

### "Build failed"
**Problem**: Netlify or Render build errored

**Check:**
- Build logs in respective dashboard
- npm scripts exist in package.json
- All dependencies are listed

**Fix:**
```
1. Review build logs for error details
2. Run locally: npm run build
3. Fix any local issues
4. Push to GitHub
5. Trigger rebuild in Netlify/Render
```

### "Site works but no data shows"
**Problem**: API is working but database is empty

**Check:**
- Have you run the migrations?
- Are tables created in Supabase?
- Do you have sample data?

**Fix:**
```
1. Supabase → SQL Editor
2. Run SUPABASE_SETUP.sql
3. Go to Table Editor
4. Add sample data or import from CSV
```

---

## Important Notes

1. **Environment Variables are Secret**
   - Never commit `.env` files to GitHub
   - Always use platform environment variable settings
   - Rotate keys periodically

2. **Initial Deploy May Take 5-10 Minutes**
   - Render builds from source
   - Netlify builds frontend
   - Be patient, watch the logs

3. **Auto-Deploy on Push**
   - After initial setup, pushing to GitHub triggers automatic rebuild
   - This means your changes go live automatically!
   - Great for continuous deployment

4. **Pricing**
   - Render: Free tier available (some limitations)
   - Netlify: Free tier available (generous limits)
   - Supabase: Free tier available (for testing)
   - Check pricing for production usage

---

## Next Steps After Deployment

1. ✅ Test all features work
2. ✅ Share URLs with team
3. ✅ Set up monitoring/alerts (optional)
4. ✅ Plan regular backups
5. ✅ Document access procedures
6. ✅ Create emergency runbook

---

For more details, see:
- `QUICK_DEPLOY.md` - Step-by-step instructions
- `DEPLOYMENT_GUIDE.md` - Detailed reference
- `DEPLOYMENT_CHECKLIST.md` - Verification checklist
