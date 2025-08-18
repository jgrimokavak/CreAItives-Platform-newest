# Static Deployment Guide - Phase 2 Setup

## Overview
This guide outlines how to deploy the application using a split architecture with static frontend hosting and separate API deployment.

## Build Configuration

### Frontend (SPA) Build
- **Build command**: `npm run build`
- **Build output directory**: `dist/public`
- **Entry point**: `client/src/main.tsx`
- **Static assets**: `client/public/`

### SPA Rewrite Rule
Configure your static host to redirect all routes to `/index.html`:
```
/* -> /index.html
```

## Deployment Architecture (Phase 2)

### Two-Domain Setup
- **Frontend (Static)**: `app.<YOUR_DOMAIN>` - Zero-compute static hosting
- **API (Autoscale)**: `api.<YOUR_DOMAIN>` - Full-compute Express server

### Environment Configuration

#### Static Build Environment
Set during build process:
```bash
VITE_PublicApiBaseUrl=https://api.<YOUR_DOMAIN>
```

#### API Server Environment
Set on the autoscale deployment:
```bash
Allowed_Web_Origins=https://app.<YOUR_DOMAIN>
```

## Phase 2 Migration Steps

1. **Deploy API Server**:
   - Deploy current codebase to autoscale with `Allowed_Web_Origins` set
   - Remove static serving middleware (optional optimization)
   - Verify health endpoint: `GET https://api.<YOUR_DOMAIN>/healthz`

2. **Build and Deploy Frontend**:
   - Set `VITE_PublicApiBaseUrl=https://api.<YOUR_DOMAIN>`
   - Run `npm run build`
   - Deploy `dist/public` contents to static hosting
   - Configure SPA rewrite rule

3. **Verify Cross-Origin Setup**:
   - Test API calls from static frontend
   - Verify CORS headers are properly set
   - Check authentication flows work across domains

## Rollback Plan
If issues occur, revert to single-domain deployment by:
1. Removing `VITE_PublicApiBaseUrl` from build environment
2. Re-enabling static serving on API server
3. Deploying combined app to single domain

## Performance Benefits
- **Reduced API Server Load**: No static file serving
- **Global CDN**: Static assets served from edge locations
- **Independent Scaling**: API and frontend scale separately
- **Cost Optimization**: Zero compute cost for static assets

## Security Notes
- CORS is strictly enforced in Phase 2
- Only whitelisted origins can make API requests
- Authentication cookies work across subdomains only

---
*Generated: 2025-08-18*