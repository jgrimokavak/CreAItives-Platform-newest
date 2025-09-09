import { pgTable, text, serial, timestamp, boolean, jsonb, varchar, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  role: varchar("role").default("user").notNull(), // 'user' | 'admin'
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User Sessions tracking for real-time online status
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionToken: text("session_token").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  currentPage: text("current_page"),
  isActive: boolean("is_active").default(true).notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_sessions_user_id").on(table.userId),
  index("idx_user_sessions_active").on(table.isActive),
  index("idx_user_sessions_last_activity").on(table.lastActivity),
]);

// User Activity Logs for detailed tracking
export const userActivityLogs = pgTable("user_activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"),
  action: text("action").notNull(), // 'page_view', 'login', 'logout', 'image_generate', 'video_generate', etc.
  page: text("page"), // '/home', '/create', '/gallery', etc.
  details: jsonb("details"), // Additional context data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  duration: integer("duration"), // Time spent on page/action in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_activity_logs_user_id").on(table.userId),
  index("idx_activity_logs_action").on(table.action),
  index("idx_activity_logs_page").on(table.page),
  index("idx_activity_logs_created_at").on(table.createdAt),
  index("idx_activity_logs_session_id").on(table.sessionId),
]);

// Page Analytics for tracking page popularity
export const pageAnalytics = pgTable("page_analytics", {
  id: text("id").primaryKey(),
  page: text("page").notNull(), // '/home', '/create', '/gallery', etc.
  date: text("date").notNull(), // 'YYYY-MM-DD' format for daily aggregation
  uniqueVisitors: integer("unique_visitors").default(0).notNull(),
  totalViews: integer("total_views").default(0).notNull(),
  averageDuration: integer("average_duration").default(0).notNull(), // in seconds
  bounceRate: integer("bounce_rate").default(0).notNull(), // percentage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_page_analytics_page_date").on(table.page, table.date),
  index("idx_page_analytics_date").on(table.date),
]);

export const insertUserSessionSchema = createInsertSchema(userSessions);
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs);
export const insertPageAnalyticsSchema = createInsertSchema(pageAnalytics);

export type UserSession = typeof userSessions.$inferSelect;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type PageAnalytics = typeof pageAnalytics.$inferSelect;

// Admin Audit Logs for tracking admin actions
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: text("id").primaryKey(),
  adminUserId: text("admin_user_id").notNull(),
  adminEmail: text("admin_email").notNull(),
  action: text("action").notNull(), // 'user_status_change', 'user_role_change', 'force_logout', 'bulk_action', 'export'
  targetUserId: text("target_user_id"), // For single user actions
  targetUserEmail: text("target_user_email"), // For reference
  details: jsonb("details"), // Action-specific details
  affectedCount: integer("affected_count").default(1), // For bulk actions
  reason: text("reason"), // For exports and sensitive actions
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_admin_audit_admin_user").on(table.adminUserId),
  index("idx_admin_audit_action").on(table.action),
  index("idx_admin_audit_created_at").on(table.createdAt),
  index("idx_admin_audit_target_user").on(table.targetUserId),
]);

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs);
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

// Daily Analytics Snapshots for KPI aggregation (Phase 2)
export const dailyAnalytics = pgTable("daily_analytics", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  environment: text("environment").notNull(), // 'dev' | 'prod'
  // Core KPIs
  dau: integer("dau").default(0).notNull(), // Daily Active Users
  newUsers: integer("new_users").default(0).notNull(),
  activatedUsers: integer("activated_users").default(0).notNull(), // Users who generated content within 7 days
  // Content generation metrics
  imageGenerateAttempts: integer("image_generate_attempts").default(0).notNull(),
  imageGenerateSuccesses: integer("image_generate_successes").default(0).notNull(),
  videoGenerateAttempts: integer("video_generate_attempts").default(0).notNull(),
  videoGenerateSuccesses: integer("video_generate_successes").default(0).notNull(),
  projectsCreated: integer("projects_created").default(0).notNull(),
  // Performance metrics (milliseconds)
  avgImageGenerationLatency: integer("avg_image_generation_latency").default(0).notNull(),
  avgVideoGenerationLatency: integer("avg_video_generation_latency").default(0).notNull(),
  p95ImageLatency: integer("p95_image_latency").default(0).notNull(),
  p95VideoLatency: integer("p95_video_latency").default(0).notNull(),
  // Error tracking
  totalErrors: integer("total_errors").default(0).notNull(),
  topErrorCode: text("top_error_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_daily_analytics_date_env").on(table.date, table.environment),
  index("idx_daily_analytics_date").on(table.date),
  index("idx_daily_analytics_env").on(table.environment),
]);

