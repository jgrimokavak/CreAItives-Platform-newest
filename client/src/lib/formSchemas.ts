import { z } from "zod";
import { ModelKey } from "./modelCatalog";

// Common fields for all models
const commonSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(32000),
  kavakStyle: z.boolean().optional().default(false),
});

// Model-specific schemas
export const modelSchemas = {
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
  }),
};

// Default values for each model
export const modelDefaults = {
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
    kavakStyle: false,
  },
};

// Type helper to get the correct schema type based on model key
export type FormValuesForModel<T extends ModelKey> = z.infer<typeof modelSchemas[T]>;

// Generic form values type that includes all possible fields
export type GenericFormValues = z.infer<typeof commonSchema> & {
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
};