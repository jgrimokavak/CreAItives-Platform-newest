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

// Image generation schema
export const generateSchema = z.object({
  modelKey: z.enum(["gpt-image-1", "imagen-3", "imagen-4", "flux-pro", "flux-kontext-max", "flux-krea-dev", "wan-2.2"]),
  inputs: z.record(z.any())
});

export type ModelKey = z.infer<typeof generateSchema>["modelKey"];

// Keep the old schema for compatibility with existing code, but we'll transition to the new one
export const generateImageSchema = z.object({
  // Common fields for all models
  prompt: z.string().min(1).max(32000),
  // Updated to match the new model keys
  modelKey: z.enum(["gpt-image-1", "imagen-3", "imagen-4", "flux-pro", "flux-kontext-max", "flux-krea-dev", "wan-2.2"]),
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
  })
};

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

// Video generation schema
export const generateVideoSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt must be less than 2000 characters'),
  model: z.enum(['hailuo-02']),
  resolution: z.enum(['512p', '768p', '1080p']),
  duration: z.number().int().min(6).max(10), // 6 or 10 seconds only
  projectId: z.string().optional(),
  firstFrameImage: z.string().optional(), // determines aspect ratio AND gets saved as reference
  promptOptimizer: z.boolean().default(true),
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
    referenceImage: z.string().optional(), // base64 reference image to be stored in object storage
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