// Enhanced Activity Events (Phase 2)
export const activityEvents = pgTable("activity_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"),
  event: text("event").notNull(), // 'page_view', 'image_generate_requested', 'image_generate_succeeded', etc.
  feature: text("feature"), // 'image_generation', 'video_generation', 'project_management', etc.
  model: text("model"), // 'gpt-image-1', 'flux-pro', etc.
  status: text("status"), // 'requested', 'succeeded', 'failed'
  duration: integer("duration"), // milliseconds
  errorCode: text("error_code"),
  metadata: jsonb("metadata"), // Additional context (PII-safe)
  environment: text("environment").notNull().default('dev'), // 'dev' | 'prod'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_activity_events_user_id").on(table.userId),
  index("idx_activity_events_event").on(table.event),
  index("idx_activity_events_feature").on(table.feature),
  index("idx_activity_events_status").on(table.status),
  index("idx_activity_events_created_at").on(table.createdAt),
  index("idx_activity_events_date_event").on(table.createdAt, table.event),
  index("idx_activity_events_env").on(table.environment),
]);

// Photo-to-Studio Jobs Queue (Phase 3)
export const photoStudioJobs = pgTable("photo_studio_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").notNull(), // pending, processing, completed, failed
  mode: text("mode").notNull(), // background-only, studio-enhance
  modelKey: text("model_key").notNull(),
  brand: text("brand"),
  additionalInstructions: text("additional_instructions"),
  imageFiles: jsonb("image_files").notNull(), // Array of file info
  resultImageUrl: text("result_image_url"),
  resultThumbUrl: text("result_thumb_url"),
  errorMessage: text("error_message"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  environment: text("environment").notNull().default('dev'),
}, (table) => [
  index("idx_photo_studio_jobs_user_id").on(table.userId),
  index("idx_photo_studio_jobs_status").on(table.status),
  index("idx_photo_studio_jobs_created_at").on(table.createdAt),
  index("idx_photo_studio_jobs_user_status").on(table.userId, table.status),
]);

export const insertDailyAnalyticsSchema = createInsertSchema(dailyAnalytics);
export const insertActivityEventSchema = createInsertSchema(activityEvents);
export const insertPhotoStudioJobSchema = createInsertSchema(photoStudioJobs);

export type DailyAnalytics = typeof dailyAnalytics.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type PhotoStudioJob = typeof photoStudioJobs.$inferSelect;

// Image generation schema
export const generateSchema = z.object({
  modelKey: z.enum(["gpt-image-1", "imagen-3", "imagen-4", "flux-pro", "flux-kontext-max", "flux-krea-dev", "wan-2.2"]),
  inputs: z.record(z.any())
});

export type ModelKey = z.infer<typeof generateSchema>["modelKey"];

// Photo-to-Studio schema
export const photoToStudioSchema = z.object({
  mode: z.enum(['background-only', 'studio-enhance']),
  brand: z.string().optional(),
  additionalInstructions: z.string().optional(),
  modelKey: z.enum(["google/nano-banana", "flux-kontext-max"]).default("google/nano-banana"),
  images: z.array(z.string()).min(1).max(10) // Array of image URLs, 1-10 images
}).refine((data) => {
  // Brand is required when mode is 'studio-enhance'
  if (data.mode === 'studio-enhance') {
    return data.brand && data.brand.trim().length > 0;
  }
  return true;
}, {
  message: "Brand is required when Studio Enhance mode is selected",
  path: ["brand"],
});

