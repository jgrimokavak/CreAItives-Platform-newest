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

1. **Frontend**: Update model configs, form schemas, UI components
2. **Backend**: Add parameter mapping, update analytics validation
3. **Testing**: Follow the comprehensive test checklist
4. **Documentation**: Update the change log when complete

This process is based on real integration experience (Kling v2.1 Master) and includes lessons learned from common pitfalls like cross-model validation conflicts.

For full details, see `docs/video_model_add_guide.md`.

## Database Operations

- **Schema changes**: Use `npm run db:push` (never manual SQL migrations)
- **Development**: Access via DATABASE_URL environment variable
- **Production**: Use database pane for production operations

## Development Workflow

- **Start development**: `npm run dev`
- **Type checking**: `npm run check`
- **Build**: `npm run build`