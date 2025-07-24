# Email Builder & AI Image Generation Platform

## Overview

This is a full-stack application that combines an AI-powered image generation platform with a sophisticated email builder. The system includes multiple image generation models (OpenAI GPT-Image-1, Replicate Imagen-3, Flux-Pro), batch processing capabilities, and a complete email building system with MJML support.

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
  - OpenAI GPT-Image-1 (primary)
  - Replicate Imagen-3 (car generation)
  - Replicate Flux-Pro 1.1
  - Image upscaling via Topaz Labs/Upscale API
- **Features**:
  - Single image generation
  - Batch processing with CSV upload
  - Image editing and enhancement
  - Car-specific generation with database-driven attributes
  - Localized AI disclaimer downloads with 1.71:1 aspect ratio cropping

#### Email Builder
- **Engine**: MJML for cross-client compatibility
- **Components**: Text, Image, Button, Spacer with full property controls
- **Features**:
  - Drag & drop interface using @dnd-kit
  - Live preview with MJML compilation
  - HTML export functionality
  - Template system

#### File Storage
- **Provider**: AWS S3 with presigned URLs
- **Integration**: @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
- **Usage**: Generated images, email assets, batch processing files

## Data Flow

### Image Generation Flow
1. User submits prompt/parameters through frontend forms
2. Frontend validates and sends request to Express API
3. Backend processes request using appropriate AI model API
4. Generated images are uploaded to S3
5. Metadata is stored in PostgreSQL via Drizzle
6. Real-time updates sent to frontend via WebSocket
7. Images appear in gallery with management capabilities
8. Car Creation page offers localized disclaimer downloads with canvas-based processing

### Email Building Flow
1. User creates/edits email components in visual builder
2. Component state managed in React with editing context
3. Real-time MJML compilation for preview
4. Export generates complete HTML document
5. Templates can be saved/loaded from database

### Batch Processing Flow
1. CSV file uploaded and validated on frontend
2. Background job created with unique ID
3. Queue processes each row with rate limiting
4. Progress updates sent via WebSocket
5. Completed batch generates downloadable ZIP file

## External Dependencies

### AI Services
- **OpenAI API**: Primary image generation (GPT-Image-1)
- **Replicate API**: Alternative models (Imagen-3, Flux-Pro)
- **Topaz Labs**: Image upscaling and enhancement

### Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **AWS S3**: Object storage for images and files
- **WebSocket**: Real-time communication (custom implementation)

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **MJML**: Email template compilation
- **Papa Parse**: CSV processing
- **Archiver**: ZIP file creation for batch downloads

## Deployment Strategy

### Production Build
- Frontend: Vite builds to `dist/public`
- Backend: ESBuild bundles server to `dist/index.js`
- Database: Drizzle migrations applied via `db:push`

### Environment Configuration
- Database connection via `DATABASE_URL`
- AI service API keys (OpenAI, Replicate)
- AWS credentials for S3 access
- Car data sourced from Google Sheets CSV

### Development Setup
- Hot reloading with tsx for backend
- Vite dev server for frontend
- Replit-specific plugins for development environment
- WebSocket connection handling for local vs production

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