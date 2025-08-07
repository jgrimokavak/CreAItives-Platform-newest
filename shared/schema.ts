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

// Videos database schema 
export const videos = pgTable("videos", {
  id: text("id").primaryKey(),
  project_id: text("project_id"),
  prompt: text("prompt").notNull(),
  negative_prompt: text("negative_prompt"),
  model_id: text("model_id").notNull(),
  aspect_ratio: text("aspect_ratio").notNull(),
  resolution: text("resolution").notNull(),
  duration: text("duration").notNull(),
  sample_count: text("sample_count").default("1"),
  seed: text("seed"),
  audio: boolean("audio").default(false),
  enhance_prompt: boolean("enhance_prompt").default(false),
  person_generation: text("person_generation").default("allow_all"),
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed
  gcs_uri: text("gcs_uri"),
  vertex_op: text("vertex_op"), // Vertex AI operation name
  video_url: text("video_url"), // Final video URL after completion
  error_message: text("error_message"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  created_at: true,
  completed_at: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Projects table for video organization
export const projects = pgTable('projects', {
  id: varchar('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  gcs_folder: varchar('gcs_folder').notNull(), // GCS folder path for this project
  video_count: integer('video_count').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  video_count: true,
  created_at: true,
  updated_at: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Video generation request schema
export const generateVideoSchema = z.object({
  prompt: z.string().min(1).max(32000),
  negativePrompt: z.string().optional(),
  model: z.enum(["Veo 3", "Veo 3 Fast", "Veo 2"]),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  resolution: z.enum(["720p", "1080p"]),
  duration: z.number().int().min(5).max(8),
  sampleCount: z.number().int().min(1).max(4).default(1),
  generateAudio: z.boolean().default(false),
  seed: z.number().int().optional(),
  enhancePrompt: z.boolean().default(false),
  personGeneration: z.enum(["allow_all", "dont_allow"]).default("allow_all"),
  projectId: z.string().optional(),
});

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;

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
