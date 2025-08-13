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
- **Comprehensive Analytics**: Advanced admin analytics system tracking all platform capabilities with real-time data from database queries, daily activity metrics, feature usage by category, and detailed user activity timelines with dd/mm/yyyy date formatting throughout.

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