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
- **Models**: OpenAI GPT-Image-1, Replicate Imagen-3 (for cars), Replicate Flux-Pro 1.1, Replicate Flux-Kontext-Max (for editing), Topaz Labs Upscale API.
- **Features**: Text-to-image, advanced image editing with masks, professional upscaling, car-specific generation with database attributes, batch processing (up to 50 cars), real-time progress via WebSocket, localized AI disclaimers, KAVAK-style photography effects.
- **Architecture**: Unified provider adapter pattern for frictionless model addition - new models can be added with minimal configuration changes.

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
- **Replicate API**: Imagen-3, Flux-Pro 1.1, Flux-Kontext-Max, Topaz Labs Upscale API.
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