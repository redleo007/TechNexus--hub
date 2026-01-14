# TechNexus Deployment Checklist

## Pre-Deployment Tasks

- [ ] Code is committed and pushed to GitHub
- [ ] All environment variables are documented
- [ ] Database migrations are ready (SUPABASE_SETUP.sql)
- [ ] Supabase project is created and running
- [ ] Node.js 18+ is installed locally

## Backend Deployment (Render)

### Account & Repository Setup
- [ ] Render account created
- [ ] GitHub repository connected to Render
- [ ] Repository has public/private access configured

### Service Configuration
- [ ] Service name: `technexus-backend`
- [ ] Environment: Node
- [ ] Root directory: `backend`
- [ ] Auto-deploy enabled
- [ ] Region selected (closest to users)

### Build & Start Commands
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`

### Environment Variables (Render)
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000`
- [ ] `SUPABASE_URL` = (from Supabase dashboard)
- [ ] `SUPABASE_KEY` = (from Supabase dashboard)

### Post-Deployment Verification
- [ ] Service deployed successfully
- [ ] Logs show no errors
- [ ] Health check endpoint responds:
  ```
  curl https://[your-service].onrender.com/health
  ```
- [ ] Copy Render backend URL for frontend configuration

## Frontend Deployment (Netlify)

### Account & Repository Setup
- [ ] Netlify account created
- [ ] GitHub repository connected to Netlify
- [ ] Branch set to: `main`

### Build Configuration
- [ ] Base directory: (empty)
- [ ] Build command: `cd frontend && npm run build`
- [ ] Publish directory: `frontend/dist`

### Environment Variables (Netlify)
- [ ] `VITE_API_URL` = `https://technexus-backend.onrender.com` (or your actual Render URL)

### Post-Deployment Verification
- [ ] Site deployed successfully
- [ ] Frontend loads without errors
- [ ] API calls reach the backend
- [ ] Copy Netlify site URL for testing

## Integration Testing

- [ ] Backend health check passes
- [ ] Frontend loads in browser
- [ ] API calls from frontend work correctly
- [ ] Data displays correctly from Supabase
- [ ] Forms submit and save data
- [ ] No CORS errors in console
- [ ] No network errors in DevTools

## Database Verification

- [ ] Supabase project created
- [ ] Tables exist (events, participants, volunteers, etc.)
- [ ] Migrations applied successfully
- [ ] Row-level security policies configured
- [ ] Service role key available for backend
- [ ] Anon key available if needed

## Security Checklist

- [ ] Sensitive keys not exposed in git
- [ ] Environment variables used instead of hardcoded values
- [ ] CORS configured properly
- [ ] Backend validates all inputs
- [ ] HTTPS enabled on both services
- [ ] Rate limiting considered
- [ ] API keys rotated regularly

## Monitoring & Maintenance

- [ ] Render logs accessible and monitored
- [ ] Netlify logs accessible and monitored
- [ ] Error tracking configured (optional)
- [ ] Backup strategy for database
- [ ] Update schedule established for dependencies

## DNS & Custom Domain (Optional)

If using custom domain:
- [ ] DNS updated to point to Netlify
- [ ] SSL certificate provisioned
- [ ] Custom domain verified in Netlify
- [ ] Email redirects configured if needed

## Documentation Updates

- [ ] README.md updated with deployment URLs
- [ ] Deployment credentials stored securely
- [ ] Team informed of deployment details
- [ ] Runbook created for emergency procedures

## Final Verification

- [ ] Frontend accessible from browser
- [ ] All main features working
- [ ] No console errors
- [ ] No network errors
- [ ] Performance acceptable
- [ ] Mobile responsive design works
- [ ] All environment variables correctly set

## Post-Deployment

- [ ] Document final URLs
- [ ] Share access with team
- [ ] Create incident response plan
- [ ] Set up automated monitoring alerts
- [ ] Schedule regular backup tests
- [ ] Plan update and maintenance windows

---

## Deployment URLs

| Service | URL |
|---------|-----|
| Frontend | https://[your-netlify-site].netlify.app |
| Backend | https://technexus-backend.onrender.com |
| API Base | https://technexus-backend.onrender.com/api |
| Health Check | https://technexus-backend.onrender.com/health |

---

## Emergency Procedures

### If backend is down:
1. Check Render dashboard logs
2. Verify environment variables
3. Check Supabase service status
4. Redeploy if necessary

### If frontend build fails:
1. Check Netlify deploy logs
2. Verify all npm scripts work locally
3. Check environment variables
4. Trigger manual rebuild

### If database is inaccessible:
1. Check Supabase dashboard
2. Verify SUPABASE_URL and SUPABASE_KEY
3. Check row-level security policies
4. Contact Supabase support if needed

---

Last updated: 2024-01-14
Deployment version: 1.0
