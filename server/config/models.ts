// Model configuration for all supported models
export const models = [
  {
    key: "gpt-image-1",
    provider: "openai",
    visible: ["prompt", "size", "quality", "n"],
    description: "GPT-Image-1 – most accurate, but slow."
  },
  {
    key: "imagen-3",
    provider: "replicate",
    slug: "google/imagen-3",
    defaults: { safety_filter_level: "block_only_high" },
    visible: ["prompt", "aspect_ratio"],
    description: "Imagen-3 – accurate, fast, consistent, but not very creative."
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
    description: "Flux-Pro 1.1 – fast, creative, high-quality; less prompt-accurate."
  }
];

// OpenAI schema for GPT-Image-1
export const openaiSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "A text description of the desired image(s)."
    },
    size: {
      type: "string",
      enum: ["1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"],
      description: "The size of the generated images."
    },
    quality: {
      type: "string",
      enum: ["standard", "high", "medium", "low"],
      description: "The quality of the generated images."
    },
    n: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description: "The number of images to generate."
    }
  },
  required: ["prompt"]
};