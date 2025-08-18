# Migration Plan Phase 1

## Repository Scan Results

### Client Entry Point
- **Entry file**: `client/src/main.tsx`
- **Build configuration**: `vite.config.ts`
- **Build output directory**: `dist/public`

### Current Static Serving Configuration
- **Development**: Vite middleware handles SPA routing via `setupVite()` in `server/vite.ts`
- **Production**: `serveStatic()` function serves from `dist/public` with `index.html` fallback
- **Static assets**: Express serves from `public` directory via `app.use(express.static('public'))`

### Network Call Sites Analysis
All network calls already use relative "/api" paths through:
- **Primary client API**: `client/src/lib/queryClient.ts` - uses `apiRequest()` with relative paths
- **Server-to-server calls**: Various providers use absolute URLs for external APIs (Replicate, OpenAI, fal.ai, Vertex AI)
- **Internal API calls**: All use relative "/api/..." paths

### Strategy Confirmation
✅ **Phase 1 keeps server static handlers active** - No routing changes
✅ **Same-origin behavior preserved** - VITE_PublicApiBaseUrl will be empty initially
✅ **Zero-risk approach** - Bootstrap utility only activates when env var is set

## Risk Assessment

### Low Risk Items
- ✅ Bootstrap utility uses feature detection and graceful fallback
- ✅ CORS middleware created but not enabled
- ✅ All network calls already use relative "/api" paths
- ✅ No changes to existing Express static serving

### Potential Risks
- TypeScript compilation if imports are incorrect
- Fetch patching could interfere with non-API requests (mitigated by URL filtering)

### Rollback Steps
1. `git revert HEAD~3` (to undo all Phase 1 commits)
2. Remove VITE_PublicApiBaseUrl from any .env files
3. Restart application

## Files to be Created/Modified

### New Files
- `client/src/bootstrap/patchFetchWithPublicApiBaseUrl.ts`
- `server/middleware/enforceCorsForStaticOrigin.ts`
- `Static_Deployment_Readme.md`
- `Phase1_Change_Summary.md`

### Modified Files
- `client/src/main.tsx` (add bootstrap import)
- `.env.example` (add new environment variables)
- `server/index.ts` (add health endpoint)

## Implementation Order
1. Create bootstrap utility
2. Create CORS middleware (disabled)
3. Wire bootstrap into client entry
4. Add environment variables to .env.example
5. Add health endpoint
6. Create documentation
7. Test and verify

Date: 2025-08-18