# Domain Attachment Report - Static/API Split Configuration
Date: 2025-08-18 21:36 UTC

## Current Status
⚠️ **Manual configuration required in Replit Deployments UI**

## Target Domain Mapping

### Static Deployment (Frontend)
- **Domain**: `https://creaitives-platform-2-0.replit.app`
- **Type**: Static Deployment
- **Content**: SPA from `dist/public/`
- **Status**: ⏳ Needs to be created and configured
- **Compute**: $0 (CDN only)

### Autoscale Deployment (API)
- **Domain**: `https://creaitives-platform-2-0-api.replit.app` (system URL)
- **Type**: Autoscale Deployment  
- **Content**: API endpoints only (`/api/*`, `/healthz`)
- **Status**: ⏳ Needs domain detachment and env configuration
- **Compute**: 1 vCPU / 2 GiB RAM (unchanged)

## Required Actions in Replit UI

### Step 1: Detach Public Domain from Autoscale
1. Go to Autoscale deployment settings
2. Find `creaitives-platform-2-0.replit.app` in domains
3. Click "Detach" or "Remove"
4. Note the system URL (should be `...-api.replit.app`)

### Step 2: Create Static Deployment
1. Click "New Deployment" → Select "Static"
2. Build command: `VITE_PublicApiBaseUrl=https://creaitives-platform-2-0-api.replit.app npm run build`
3. Publish directory: `dist/public`
4. Add rewrite: `/* → /index.html`

### Step 3: Attach Domain to Static
1. In Static deployment settings
2. Add domain: `creaitives-platform-2-0.replit.app`
3. Wait for DNS propagation

## Verification Checklist
- [ ] Public URL shows SPA (not API 404 message)
- [ ] API accessible at system URL
- [ ] Cross-origin requests work
- [ ] Authentication flows properly
- [ ] Deep links work (SPA rewrite active)

## DNS Propagation Note
Domain changes may take up to 48 hours to fully propagate, though typically complete within minutes for `.replit.app` domains.