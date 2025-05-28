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

// Email Builder Schema
export const emailTemplates = pgTable("email_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(), // Stores the email structure as JSON string
  htmlContent: text("html_content"), // Generated HTML
  isTemplate: text("is_template").default("true"),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// MJML-based Email Builder Component Schema
export interface MJMLComponent {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer';
  content: any;
  attributes: Record<string, any>; // MJML attributes instead of CSS styles
}

export interface MJMLEmailContent {
  subject: string;
  components: MJMLComponent[];
  mjmlAttributes: {
    backgroundColor?: string;
    fontFamily?: string;
    width?: string;
  };
}

// Legacy interface for backwards compatibility
export interface EmailComponent {
  id: string;
  type: 'text' | 'image' | 'button' | 'spacer' | 'background' | 'column';
  content: any;
  styles: Record<string, any>;
  children?: EmailComponent[];
}

export interface EmailContent {
  subject: string;
  components: EmailComponent[];
  globalStyles: {
    backgroundColor: string;
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
  };
}
