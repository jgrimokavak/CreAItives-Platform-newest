# AI-Powered Car Design Visualization & Creative Content Platform

## Overview

This is a comprehensive AI-powered multimedia generation platform specializing in car design visualization, enabling marketing and creative teams to produce customizable content using cutting-edge AI technologies. The system combines advanced image generation, video creation, email building, and batch processing capabilities with specialized tools for automotive marketing content.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query for server state, React hooks for local state
- **Routing**: React Router (implied from page structure)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Build System**: ESBuild for production builds
- **Development**: tsx for hot reloading

### Key Components

#### AI Image Generation
- **Models Supported**:
  - OpenAI GPT-Image-1 (primary text-to-image)
  - Replicate Imagen-3 (specialized car generation)
  - Replicate Flux-Pro 1.1 (high-quality generation)
  - Replicate Flux-Kontext-Max (advanced image editing)
  - Topaz Labs Upscale API (image resolution enhancement)
- **Features**:
  - Text-to-image generation with AI prompt enhancement
  - Advanced image editing with mask support
  - Professional image upscaling with multiple enhancement models
  - Car-specific generation with database-driven attributes
  - Batch processing with CSV upload (up to 50 cars)
  - Real-time progress tracking via WebSocket
  - Localized AI disclaimer downloads with 1.71:1 aspect ratio cropping
  - KAVAK-style professional photography effects

#### AI Video Generation
- **Engine**: Google Vertex AI Veo models
- **Models Supported**:
  - Veo 3 (8-second, 720p/1080p, 16:9, with audio)
  - Veo 3 Fast (8-second, 720p/1080p, 16:9, with audio)
  - Veo 2 (5-8 seconds, 720p, multiple aspect ratios, no audio)
- **Features**:
  - Project-based video organization
  - Advanced prompt enhancement using AI
  - Configurable aspect ratios, resolutions, and durations
  - Sample count control (1-4 videos per generation)
  - Optional audio generation
  - Person generation controls
  - Seed support for reproducible results

#### Car Design Visualization System
- **Data Source**: Google Sheets integration for live car database
- **Database**: 14,584+ car entries with makes, models, body styles, trims
- **Visual Elements**: Custom SVG icon system for 12 car angle previews
- **Color Management**: Dynamic color system via Google Sheets (41+ colors)
- **Batch Processing**: CSV upload for generating up to 50 car images simultaneously
- **Professional Styles**:
  - Hub style: Hyperrealistic studio photography with professional lighting
  - White style: Clean isolated renders with contact shadows
- **Specialized Features**:
  - Car angle selection with visual previews
  - Wheel color customization
  - Adventure cladding options
  - Background environment selection
  - Localized disclaimer overlay system (MX, AR, BR, CL, EN)

#### Email Builder
- **Engine**: MJML for cross-client compatibility
- **Components**: Text, Image, Button, Spacer with comprehensive property controls
- **Features**:
  - Drag & drop interface using @dnd-kit/core
  - Live preview with real-time MJML compilation
  - HTML export functionality
  - Visual component editor with grouped properties
  - Responsive email design support

#### File Storage & Management
- **Provider**: AWS S3 with presigned URLs for scalable storage
- **Integration**: @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
- **Usage**: Generated images, video files, email assets, batch processing files
- **Gallery System**: 
  - Real-time image management with WebSocket updates
  - Star/favorite system
  - Trash/restore functionality
  - Advanced search and filtering
  - Bulk operations support

## Data Flow

### Car Image Generation Flow
1. User selects car parameters (make, model, year, color, angle) from database-driven dropdowns
2. System fetches live car data from Google Sheets (14,584+ entries)
3. Visual car angle selection using custom SVG previews
4. AI prompt constructed using specialized car templates (Hub/White styles)
5. Image generated via Replicate Imagen-3 model optimized for car rendering
6. Generated images stored in AWS S3 with car-specific metadata
7. Real-time updates via WebSocket show generation progress
8. Images appear in gallery with car-specific actions (disclaimer downloads, edit, upscale)

