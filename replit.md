# AI-Powered Car Design Visualization & Creative Content Platform

## Overview
This platform is a comprehensive AI-powered multimedia generation system, specifically designed for car design visualization. Its primary purpose is to empower marketing and creative teams to produce highly customizable content using advanced AI technologies. Key capabilities include AI-driven image and video generation, a specialized car design visualization system, an email builder, and robust batch processing. The vision is to provide a cutting-edge solution for automotive marketing content creation, enabling efficient and scalable production of high-quality visuals and communications.

## User Preferences
- **Communication style**: Simple, everyday language
- **Date formatting**: dd/mm/yyyy format preferred across all displays
- **Analytics focus**: Comprehensive coverage of all platform capabilities, not just basic metrics
- **Development approach**: Gradual, safe improvements with biggest impact first

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

### Recent Changes (August 14, 2025)
- **Phase 1 Complete**: Enhanced DataTable interface with server-side pagination, user drawers with detailed analytics, bulk actions, export functionality, and comprehensive audit logging. Successfully removed legacy UserManagementPage component.
- **Phase 2 Complete**: Implemented comprehensive analytics system with content-focused KPI tracking, event logging pipeline, and Overview dashboard. Features content generation metrics (Images Generated, Videos Created, Upscales Completed), model usage tracking across platform models, feature-based analytics pipeline, and accurate success rate calculations.
- **CRITICAL DATE PARSING FIX**: Resolved analytics dashboard showing zero data despite real events in database. Issue was date range ending at midnight START of day (00:00:00.000Z) instead of end of day (23:59:59.999Z). Fixed frontend to send proper time boundaries and backend to parse correctly.
- **Analytics System Verified**: Dashboard now fully functional showing real-time data with proper KPI calculations (88.89% success rate), content volume tracking, model usage charts, and error summaries. All 9 user events tracked correctly across image generation, video creation, and upscaling features.
- **CRITICAL DATA INTEGRITY FIXES**: Permanently removed analytics seeder, cleaned all 464 fake events from database, added model validation to prevent future fake data, fixed upscale tracking in model usage analytics, verified user data integrity (all 23 users have legitimate data), and ensured only real models appear in analytics (gpt-image-1, imagen-4, imagen-3, flux-pro, flux-kontext-max, flux-krea-dev, wan-2.2, hailuo-02, upscale).
- **Server Stability**: Fixed critical HTTP headers error in error handling middleware, added environment detection logging, resolved cascading server errors.
- **Database Cleanup**: Final state: 980 clean events, 8 unique models, 6 video events, 0 upscale events tracked. All analytics now reflect only real platform usage.
- **Route Fixes**: Resolved bulk actions routing issues by proper route ordering (bulk routes before parameterized routes), fixed missing admin/overview route in unauthenticated redirects.

### Key Components and Technical Implementations

#### AI Image Generation
- **Features**: Text-to-image, image-to-image generation with reference images, advanced image editing with masks, professional upscaling, car-specific generation with database attributes, batch processing, real-time progress via WebSocket, localized AI disclaimers, KAVAK-style photography effects.
- **Architecture**: Unified provider adapter pattern for frictionless model addition; enhanced UI components for consistent file upload experiences.

#### AI Video Generation
- **Features**: Project-based organization with localStorage project memory, AI-enhanced prompts, configurable aspect ratios, resolutions, durations, optional audio generation, person generation controls, seed support, enhanced card-style model selector with keyboard navigation, inline project editing (name and description).
- **Environment Isolation**: Videos are stored with environment tags ('dev' or 'prod') and filtered by environment to prevent cross-environment data mixing. Uses REPLIT_DEPLOYMENT environment variable for detection.
- **Gallery Location**: All video-related functionality is centralized in the `/video` route, which includes both video management and project editing capabilities.
- **Simplified Project Panel**: Streamlined project panel with minimal UI - includes project selection dropdown, compact create button, and clean two-column video grid preview. Component called `SimplifiedProjectVideos` features video thumbnails, click-to-play functionality, download buttons, and helpful usage legends. Rename functionality removed from panel (available in video gallery).
- **Collaborative Projects**: Full project collaboration system with member management - users can add team members to projects with equal permissions for shared video generation and management. Database includes `project_members` table with many-to-many relationships. Backend includes complete API for adding/removing members, user search, and access control. Frontend features ProjectMemberManager component with user search, member management UI, and intuitive member controls integrated into video generation interface.