export type PhotoToStudioFormValues = z.infer<typeof photoToStudioSchema>;

// Keep the old schema for compatibility with existing code, but we'll transition to the new one
export const generateImageSchema = z.object({
  // Common fields for all models
  prompt: z.string().min(1).max(32000),
  // Updated to match the new model keys
  modelKey: z.enum(["gpt-image-1", "imagen-3", "imagen-4", "flux-pro", "flux-kontext-max", "flux-krea-dev", "wan-2.2", "google/nano-banana"]),
  // OpenAI-specific parameters (only validated when OpenAI model is selected)
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"]).optional(),
  quality: z.enum(["auto", "standard", "hd", "high", "medium", "low"]).optional(),
  style: z.enum(["vivid", "natural"]).optional(),
  n: z.number().int().min(1).max(10).optional(),
  output_format: z.enum(["url", "b64_json", "png", "jpg"]).optional(),
  background: z.enum(["auto", "transparent", "opaque"]).optional(),
  // Replicate-specific parameters
  aspect_ratio: z.union([
    z.enum(["match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9", "9:21", "2:1", "1:2"]),
    z.string()
  ]).optional(), // For Imagen-3, Imagen-4, Flux-Pro, and Flux-Kontext-Max
  seed: z.number().int().optional(),   // For Flux-Pro and Flux-Kontext-Max
  prompt_upsampling: z.boolean().optional(), // For Flux-Kontext-Max
  safety_tolerance: z.number().int().min(0).max(6).optional(), // For Flux-Kontext-Max
  // Images for editing (base64 encoded)
  images: z.array(z.string()).optional(), // For image editing
  mask: z.string().optional(), // For image editing mask
  input_image: z.string().optional(), // For flux-kontext-max single image input
  image_input: z.array(z.string()).optional(), // For google/nano-banana multiple source images
  // Flux-krea-dev specific fields
  Image: z.string().optional(), // For flux-krea-dev img2img (capital I as per spec)
  num_outputs: z.number().int().min(1).max(4).optional(), // For flux-krea-dev
  go_fast: z.boolean().optional(), // For flux-krea-dev
  // WAN-2.2 specific fields
  juiced: z.boolean().optional(), // For wan-2.2
  // KAVAK style toggle
  kavakStyle: z.boolean().optional().default(false)
});