### Video Generation Flow
1. User creates/selects video project for organization
2. Video parameters configured (model, duration, aspect ratio, audio)
3. Prompt optionally enhanced using OpenAI GPT-4o
4. Video generation initiated via Google Vertex AI Veo models
5. Job tracked with unique operation name and GCS storage path
6. Progress monitored via polling system
7. Completed videos stored with project association and metadata

### Batch Car Processing Flow
1. CSV file uploaded and validated (max 50 rows, required columns: make, model)
2. Background job created with unique ID and queued
3. Each row processed sequentially with car-specific prompt templates
4. Images generated, downloaded, and stored locally
5. Progress updates sent via WebSocket (current/total, errors)
6. Completed batch generates downloadable ZIP with organized files and error reports
7. Automatic cleanup of temporary files after 24 hours

### Image Editing Flow
1. User selects source image from gallery or uploads new image
2. Optional mask upload for targeted editing
3. Edit prompt enhanced using GPT-4o with vision capabilities
4. Edited image generated using Flux-Kontext-Max model
5. Results stored and displayed with edit history context

### Email Building Flow
1. User creates/edits email components in visual drag-and-drop builder
2. Component properties managed through grouped property controls
3. Real-time MJML compilation generates live preview
4. Export generates complete HTML document for email clients
5. Templates can be saved/loaded from database

### Gallery Management Flow
1. All generated content appears in unified gallery with real-time updates
2. Advanced filtering by model, starred status, search terms
3. Bulk operations (star, delete, restore) with optimistic UI updates
4. Image actions: edit, upscale, download, copy prompt, delete/restore
5. Trash system with permanent deletion option

## External Dependencies

### AI Services
- **OpenAI API**: Primary image generation (GPT-Image-1), prompt enhancement (GPT-4o), and vision-based editing assistance
- **Replicate API**: Specialized models including Imagen-3 (car generation), Flux-Pro 1.1, Flux-Kontext-Max (editing), and Topaz Labs upscaling
- **Google Vertex AI**: Veo video generation models (Veo 2, Veo 3, Veo 3 Fast)
- **Google Cloud Storage**: Video file storage and management

### Data Sources
- **Google Sheets**: Live car database (14,584+ entries) and dynamic color management (41+ colors)
- **CSV Integration**: Batch processing data input with Papa Parse

### Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting for user data, images, videos, and projects
- **AWS S3**: Scalable object storage for images, video files, and batch processing assets
- **WebSocket**: Custom real-time communication for live updates and progress tracking

### Development Tools
- **Drizzle Kit**: Type-safe database migrations and schema management
- **MJML**: Professional email template compilation and rendering
- **Papa Parse**: Robust CSV processing for batch operations
- **Archiver**: ZIP file creation for batch downloads and organized delivery
- **Sharp**: Server-side image processing and optimization
- **Node-Cron**: Automated data refresh and cleanup scheduling

## Deployment Strategy

### Production Build
- Frontend: Vite builds optimized React application to `dist/public`
- Backend: ESBuild bundles TypeScript server to `dist/index.js`
- Database: Drizzle migrations applied via `npm run db:push`
- Static Assets: Car angle SVGs and other assets bundled with application

