# Static Deployment Configuration Instructions
Date: 2025-08-18 21:32 UTC

## Frontend Build Status
✅ **Build Complete**: Frontend rebuilt with cross-origin API configuration
- Build output: `dist/public/` (1.4MB JavaScript, 108KB CSS)
- API URL embedded: `https://creaitives-platform-2-0-api.replit.app`

## Required Deployment Steps in Replit UI

### 1. Create Static Deployment
1. Open the **Deployments** pane in your Replit workspace
2. Click **"New deployment"** 
3. Select **"Static"** as the deployment type
4. Configure as follows:
   - **Build command**: `VITE_PublicApiBaseUrl=https://creaitives-platform-2-0-api.replit.app npm run build`
   - **Publish directory**: `dist/public`
   - **Rewrite rules**: Add `/* → /index.html` (for SPA routing)
5. Click **Deploy**

### 2. Attach Domain to Static Deployment
1. Once Static deployment is created, go to its **Settings**
2. Under **Domains**, find the public URL section
3. Attach: `https://creaitives-platform-2-0.replit.app`
4. If currently attached to Autoscale, detach it first from Autoscale settings

### 3. Configure Autoscale Deployment
1. Go to your existing **Autoscale deployment** 
2. In **Settings** → **Environment Variables**, add:
   ```
   Allowed_Web_Origins=https://creaitives-platform-2-0.replit.app
   ```
3. Keep all other existing environment variables (DATABASE_URL, etc.)
4. The Autoscale deployment will use its system URL: `https://creaitives-platform-2-0-api.replit.app`

### 4. Domain Configuration Summary
After setup:
- **Frontend**: `https://creaitives-platform-2-0.replit.app` → Static Deployment
- **API**: `https://creaitives-platform-2-0-api.replit.app` → Autoscale Deployment

## Verification Steps
1. Visit `https://creaitives-platform-2-0.replit.app` - should show your app
2. Open browser DevTools Network tab - API calls should go to `...-api.replit.app`
3. Test login and features - everything should work with cross-origin setup

## Important Notes
- The frontend is already built with the API URL
- CORS middleware is ready in the backend code
- Bootstrap utility will automatically redirect API calls
- Static deployment uses $0 compute (CDN only)