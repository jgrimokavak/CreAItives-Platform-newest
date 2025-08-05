// Model definitions for OpenAI and Replicate

// Define the model interface
export interface ModelConfig {
  key: string;
  provider: 'openai' | 'replicate' | 'fal';
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
    key: "imagen-4",
    provider: "replicate",
    slug: "google/imagen-4",
    version: "7a54f1d7f23abba0bd8341bd31412a06ebea759eca9e15ce5fcf4059bcc6c0f1",
    defaults: { 
      safety_filter_level: "block_medium_and_above"
    },
    visible: ["prompt", "aspect_ratio"],
    description: "Imagen‑4 – latest Google model with improved quality and accuracy."
  },
  {
    key: "imagen-3",
    provider: "replicate",
    slug: "google/imagen-3",
    version: "7a54f1d7f23abba0bd8341bd31412a06ebea759eca9e15ce5fcf4059bcc6c0f1",
    defaults: { 
      safety_filter_level: "block_only_high",
      negative_prompt: "license plate, plates, text in license plate"
    },
    visible: ["prompt", "aspect_ratio"],
    description: "Imagen‑3 – accurate, fast, consistent, but not very creative."
  },
  {
    key: "flux-pro",
    provider: "replicate",
    slug: "black-forest-labs/flux-1.1-pro",
    defaults: {
      output_format: "png",
      prompt_upsampling: false,
      safety_tolerance: 2
    },
    visible: ["prompt", "aspect_ratio", "seed"],
    description: "Flux‑Pro 1.1 – fast, creative, high‑quality; less prompt‑accurate."
  },
  {
    key: "flux-kontext-max",
    provider: "replicate",
    slug: "black-forest-labs/flux-kontext-max",
    defaults: {
      output_format: "png",
      prompt_upsampling: false,
      safety_tolerance: 2
    },
    visible: ["prompt", "aspect_ratio", "seed", "prompt_upsampling"],
    description: "Flux‑Kontext‑Max – advanced image editing with contextual understanding."
  },
  // fal.ai models
  {
    key: "flux-dev",
    provider: "fal",
    visible: ["prompt", "aspect_ratio", "steps", "guidance_scale", "seed"],
    description: "Flux Dev – high-quality open model from Black Forest Labs via fal.ai",
    defaults: {
      steps: 25,
      guidance_scale: 7.5,
      safety_tolerance: 2
    }
  },
  {
    key: "stable-diffusion-xl",
    provider: "fal",
    visible: ["prompt", "aspect_ratio", "steps", "guidance_scale", "seed"],
    description: "SDXL – Stable Diffusion XL for high-quality generation via fal.ai",
    defaults: {
      steps: 30,
      guidance_scale: 7.5,
      safety_tolerance: 2
    }
  },
  {
    key: "fast-sdxl",
    provider: "fal",
    visible: ["prompt", "aspect_ratio", "steps", "guidance_scale", "seed"],
    description: "Fast SDXL – Lightning-fast image generation via fal.ai",
    defaults: {
      steps: 8,
      guidance_scale: 2.5,
      safety_tolerance: 2
    }
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

// Schema for fal.ai models
export const falSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Text description of the desired image(s)"
    },
    aspect_ratio: {
      type: "string",
      enum: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      description: "Aspect ratio of the generated image"
    },
    steps: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "Number of inference steps"
    },
    guidance_scale: {
      type: "number",
      minimum: 1,
      maximum: 20,
      description: "Guidance scale for generation"
    },
    seed: {
      type: "integer",
      description: "Random seed for reproducible generation"
    }
  },
  required: ["prompt"]
};