#### Car Design Visualization System
- **Data**: Google Sheets integration for a live car database and dynamic color management.
- **Visuals**: Custom SVG icon system for 12 car angle previews, dynamic color system.
- **Styles**: "Hub" (hyperrealistic studio photography) and "White" (clean isolated renders).
- **Specialized Features**: Car angle selection, wheel color customization, adventure cladding, background environment selection, localized disclaimer overlay system.

#### Email Builder
- **Engine**: MJML for cross-client compatibility.
- **Interface**: Drag & drop using @dnd-kit/core.
- **Features**: Live preview with real-time MJML compilation, HTML export, visual component editor with grouped properties, responsive design support.

#### File Storage & Management
- **Provider**: Replit Object Storage (kavak-gallery bucket) with deployment-safe persistent cloud storage.
- **Environment Isolation**: Complete separation with dev/ and prod/ prefixes.
- **Gallery**: Real-time image management with WebSocket updates, star/favorite system, trash/restore, advanced search and filtering, bulk operations.
- **Architecture**: Environment-aware Object Storage service with uploadFromBytes, downloadAsBytes, list, and exists methods.

#### Core Architectural Decisions
- **Database**: Drizzle ORM with PostgreSQL for type-safe queries and flexible schema management.
- **AI Model Integration**: Multi-provider approach with a unified API layer to reduce vendor lock-in and optimize model selection. A provider adapter pattern enables frictionless model addition by implementing a `BaseProvider` interface and central configuration. Enhanced card-style model selector component with keyboard navigation and expandable model details.
- **Email Rendering**: MJML chosen for robust cross-client compatibility.
- **Real-time Updates**: Custom WebSocket implementation for job progress and gallery updates, with session-based authentication.
- **File Storage**: Replit Object Storage with persistent cloud storage and complete environment isolation.
- **Batch Processing**: Queue-based background jobs with polling to handle long-running operations.
- **Performance Optimization**: Implemented caching for car data and authentication, enhanced WebSocket auth, and refined logging to improve responsiveness and reduce resource consumption.
- **Environment Isolation**: Complete separation across all storage layers (database, file system, static serving, cleanup processes) to prevent cross-environment conflicts and ensure stability.
- **Phase 2 Analytics System**: Comprehensive analytics pipeline with additive-only database schema approach. Features event logging for all user actions (page_view, image_generate_*, video_generate_*, project_create, login/logout), session heartbeat tracking, real-time KPI calculations (DAU/WAU/MAU, activation rate, stickiness, content success rate), performance metrics (p50/p95 latency), error tracking with top error codes, and PII redaction by default with superadmin reveal capability.
- **Analytics Infrastructure**: New tables: activity_events (user actions), daily_analytics (KPI snapshots), enhanced user session tracking. REST endpoints under /api/admin/analytics/* for KPIs and trends with global filter support. Client-side analytics library for event tracking with offline queue and automatic heartbeat.

## External Dependencies

### AI Services
- **OpenAI API**: GPT-Image-1, GPT-4o.
- **Replicate API**: Imagen-3, Flux-Pro 1.1, Flux-Kontext-Max, Flux-Krea-Dev, Topaz Labs Upscale API.


### Data Sources
- **Google Sheets**: Live car database and dynamic color management.
- **CSV Integration**: Via Papa Parse for batch processing data input.

### Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Object Storage**: Deployment-safe persistent cloud storage for all generated assets.
- **WebSocket**: Custom real-time communication for live updates.

### Development Tools (Integrated)
- **Drizzle Kit**: Database migrations and schema management.
- **MJML**: Email template compilation.
- **Papa Parse**: CSV processing.
- **Archiver**: ZIP file creation.
- **Sharp**: Server-side image processing.
- **Node-Cron**: Scheduling automated tasks.