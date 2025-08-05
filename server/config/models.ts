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

// Replicate schema for flux-krea-dev
export const fluxKreaDevSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Prompt for generated image"
    },
    aspect_ratio: {
      type: "string",
      enum: ["1:1", "16:9", "21:9", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3", "9:16", "9:21"],
      description: "Aspect ratio for the generated image"
    },
    image: {
      type: "string",
      format: "uri",
      description: "Input image for image to image mode. The aspect ratio of your output will match this image"
    },
    seed: {
      type: "integer",
      description: "Random seed. Set for reproducible generation"
    },
    num_outputs: {
      type: "integer",
      minimum: 1,
      maximum: 4,
      description: "Number of outputs to generate"
    },
    go_fast: {
      type: "boolean",
      description: "Run faster predictions with additional optimizations."
    },
    guidance: {
      type: "number",
      minimum: 0,
      maximum: 10,
      description: "Guidance for generated image. Lower values can give more realistic images. Good values to try are 2, 2.5, 3 and 3.5"
    },
    megapixels: {
      type: "string",
      enum: ["1", "0.25"],
      description: "Approximate number of megapixels for generated image"
    },
    output_format: {
      type: "string",
      enum: ["webp", "jpg", "png"],
      description: "Format of the output images"
    },
    output_quality: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Quality when saving the output images, from 0 to 100. 100 is best quality, 0 is lowest quality. Not relevant for .png outputs"
    },
    prompt_strength: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Prompt strength when using img2img. 1.0 corresponds to full destruction of information in image"
    },
    num_inference_steps: {
      type: "integer",
      minimum: 1,
      maximum: 50,
      description: "Number of denoising steps. Recommended range is 28-50, and lower number of steps produce lower quality outputs, faster."
    },
    disable_safety_checker: {
      type: "boolean",
      description: "Disable safety checker for generated images."
    }
  },
  required: ["prompt"]
};

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
  {
    key: "flux-krea-dev",
    provider: "replicate",
    slug: "black-forest-labs/flux-krea-dev",
    version: "ce472e62d34a1f4e5415eb704a032ecf118f067345ef4a9cc1913d01e369b7a3",
    schema: fluxKreaDevSchema,
    defaults: {
      prompt_strength: 0.8,
      num_inference_steps: 50,
      guidance: 4.5,
      output_format: "png"
    },
    visible: ["prompt", "aspect_ratio", "Image", "seed", "num_outputs", "go_fast"],
    description: "FLUX.1 Krea [dev] is a new state-of-the-art open-weights model for text-to-image generation that overcomes the oversaturated 'AI look' to achieve new levels of photorealism with its distinctive aesthetic approach."
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

