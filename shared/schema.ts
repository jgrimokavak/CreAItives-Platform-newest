import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema (from original)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Image generation schema
export const generateSchema = z.object({
  modelKey: z.enum(["gpt-image-1", "imagen-3", "imagen-4", "flux-pro"]),
  inputs: z.record(z.any())
});

export type ModelKey = z.infer<typeof generateSchema>["modelKey"];

// Keep the old schema for compatibility with existing code, but we'll transition to the new one
export const generateImageSchema = z.object({
  // Common fields for all models
  prompt: z.string().min(1).max(32000),
  // Updated to match the new model keys
  modelKey: z.enum(["gpt-image-1", "imagen-3", "imagen-4", "flux-pro"]),
  // OpenAI-specific parameters (only validated when OpenAI model is selected)
  size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"]).optional(),
  quality: z.enum(["auto", "standard", "hd", "high", "medium", "low"]).optional(),
  style: z.enum(["vivid", "natural"]).optional(),
  n: z.number().int().min(1).max(10).optional(),
  output_format: z.enum(["url", "b64_json"]).optional(),
  background: z.enum(["auto", "transparent", "opaque"]).optional(),
  // Replicate-specific parameters
  aspect_ratio: z.union([
    z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
    z.string()
  ]).optional(), // For Imagen-3, Imagen-4, and Flux-Pro
  seed: z.number().int().optional(),   // For Flux-Pro
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
  })
};

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

// Images database schema 
export const images = pgTable("images", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  prompt: text("prompt").notNull(),
  size: text("size").notNull(),
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
});

export const insertImageSchema = createInsertSchema(images);

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;

// For memory storage and client-server communication
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  size: string;
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