### Environment Configuration
**Required Environment Variables:**
- `DATABASE_URL`: Neon PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI GPT-4o and GPT-Image-1 access
- `REPLICATE_API_TOKEN`: Replicate models (Imagen-3, Flux-Pro, Topaz Labs)
- `GOOGLE_APPLICATION_CREDENTIALS`: Google Vertex AI and Cloud Storage access
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`: S3 storage credentials
- `CAR_SHEET_CSV`: Google Sheets CSV URL for car database
- `SESSION_SECRET`: Session encryption key

**Data Sources:**
- Car database: Google Sheets with 14,584+ entries, auto-refreshed every 5 minutes
- Color data: Google Sheets with 41+ colors, cached with 2-minute TTL
- User authentication: Replit Auth integration with role-based access

### Development Setup
- Hot reloading with tsx for backend development
- Vite dev server for frontend with HMR
- Replit-specific plugins for development environment
- WebSocket connection handling for local vs production environments
- Automatic car data refresh and cleanup job scheduling
- Development database seeding and migration support

### Performance Optimizations
- **Caching**: In-memory caching for car data (2-minute TTL) and colors
- **Real-time Updates**: WebSocket connections for live progress tracking
- **Batch Processing**: Queue-based background jobs with rate limiting
- **Image Optimization**: Sharp for server-side image processing
- **CDN Integration**: AWS S3 for static asset delivery
- **Database**: Neon serverless PostgreSQL for automatic scaling

## Recent Changes & Platform Evolution

### Complete Platform Capabilities Update (August 4, 2025)
- **Current State**: Platform now operates as a comprehensive AI-powered car design visualization and creative content system
- **Core Capabilities**:
  - ✅ AI Image Generation: Text-to-image, editing, upscaling with multiple AI models
  - ✅ AI Video Generation: Google Vertex AI Veo integration with project management
  - ✅ Car Design Visualization: Specialized car rendering with 14,584+ car database
  - ✅ Batch Processing: CSV-based car image generation (up to 50 cars)
  - ✅ Email Builder: Professional MJML-based email creation tool
  - ✅ Real-time Gallery: Advanced content management with WebSocket updates
  - ✅ Admin Panel: User management and system configuration

### Google Sheets Color Integration (July 31, 2025)
- **Feature Added**: Dynamic color management via Google Sheets integration
- **Implementation**: 
  - Added new Google Sheets data source for colors (ID: 1ftpeFWjClvZINpJMxae1qrNRS1a7XPKAC0FUGizfgzs, GID: 1643991184)
  - Created `/api/cars/colors` endpoint that fetches colors from Google Sheets
  - Updated frontend to load colors dynamically instead of hardcoded list
  - Colors refresh every 5 minutes with car data and via manual refresh button
  - Custom color input system preserved and enhanced to stay visible when selected
- **Benefits**: 
  - Users can now add new colors anytime by editing the Google Sheets
  - Colors are ordered by color wheel in the sheet for better UX
  - No need to redeploy app to add new colors
- **Technical Details**: 
  - Colors cached in-memory with 2-minute TTL
  - Integrated with existing car data refresh system
  - Maintains "✏️ Custom Color..." option at top of dropdown
  - Fallback to preset colors if sheets unavailable
  - HTTP caching disabled on colors endpoint to ensure fresh data
  - Column mapping: reads "Color List" column from Google Sheets
  - **Status**: ✅ Fully implemented and working (July 31, 2025)

### Car Creation Form Enhancement (July 31, 2025)
- **Problem Solved**: Form fields were blocked when car data had missing values (empty body_style or trim fields)
- **Solution Implemented**: 
  - Modified backend API to include "None" options when empty values exist in dataset
  - Updated car data functions to detect missing values and add "None" as first option
  - Fixed frontend to use API-returned options instead of hardcoded values
  - Enhanced user experience with proper placeholders instead of showing raw "None" values
- **Impact**: Users can now access all car variants including those with missing intermediate values (e.g., cars with empty body_style but valid trim values)
- **Technical Details**: API endpoints now return "None" at the beginning of arrays when empty values are detected, allowing complete data accessibility

### Advanced AI Integration & Enhancement Features
- **AI Prompt Enhancement**: GPT-4o integration for improving user prompts across all generation types
- **Vision-Based Editing**: GPT-4o vision capabilities for context-aware image editing prompts
- **Intelligent Suggestions**: AI-powered suggestions for image types, camera positions, lighting, and color palettes
- **Real-time Processing**: WebSocket implementation for live progress updates during generation
- **Professional Styling**: KAVAK-style professional photography effects for car images

## Current Platform Capabilities (Complete Feature Set)

### 🎨 AI Image Studio (/create)
- **Text-to-Image Generation**: Create images from text prompts using multiple AI models
- **Image Editing**: Advanced editing with mask support and AI-enhanced prompts
- **Model Selection**: Choose from OpenAI GPT-Image-1, Replicate Flux-Pro, and specialized models
- **AI Prompt Helper**: Automatic prompt enhancement and intelligent suggestions
- **Dynamic Parameters**: Model-specific parameter controls with live validation

### 🚗 Car Design Visualization (/car)
- **Single Car Generation**: Create professional car renders with detailed customization
- **Batch Processing**: Generate up to 50 car images simultaneously via CSV upload
- **Live Car Database**: 14,584+ car entries with real-time data from Google Sheets
- **Visual Angle Selection**: 12 car angle options with custom SVG previews
- **Professional Styles**: Hub (studio photography) and White (isolated render) modes
- **Color Management**: 41+ dynamic colors with custom color input support
- **Advanced Options**: Wheel colors, adventure cladding, aspect ratio control
- **Localized Disclaimers**: Multi-language AI disclaimer overlays (MX, AR, BR, CL, EN)

### 🎬 Video Creation (/video)
- **AI Video Generation**: Create videos using Google Vertex AI Veo models
- **Project Management**: Organize videos into projects with metadata tracking
- **Multiple Models**: Veo 2, Veo 3, and Veo 3 Fast with different capabilities
- **Configurable Parameters**: Duration (5-8s), resolution (720p/1080p), aspect ratios
- **Audio Support**: Optional audio generation for compatible models
- **Advanced Controls**: Sample count, seed support, person generation settings

### 🖼️ Gallery Management (/gallery)
- **Real-time Updates**: Live gallery updates via WebSocket connections
- **Advanced Filtering**: Filter by model, starred status, search terms
- **Bulk Operations**: Select multiple items for batch actions
- **Image Actions**: Edit, upscale, download, copy prompt, star/unstar
- **Trash System**: Soft delete with restore capabilities
- **Search & Sort**: Full-text search across prompts and metadata

### 📧 Email Builder (/email-builder)
- **Visual Editor**: Drag-and-drop interface for email creation
- **MJML Integration**: Professional email compatibility across clients
- **Component Library**: Text, Image, Button, Spacer with full property controls
- **Live Preview**: Real-time rendering of email designs
- **HTML Export**: Generate production-ready email HTML
- **Property Groups**: Organized control panels for component styling

### 📈 Image Upscaling (/upscale)
- **AI Enhancement**: Professional image upscaling using Topaz Labs models
- **Multiple Models**: Standard V2 and other enhancement options
- **Batch Support**: Process multiple images simultaneously
- **Quality Controls**: Upscale factor, face enhancement, output format options
- **Progress Tracking**: Real-time status updates for processing jobs

### 🗑️ Trash Management (/trash)
- **Deleted Items**: View and manage deleted content
- **Restore Functionality**: Recover accidentally deleted items
- **Permanent Deletion**: Final removal with confirmation
- **Bulk Operations**: Mass restore or permanent delete options

### 👨‍💼 Admin Panel (/admin/*)
- **User Management**: View, filter, and manage user accounts
- **User Statistics**: Analytics on user activity and engagement
- **Role Management**: Assign admin/user roles with access control
- **Page Settings**: Configure which platform features are enabled
- **Data Export**: Export user data and statistics to CSV
- **System Monitoring**: Track platform usage and performance metrics

## Key Architectural Decisions

### Database Strategy
- **Chosen**: Drizzle ORM with PostgreSQL
- **Rationale**: Type-safe queries, excellent TypeScript integration, flexible schema management
- **Trade-offs**: More setup than Prisma but better performance and type safety

### AI Model Integration
- **Chosen**: Multi-provider approach with unified interface
- **Rationale**: Reduces vendor lock-in, allows optimal model selection per use case
- **Implementation**: Abstract API layer handles different providers consistently

### Email Rendering
- **Chosen**: MJML for email compilation
- **Rationale**: Cross-client compatibility, professional email standards
- **Alternative**: Manual HTML generation was replaced for better reliability

### Real-time Updates
- **Chosen**: Custom WebSocket implementation with session-based authentication
- **Rationale**: Direct control over connection handling, optimized for image generation workflows
- **Features**: Job progress, gallery updates, connection resilience, secure authentication
- **Security**: Session cookie validation, unauthenticated connection blocking, message injection prevention

### File Storage
- **Chosen**: AWS S3 with presigned URLs
- **Rationale**: Scalable, secure, direct client uploads reduce server load
- **Implementation**: Backend generates presigned URLs, frontend handles uploads

### Batch Processing
- **Chosen**: Queue-based background jobs with polling
- **Rationale**: Handles long-running operations without HTTP timeouts
- **Implementation**: In-memory job store with persistent file outputs