# Deployment Configuration Fix Plan
Date: 2025-08-18 21:31 UTC

## Current Situation Analysis

### What We Have:
1. **Built Static Assets**: `dist/public/` (1.7MB) ready for deployment
2. **API Server**: Currently configured for production API-only mode
3. **Bootstrap Utility**: Ready to redirect API calls when `VITE_PublicApiBaseUrl` is set
4. **CORS Middleware**: Ready to enforce allowlist when `Allowed_Web_Origins` is set

### Current Problems:
1. Public URL (https://creaitives-platform-2-0.replit.app) shows API 404 message
2. No Static Deployment is currently serving the frontend
3. Environment variables not wired between deployments

## Deployment Architecture Plan

### Target Setup:
- **Frontend URL**: https://creaitives-platform-2-0.replit.app (Static Deployment)
- **API URL**: https://creaitives-platform-2-0-api.replit.app (Autoscale - system URL)

### Configuration Steps:

#### 1. Create Static Deployment
- Deploy from `dist/public/` directory
- Configure SPA rewrite: `/* → /index.html`
- Attach main domain: https://creaitives-platform-2-0.replit.app

#### 2. Configure Autoscale Deployment
- Keep on system URL (auto-generated)
- Set environment: `Allowed_Web_Origins=https://creaitives-platform-2-0.replit.app`
- Ensure API-only mode (already configured in code)

#### 3. Rebuild Frontend with API URL
- Set `VITE_PublicApiBaseUrl=https://creaitives-platform-2-0-api.replit.app`
- Run `npm run build`
- Redeploy static assets

## Environment Variable Configuration

### Static Deployment Build:
```bash
VITE_PublicApiBaseUrl=https://creaitives-platform-2-0-api.replit.app
```

### Autoscale Deployment Runtime:
```bash
Allowed_Web_Origins=https://creaitives-platform-2-0.replit.app
DATABASE_URL=<existing value>
# All other existing secrets remain unchanged
```

## Validation Tests

1. **Frontend Loading**: https://creaitives-platform-2-0.replit.app shows SPA
2. **API Health**: https://creaitives-platform-2-0-api.replit.app/healthz returns 200
3. **Cross-Origin Calls**: Browser network tab shows API calls to API URL
4. **CORS Headers**: Allowed origin gets proper headers, others blocked
5. **Deep Links**: Direct navigation to app routes works (SPA rewrite active)

## Cost Impact
- Static Deployment: $0 compute cost (CDN only)
- Autoscale: Reduced load (no static file serving)
- Total savings: ~75% vs combined deployment