// Map to hold form data for different model types
export const modelFormSchemas = {
  "gpt-image-1": z.object({
    prompt: z.string().min(1).max(32000),
    size: z.enum(["1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"]),
    quality: z.enum(["high", "medium", "low", "auto"]),
    n: z.number().int().min(1).max(10),
  }),
  "imagen-4": z.object({
    prompt: z.string().min(1).max(32000),
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
  }),
  "imagen-3": z.object({
    prompt: z.string().min(1).max(32000),
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
  }),
  "flux-pro": z.object({
    prompt: z.string().min(1).max(32000),
    aspect_ratio: z.enum(["1:1", "3:2", "2:3", "16:9", "9:16"]),
    seed: z.number().int().optional(),
  }),
  "flux-kontext-max": z.object({
    prompt: z.string().min(1).max(32000),
    input_image: z.string().optional(),
    aspect_ratio: z.enum(["match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9", "9:21", "2:1", "1:2"]).optional(),
    output_format: z.enum(["png", "jpg"]).optional(),
    safety_tolerance: z.number().int().min(0).max(2).optional(),
    seed: z.number().int().optional(),
    prompt_upsampling: z.boolean().optional(),
  }),
  "flux-krea-dev": z.object({
    prompt: z.string().min(1).max(32000),
    aspect_ratio: z.enum(["1:1", "16:9", "21:9", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3", "9:16", "9:21"]),
    Image: z.string().optional(), // For img2img mode (capital I as per spec)
    seed: z.number().int().optional(),
    num_outputs: z.number().int().min(1).max(4).optional(),
    go_fast: z.boolean().optional(),
  }),
  "wan-2.2": z.object({
    prompt: z.string().min(1).max(32000),
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"]),
    seed: z.number().int().optional(),
    juiced: z.boolean().optional(),
  }),
  "google/nano-banana": z.object({
    prompt: z.string().min(1).max(32000),
    image_input: z.array(z.string()).optional(),
    output_format: z.enum(["png", "jpg"]).optional(),
  })
};

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

// Video generation schema
export const generateVideoSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt must be less than 2000 characters'),
  model: z.enum(['hailuo-02', 'kling-v2.1']),
  // Hailuo-02 specific parameters
  resolution: z.enum(['512p', '768p', '1080p']).optional(),
  firstFrameImage: z.string().optional(), // determines aspect ratio AND gets saved as reference
  lastFrameImage: z.string().optional(), // final frame target for video generation
  promptOptimizer: z.boolean().optional(),
  // Kling v2.1 specific parameters
  negativePrompt: z.string().optional(), // things to avoid in video
  startImage: z.string().optional(), // first frame for kling v2.1
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional(), // aspect ratio for kling v2.1
  // Shared parameters
  duration: z.number().int().min(5).max(10), // 5-10 seconds for kling, 6-10 for hailuo
  projectId: z.string().optional(),
});

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;

// Video model form schemas
export const videoModelSchemas = {
  "hailuo-02": z.object({
    prompt: z.string().min(1).max(2000),
    resolution: z.enum(['512p', '768p', '1080p']),
    duration: z.number().int().min(6).max(10),
    promptOptimizer: z.boolean().optional(),
    firstFrameImage: z.string().optional(),
    lastFrameImage: z.string().optional(), // final frame target for video generation
    referenceImage: z.string().optional(), // base64 reference image to be stored in object storage
  }),
  "kling-v2.1": z.object({
    prompt: z.string().min(1).max(2000),
    negativePrompt: z.string().optional(), // things to avoid in video
    startImage: z.string().optional(), // first frame of the video
    aspectRatio: z.enum(['16:9', '9:16', '1:1']),
    duration: z.number().int().min(5).max(10), // 5 or 10 seconds
  }),
};

// Images database schema 
export const images = pgTable("images", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  prompt: text("prompt").notNull(),
  dimensions: text("dimensions").notNull(), // Image dimensions like "1024x1024"
  model: text("model").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Added fields for gallery functionality
  width: text("width").default("1024"),
  height: text("height").default("1024"),
  thumbUrl: text("thumb_url"),
  fullUrl: text("full_url"),
  sourceThumb: text("source_thumb"),
  sourceImage: text("source_image"),  // Full original source image data
  starred: text("starred").default("false"),
  deletedAt: timestamp("deleted_at"),
  // New fields for enhanced display
  aspectRatio: text("aspect_ratio"),  // Direct aspect ratio as selected by user (e.g., "16:9")
  quality: text("quality"),           // Image quality setting
  environment: text("environment").default("dev").notNull(), // 'dev' | 'prod' - environment where image was created
  size: integer("size").default(0), // File size in bytes
  user_id: text("user_id"), // User who created the image
});

export const insertImageSchema = createInsertSchema(images);

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;

// For memory storage and client-server communication
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  dimensions: string; // Image dimensions like "1024x1024"
  model: string;
  createdAt: string;
  sourceThumb?: string | null; // 128px thumbnail of the first reference image
  sourceImage?: string | null; // Full-resolution source image
  width?: string | null;
  height?: string | null;
  thumbUrl?: string | null;
  fullUrl?: string | null;
  starred?: boolean;
  deletedAt?: string | null;
  aspectRatio?: string | null; // The aspect ratio selected by the user (e.g., "1:1", "16:9", "9:16")
  quality?: string | null; // Image quality setting
}

