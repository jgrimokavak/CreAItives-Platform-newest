import { z } from "zod";
import { ModelKey } from "./modelCatalog";

// Common fields for all models
const commonSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(32000),
  kavakStyle: z.boolean().optional().default(false),
});

// Model-specific schemas
export const modelSchemas = {
  "google/nano-banana": commonSchema.extend({
    image_input: z.array(z.string()).optional(), // Array of image URLs/data URIs
    output_format: z.enum(["png", "jpg"]).optional(),
  }),
  "gpt-image-1": commonSchema.extend({
    size: z.enum(["auto", "1024x1024", "1536x1024", "1024x1536"]),
    quality: z.enum(["auto", "high", "medium", "low"]),
    count: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]),
    background: z.enum(["auto", "transparent", "opaque"]).optional(),
  }),
  "imagen-4": commonSchema.extend({
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
  }),
  "imagen-3": commonSchema.extend({
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]),
    negative_prompt: z.string().optional(),
  }),
  "flux-pro": commonSchema.extend({
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3"]),
    seed: z.number().int().optional(),
  }),
  "flux-kontext-max": commonSchema.extend({
    aspect_ratio: z.enum(["match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9", "9:21", "2:1", "1:2"]),
    seed: z.number().int().optional(),
    prompt_upsampling: z.boolean().optional(),
    safety_tolerance: z.number().int().min(0).max(6).optional(),
    output_format: z.enum(["png", "jpg"]).optional(),
  }),
  "flux-krea-dev": commonSchema.extend({
    aspect_ratio: z.enum(["1:1", "16:9", "21:9", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3", "9:16", "9:21"]),
    Image: z.string().optional(), // For img2img mode (capital I as per model spec)
    seed: z.number().int().optional(),
    num_outputs: z.number().int().min(1).max(4).optional(),
    go_fast: z.boolean().optional(),
  }),
  "wan-2.2": commonSchema.extend({
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"]),
    seed: z.number().int().optional(),
    juiced: z.boolean().optional(),
  }),
  "bytedance/seedream-4": commonSchema.extend({
    image_input: z.array(z.string()).optional().default([]), // Array of image URLs for multi-reference generation
    size: z.enum(["1K", "2K", "4K"]).default("4K"),
    aspect_ratio: z.enum(["match_input_image", "1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]).default("match_input_image"),
    sequential_image_generation: z.enum(["disabled", "auto"]).default("disabled"),
    max_images: z.number().int().min(1).max(15).default(1),
  }),
};

// Default values for each model
export const modelDefaults = {
  "google/nano-banana": {
    image_input: [],
    output_format: "png",
    kavakStyle: false,
  },
  "gpt-image-1": {
    size: "1024x1024",
    quality: "high",
    count: "1",
    background: "auto",
    kavakStyle: false,
  },
  "imagen-4": {
    aspect_ratio: "1:1",
    kavakStyle: false,
  },
  "imagen-3": {
    aspect_ratio: "1:1",
    negative_prompt: "",
    kavakStyle: false,
  },
  "flux-pro": {
    aspect_ratio: "1:1",
    seed: undefined,
    kavakStyle: false,
  },
  "flux-kontext-max": {
    aspect_ratio: "match_input_image",
    seed: undefined,
    prompt_upsampling: false,
    safety_tolerance: 2, // Hardcoded as per requirements
    output_format: "png", // Hardcoded as per requirements
    kavakStyle: false,
  },
  "flux-krea-dev": {
    aspect_ratio: "1:1",
    Image: undefined,
    seed: undefined,
    num_outputs: 1,
    go_fast: false,
    kavakStyle: false,
  },
  "wan-2.2": {
    aspect_ratio: "16:9",
    seed: undefined,
    juiced: false,
    kavakStyle: false,
  },
  "bytedance/seedream-4": {
    image_input: [],
    size: "4K",
    aspect_ratio: "match_input_image",
    sequential_image_generation: "disabled",
    max_images: 1,
    kavakStyle: false,
  },
};

// Type helper to get the correct schema type based on model key
export type FormValuesForModel<T extends ModelKey> = z.infer<typeof modelSchemas[T]>;

// Generic form values type that includes all possible fields
export type GenericFormValues = z.infer<typeof commonSchema> & {
  // google/nano-banana specific fields
  image_input?: string[];
  size?: string;
  quality?: string;
  count?: string;
  background?: string;
  aspect_ratio?: string;
  negative_prompt?: string;
  seed?: number;
  prompt_upsampling?: boolean;
  safety_tolerance?: number;
  output_format?: string;
  kavakStyle?: boolean;
  // flux-krea-dev specific fields
  Image?: string;
  num_outputs?: number;
  go_fast?: boolean;
  // wan-2.2 specific fields
  juiced?: boolean;
  // bytedance/seedream-4 specific fields
  sequential_image_generation?: "disabled" | "auto";
  max_images?: number;
};