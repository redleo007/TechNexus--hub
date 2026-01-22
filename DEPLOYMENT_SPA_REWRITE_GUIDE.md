# SPA Rewrite Configuration Guide

## Purpose
This guide explains how to configure Single Page Application (SPA) rewrites to prevent white screens when users directly access deep-link URLs or refresh pages in the TechNexus application.

## Problem
Single Page Applications (SPAs) like this React app use client-side routing. When users:
- Directly navigate to a URL like `https://yourapp.com/dashboard`
- Refresh the page on any route other than `/`

The web server looks for a file at that path, doesn't find it, and returns a 404 error (white screen).

## Solution
Configure the web server to rewrite all non-API routes to serve `/index.html`, allowing React Router to handle the routing.

## Configuration by Platform

### Vercel
The `vercel.json` file is already configured with the necessary rewrites:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://technexus-backend.onrender.com/api/:path*"
    },
    {
      "source": "/health",
      "destination": "https://technexus-backend.onrender.com/health"
    },
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

**Key Points:**
- API routes are proxied to the backend
- Health check endpoint is proxied
- **All other routes** (`:path*`) are rewritten to `/index.html` for SPA handling
- Order matters: specific routes before catch-all

### Netlify
The `netlify.toml` file is already configured:

```toml
# SPA fallback for React Router
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  conditions = { Role = ["visitor"] }
```

Additionally, `frontend/public/_redirects`:
```
/*    /index.html   200
```

### Other Platforms

#### AWS S3 + CloudFront
In CloudFront, configure error responses:
- For 403 and 404 errors
- Response page path: `/index.html`
- HTTP response code: 200

#### Nginx
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

#### Apache (.htaccess)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

## Testing
After configuration, test the following:
1. Navigate to `https://yourapp.com/dashboard` directly
2. Navigate to `https://yourapp.com/events` and refresh
3. Navigate to `https://yourapp.com/participants` and refresh
4. Ensure all routes load correctly without white screens

## Environment Variables
Ensure `VITE_API_URL` is properly set in your deployment platform:
- Vercel: Set in `vercel.json` or dashboard
- Netlify: Set in `netlify.toml` or dashboard
- Default fallback: `/api` (uses relative paths)

## Troubleshooting
If you still see white screens:
1. Check browser console for errors
2. Verify API calls are reaching the backend
3. Check network tab for 404 errors
4. Ensure build artifacts are in the correct output directory
5. Verify the rewrite/redirect configuration is active

## Related Files
- `/vercel.json` - Vercel configuration
- `/netlify.toml` - Netlify configuration
- `/frontend/public/_redirects` - Netlify redirects fallback
- `/frontend/src/api/client.ts` - API base URL configuration
