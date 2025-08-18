# Migration Plan Phase 2 - Static Deployment Split

## Current State Analysis

### Phase 1 Artifacts Validation ✅
- ✅ `client/src/bootstrap/patchFetchWithPublicApiBaseUrl.ts` - API patching utility ready
- ✅ `server/middleware/enforceCorsForStaticOrigin.ts` - CORS middleware created (not enabled yet)
- ✅ `/healthz` endpoint available (returns 200 OK)  
- ✅ `.env.example` includes `VITE_PublicApiBaseUrl` and `Allowed_Web_Origins`

### Current Architecture
- **Client Entry**: `client/src/main.tsx`
- **Build Output**: `dist/public` (configured in `vite.config.ts`)
- **Server Static Handlers**:
  - Development: Vite middleware via `setupVite()` in `server/vite.ts`
  - Production: `serveStatic()` serves from `dist/public` with index.html fallback
  - Static assets: `express.static('public')` in `server/index.ts`

### Current Autoscale Configuration (Read-Only)
- **Compute**: 1 vCPU / 2 GiB RAM
- **Max Instances**: 1
- **Status**: No changes planned to autoscale settings

### Proposed Domains
- **Static Frontend**: `<STATIC_STAGING_URL>` → Zero-compute static hosting
- **API Backend**: `<CURRENT_REPL_URL>` → Existing autoscale deployment

## Implementation Plan

### Phase 2A: Staging Setup
1. **Build Static Artifact**: `npm run build` → `dist/public`
2. **Create Static Deployment**: Configure with SPA rewrite `/* → /index.html`
3. **Wire Cross-Origin**: 
   - Static build: `VITE_PublicApiBaseUrl=<API_URL>`
   - API server: `Allowed_Web_Origins=<STATIC_URL>`
4. **Enable CORS Middleware**: Mount `enforceCorsForStaticOrigin()` in Express app

### Phase 2B: Server Cleanup  
5. **Remove SPA Hosting**: Strip `serveStatic()` and express.static for SPA files
6. **API-Only Mode**: Keep only `/api/*` routes, return 404 for non-API paths

### Phase 2C: Production
7. **Production Domains**: Map custom domains and update environment variables
8. **Monitoring**: Verify reduced compute load and maintained functionality

## Files to Modify

### Modified Files
- `server/index.ts` - Enable CORS middleware, remove SPA hosting
- `server/vite.ts` - Remove production static serving (optional optimization)  
- `.env.example` - Update with production domain placeholders

### Documentation Files
- `Migration_Plan_Phase2.md` (this file)
- `Phase2_Change_Summary.md` - Implementation summary and rollback steps

## Risk Assessment

### Low Risk
- ✅ CORS middleware already tested in Phase 1
- ✅ Bootstrap utility tested and ready
- ✅ All API calls use relative `/api` paths

### Medium Risk
- Server-side routing changes (mitigated by preserving `/api/*` handlers)
- Cross-origin authentication flows (cookies must work across subdomains)

### Rollback Plan
1. **Immediate Rollback**:
   - Disable CORS middleware: Remove or comment out `app.use(enforceCorsForStaticOrigin())`
   - Re-enable SPA hosting: Restore `serveStatic(app)` in production branch
   - Clear VITE_PublicApiBaseUrl: Rebuild static with empty value

2. **Full Rollback**:
   - Revert commits: `git revert HEAD~4` (undo Phase 2 commits)
   - Domain rollback: Switch custom domains back to monolith
   - Environment reset: Clear all Phase 2 environment variables

## Success Metrics
- ✅ Static deployment serves SPA with zero compute cost
- ✅ API calls work cross-origin with proper CORS headers
- ✅ Deep-link refresh works via SPA rewrite rule
- ✅ Non-API requests to API server return 404 (expected behavior)
- ✅ Authentication flows work across domains
- ✅ Reduced compute load on autoscale deployment

## Testing Checklist
- [ ] Static staging URL renders complete application
- [ ] All app features functional from static → API domain
- [ ] Deep-link refresh works (SPA rewrite active)
- [ ] CORS allows staging origin, blocks unauthorized origins
- [ ] API server returns 404 for non-API paths (after cleanup)
- [ ] Health endpoint accessible: `GET /healthz` → `200 OK`
- [ ] Production domains wired with correct environment variables

---
*Plan Created: 2025-08-18*  
*Current Phase: 2A - Staging Setup*