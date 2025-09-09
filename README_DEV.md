# Developer Guide

## Adding a New Video Model

Before integrating any new AI video model into the `/video` page, follow this preflight process:

### Quick Start

1. **Run the preflight check:**
   ```bash
   npx tsx scripts/add-video-model-preflight.ts
   ```

2. **Follow the comprehensive guide:**
   - Read `docs/video_model_add_guide.md` for detailed implementation steps
   - Use the checklist to gather all required information before coding
   - Follow the testing plan to ensure proper integration

### What You'll Need

The preflight script will show you exactly what information to collect, including:
- Model identification (name, provider, version)
- API capabilities and constraints
- Required/optional parameters  
- UI requirements and defaults
- Example API payloads

### Integration Steps

1. **Frontend**: Update model configs, form schemas, UI components, **model selector icons & colors**
2. **Backend**: Add parameter mapping, update analytics validation
3. **Testing**: Follow the comprehensive test checklist
4. **Documentation**: Update the change log when complete

### Model Selector Architecture

The system now uses distinctive icons and colors for each model:

**Icon System:**
- Each model has a specific Lucide React icon representing its capabilities
- HaiLuo: `Zap` (physics simulation), Kling: `Target` (precision)
- Add new icons in `getModelIcon()` function in `ModelSelector.tsx`

**Color System:**
- Strong, solid backgrounds with dark icons for maximum visibility
- Pattern: `bg-[color]-100 border-[color]-300` + `text-[color]-700` icons
- No gradients - uses reliable solid colors for cross-browser compatibility

This process is based on real integration experience (Kling v2.1 Master) and includes lessons learned from common pitfalls like cross-model validation conflicts.

For full details, see `docs/video_model_add_guide.md`.

## Video Generation System

### Timeout Configuration
- **Video Job Polling**: 20 minutes (120 attempts × 10s intervals)
- **Job Queue Timeout**: 20 minutes (1,200,000ms)
- **Replicate API Polling**: 10 minutes (600,000ms with exponential backoff)

**Critical Note**: Video generations can take 5-15+ minutes. The system was previously limited to 5 minutes, causing false failures for successful long-duration generations (like Kling v2.1). This has been fixed as of 2025-09-09.

## Database Operations

- **Schema changes**: Use `npm run db:push` (never manual SQL migrations)
- **Development**: Access via DATABASE_URL environment variable
- **Production**: Use database pane for production operations

## Development Workflow

- **Start development**: `npm run dev`
- **Type checking**: `npm run check`
- **Build**: `npm run build`