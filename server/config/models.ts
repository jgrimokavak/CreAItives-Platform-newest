// Model definitions for OpenAI and Replicate

// Define the model interface
export interface ModelConfig {
  key: string;
  provider: 'openai' | 'replicate';
  visible: string[];
  description: string;
  slug?: string;
  version?: string;
  schema?: any;
  defaults?: Record<string, any>;
  unavailable?: boolean;
}

export const models: ModelConfig[] = [
  {
    key: "gpt-image-1",
    provider: "openai",
    visible: ["prompt", "size", "quality", "n"],
    description: "GPT‑Image‑1 – most accurate, but slow."
  },
  {
    key: "imagen-3",
    provider: "replicate",
    slug: "google/imagen-3",
    version: "a1b48e6471cc2d2c4463885c6f702785d188fcadaf4159128e525a2626f36c01",
    defaults: { 
      safety_filter_level: "block_only_high" 
    },
    visible: ["prompt", "aspect_ratio"],
    description: "Imagen‑3 – accurate, fast, consistent, but not very creative."
  },
  {
    key: "flux-pro",
    provider: "replicate",
    slug: "black-forest-labs/flux-1.1-pro",
    version: "c31590f67c7349d50d6275d9c654ac78a52cf613095a3a368195c2df2c2ddef2",
    defaults: {
      output_format: "png",
      prompt_upsampling: false,
      safety_tolerance: 2
    },
    visible: ["prompt", "aspect_ratio", "seed"],
    description: "Flux‑Pro 1.1 – fast, creative, high‑quality; less prompt‑accurate."
  }
];

// OpenAI schema for GPT-Image-1 and DALL-E models
export const openaiSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Text description of the desired image(s)"
    },
    size: {
      type: "string",
      enum: ["1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"],
      description: "Size of the generated image"
    },
    quality: {
      type: "string",
      enum: ["high", "medium", "low", "auto"],
      description: "Quality of the generated image"
    },
    n: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description: "Number of images to generate"
    },
    background: {
      type: "string",
      enum: ["auto", "transparent", "opaque"],
      description: "Background transparency (GPT-Image-1 only)"
    }
  },
  required: ["prompt"]
};