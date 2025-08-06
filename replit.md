# AI-Powered Car Design Visualization & Creative Content Platform

## Overview
This platform is a comprehensive AI-powered multimedia generation system, specifically designed for car design visualization. Its primary purpose is to empower marketing and creative teams to produce highly customizable content using advanced AI technologies. Key capabilities include AI-driven image and video generation, a specialized car design visualization system, an email builder, and robust batch processing. The vision is to provide a cutting-edge solution for automotive marketing content creation, enabling efficient and scalable production of high-quality visuals and communications.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI Library**: Shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with a custom design system
- **State Management**: React Query for server state; React hooks for local state

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (using Neon serverless)
- **Build System**: ESBuild

### Key Components and Technical Implementations

#### AI Image Generation
- **Models**: OpenAI GPT-Image-1, Replicate Imagen-3 (for cars), Replicate Flux-Pro 1.1, Replicate Flux-Kontext-Max (for editing), Replicate Flux-Krea-Dev (img2img), Topaz Labs Upscale API.
- **Features**: Text-to-image, image-to-image generation with reference images, advanced image editing with masks, professional upscaling, car-specific generation with database attributes, batch processing (up to 50 cars), real-time progress via WebSocket, localized AI disclaimers, KAVAK-style photography effects.
- **Architecture**: Unified provider adapter pattern for frictionless model addition - new models can be added with minimal configuration changes. Enhanced UI components provide consistent file upload experiences across models.

#### AI Video Generation
- **Engine**: Google Vertex AI Veo models (Veo 3, Veo 3 Fast, Veo 2).
- **Features**: Project-based organization, AI-enhanced prompts, configurable aspect ratios, resolutions, durations, optional audio generation, person generation controls, seed support.

#### Car Design Visualization System
- **Data**: Google Sheets integration for a live car database (14,584+ entries, makes, models, body styles, trims) and dynamic color management (41+ colors).
- **Visuals**: Custom SVG icon system for 12 car angle previews, dynamic color system.
- **Styles**: "Hub" (hyperrealistic studio photography) and "White" (clean isolated renders).
- **Specialized Features**: Car angle selection, wheel color customization, adventure cladding, background environment selection, localized disclaimer overlay system.

#### Email Builder
- **Engine**: MJML for cross-client compatibility.
- **Interface**: Drag & drop using @dnd-kit/core.
- **Features**: Live preview with real-time MJML compilation, HTML export, visual component editor with grouped properties, responsive design support.

#### File Storage & Management
- **Provider**: AWS S3 with presigned URLs for scalable storage of generated content and batch processing files.
- **Gallery**: Real-time image management with WebSocket updates, star/favorite system, trash/restore, advanced search and filtering, bulk operations.

#### Core Architectural Decisions
- **Database**: Drizzle ORM with PostgreSQL for type-safe queries and flexible schema management.
- **AI Model Integration**: Multi-provider approach with a unified API layer to reduce vendor lock-in and optimize model selection. Provider adapter pattern enables frictionless model addition:
  - New providers can be added by implementing the BaseProvider interface
  - Models are centrally configured in server/config/models.ts
  - Frontend automatically discovers available models via /api/models endpoint
  - Dynamic form generation based on model schemas
  - Unified image handler routes requests to appropriate providers
- **Email Rendering**: MJML chosen for robust cross-client compatibility.
- **Real-time Updates**: Custom WebSocket implementation for job progress and gallery updates, with session-based authentication for security.
- **File Storage**: AWS S3 with presigned URLs for scalable and secure client uploads.
- **Batch Processing**: Queue-based background jobs with polling to handle long-running operations.

## External Dependencies

### AI Services
- **OpenAI API**: GPT-Image-1, GPT-4o (for prompt enhancement and vision-based editing).
- **Replicate API**: Imagen-3, Flux-Pro 1.1, Flux-Kontext-Max, Flux-Krea-Dev, Topaz Labs Upscale API.
- **Google Vertex AI**: Veo video generation models (Veo 2, Veo 3, Veo 3 Fast).
- **Google Cloud Storage**: For video file storage and management.


### Data Sources
- **Google Sheets**: Live car database (14,584+ entries) and dynamic color management (41+ colors).
- **CSV Integration**: Via Papa Parse for batch processing data input.

### Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **AWS S3**: Scalable object storage for all generated assets.
- **WebSocket**: Custom real-time communication for live updates.

### Development Tools (Integrated)
- **Drizzle Kit**: Database migrations and schema management.
- **MJML**: Email template compilation.
- **Papa Parse**: CSV processing.
- **Archiver**: ZIP file creation.
- **Sharp**: Server-side image processing.
- **Node-Cron**: Scheduling automated tasks.



## Recent Changes (August 2025)

### Complete Backend Performance Optimization Suite ✅
- **Date**: August 6, 2025
- **Change**: Implemented comprehensive backend performance optimization addressing site performance issues and glitching
- **Details**:
  - **Auto-refresh optimization**: Changed car data refresh from 5-minute intervals to daily refresh, eliminating constant 14,584-entry API calls from Google Sheets
  - **Authentication caching**: Added NodeCache-based user authentication with 5-minute TTL, reducing database calls from 2 per auth request to cached lookups
  - **WebSocket authentication enhancement**: Enhanced WebSocket auth to store user data on connection, eliminating repeated session checks for future event handlers
  - **Verbose logging removal**: Wrapped 210+ console.log statements in production environment checks, focusing on performance-impacting logs that serialize large objects and occur in polling loops
  - **Date caching system**: Implemented dateCache.ts utility to reduce garbage collection pressure from frequent Date object creation (59+ instances), with smart TTL-based caching for timestamps
- **Architecture Impact**: Major reduction in external API calls, database queries, logging overhead, and memory allocation - significantly improved production performance
- **Performance Results**: Application now runs smoothly with 200-400ms response times, stable WebSocket connections, and reduced memory pressure
- **Key Insight**: The 5-minute car data auto-refresh was the primary performance bottleneck, causing constant large dataset API calls and processing

### Download Experience Fix for Windows PC
- **Date**: August 5, 2025
- **Change**: Fixed download issues on Windows PC where share dialogs and file picker were appearing instead of direct downloads
- **Details**:
  - Modified MobileDownloadManager to detect desktop environments and bypass mobile-specific features
  - Desktop/PC now uses traditional download method directly, avoiding Web Share API and File System Access API
  - Removed mobile-specific attributes (target="_blank") for desktop downloads
  - Created simpleDownload.ts utility as an alternative for desktop-first download experiences
- **Architecture Impact**: Downloads now properly differentiate between mobile and desktop platforms
- **Key Insight**: Mobile optimizations were interfering with desktop experience - platform detection now prioritizes appropriate download method

### WAN-2.2 Model Integration - Complete Implementation
- **Date**: August 5, 2025
- **Change**: Successfully integrated WAN-2.2 (PrunaAI) model with full backend and frontend support
- **Details**: 
  - Added wan-2.2 to all backend validation schemas (shared/schema.ts, enhancePrompt.ts, promptSuggestions.ts)
  - Implemented frontend form schema with aspect_ratio and juiced parameter support
  - Created distinct visual styling: Film icon, sky blue color scheme, "PrunaAI" provider branding
  - Added cinematic-focused AI prompt enhancement guidance
  - Implemented "Juiced" toggle with detailed description for cinematic enhancements
  - Fixed validation errors across generate, enhance-prompt, and prompt-suggestions APIs
- **Architecture Impact**: Demonstrates mature model integration pipeline - all validation points automatically updated
- **Key Insight**: Systematic validation schema updates across all API endpoints critical for new model functionality

### AI Model Integration Process Documentation
- **Date**: August 5, 2025
- **Change**: Successfully integrated Flux-Krea-Dev model after debugging complete integration process
- **Details**: 
  - Fixed TypeScript errors in replicate provider by properly typing body objects as `Record<string, any>`
  - Added missing flux-krea-dev schema and defaults to `client/src/lib/formSchemas.ts`
  - Updated GenericFormValues type to include model-specific fields (Image, aspect_ratio, etc.)
  - Resolved field mapping between frontend "Image" field and backend "image" field
  - Created enhanced ReferenceImageUpload component based on EditForm source images with drag-and-drop functionality
- **Architecture Impact**: Created comprehensive model integration guide (`docs/AI_Model_Integration_Guide.md`) documenting exact process for future model additions
- **Key Insight**: Models require dual configuration in both server config and frontend form schemas, with exact field name mapping between frontend and backend