// Image edit schema
export const editImageSchema = z.object({
  images: z.array(z.string()).min(1).max(16),  // base64 (may include data-URL prefix)
  prompt: z.string().min(1).max(32000),
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536"]),
  quality: z.enum(["auto", "high", "medium", "low"]).default("auto"),
  n: z.coerce.number().int().min(1).max(10).default(1),
  mask: z.string().nullable().optional(),
  kavakStyle: z.boolean().optional().default(false)
});

export type EditImageInput = z.infer<typeof editImageSchema>;



// Email Builder Schema - MJML-based only
export interface EmailComponent {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer';
  content: any;
  styles: Record<string, any>;
}

export interface EmailContent {
  subject: string;
  components: EmailComponent[];
}

// Page Settings Schema
export const pageSettings = pgTable("page_settings", {
  id: serial("id").primaryKey(),
  pageKey: varchar("page_key", { length: 50 }).notNull().unique(),
  pageName: varchar("page_name", { length: 100 }).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPageSettingsSchema = createInsertSchema(pageSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertPageSettings = z.infer<typeof insertPageSettingsSchema>;
export type PageSettings = typeof pageSettings.$inferSelect;

// Videos database schema
export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  url: text("url"),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  aspectRatio: text("aspect_ratio"),
  resolution: text("resolution").notNull(),
  duration: text("duration").notNull(),
  status: text("status").default("pending").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  jobId: text("job_id"),
  projectId: text("project_id"),
  userId: text("user_id").notNull(),
  firstFrameImage: text("first_frame_image"), // base64 encoded first frame image for hailuo-02
  referenceImageUrl: text("reference_image_url"), // persistent reference image URL in object storage
  promptOptimizer: boolean("prompt_optimizer").default(true),
  thumbUrl: text("thumb_url"),
  fullUrl: text("full_url"),
  error: text("error"), // Error message if generation failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  environment: text("environment").default("dev").notNull(), // 'dev' | 'prod'
  size: integer("size").default(0), // File size in bytes
}, (table) => [
  // Performance indexes for common queries
  index("idx_videos_user_env").on(table.userId, table.environment),
  index("idx_videos_created_at").on(table.createdAt),
  index("idx_videos_project_id").on(table.projectId),
  index("idx_videos_status").on(table.status),
  index("idx_videos_environment").on(table.environment),
]);

export const insertVideoSchema = createInsertSchema(videos);
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Projects database schema for video organization
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  gcsFolder: text("gcs_folder").notNull(), // GCS folder path for project assets
  videoCount: integer("video_count").default(0).notNull(), // Count of videos in project
  userId: text("user_id").notNull(),
  orderIndex: integer("order_index").default(0).notNull(), // For custom project ordering
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp for archival  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project membership table for collaboration
export const projectMembers = pgTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  userId: text("user_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  addedBy: text("added_by"), // Optional for audit trail
}, (table) => [
  // Composite unique constraint to prevent duplicate memberships
  index("idx_project_members_unique").on(table.projectId, table.userId),
  index("idx_project_members_project").on(table.projectId),
  index("idx_project_members_user").on(table.userId),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  addedAt: true,
});

// Schema for project management operations
export const duplicateProjectSchema = z.object({
  projectId: z.string(),
  includeVideos: z.boolean().optional().default(false),
});

export const reorderProjectsSchema = z.object({
  projectIds: z.array(z.string()), // Array of project IDs in desired order
});

export const archiveProjectSchema = z.object({
  projectId: z.string(),
});

export const deleteProjectSchema = z.object({
  projectId: z.string(),
  deleteVideos: z.boolean().optional().default(false),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type DuplicateProject = z.infer<typeof duplicateProjectSchema>;
export type ReorderProjects = z.infer<typeof reorderProjectsSchema>;
export type ArchiveProject = z.infer<typeof archiveProjectSchema>;
export type DeleteProject = z.infer<typeof deleteProjectSchema>;
