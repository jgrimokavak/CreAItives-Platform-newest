// Model definitions for OpenAI and Replicate

// Define the model interface
export interface ModelConfig {
  key: string;
  provider: 'openai' | 'replicate' | 'fal' | 'vertex';
  visible: string[];
  description: string;
  slug?: string;
  version?: string;
  schema?: any;
  defaults?: Record<string, any>;
  unavailable?: boolean;
}

// Replicate schema for wan-2.2
export const wan22Schema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Text prompt for image generation"
    },
    aspect_ratio: {
      type: "string",
      enum: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
      description: "Aspect ratio for the generated image"
    },
    seed: {
      type: "integer",
      description: "Random seed. Set for reproducible generation"
    },
    juiced: {
      type: "boolean",
      description: "Faster inference with additional optimizations."
    },
    megapixels: {
      type: "integer",
      enum: [1, 2],
      description: "Approximate number of megapixels for generated image"
    },
    output_format: {
      type: "string",
      enum: ["png", "jpg", "webp"],
      description: "Format of the output images"
    },
    output_quality: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "Quality when saving the output images, from 0 to 100. 100 is best quality, 0 is lowest quality. Not relevant for .png outputs"
    }
  },
  required: ["prompt"]
};

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

// Minimax Hailuo-02 schema for video generation
export const minimaxHailuoSchema = {
  type: "object",
  title: "Input",
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      "x-order": 0,
      description: "Text prompt for generation"
    },
    first_frame_image: {
      type: "string",
      title: "First Frame Image",
      format: "uri",
      "x-order": 1,
      description: "First frame image for video generation. The output video will have the same aspect ratio as this image."
    },
    last_frame_image: {
      type: "string",
      title: "Last Frame Image",
      format: "uri",
      "x-order": 2,
      description: "Last frame image for video generation. The final frame of the output video will match this image."
    },
    duration: {
      type: "integer",
      enum: [6, 10],
      title: "duration",
      "x-order": 3,
      description: "Duration of the video in seconds. 10 seconds is only available for 768p resolution.",
      default: 6
    },
    resolution: {
      type: "string",
      enum: ["512p", "768p", "1080p"],
      title: "resolution",
      "x-order": 4,
      description: "Pick between standard 512p, 768p, or pro 1080p resolution. The pro model is not just high resolution, it is also higher quality.",
      default: "1080p"
    },
    prompt_optimizer: {
      type: "boolean",
      title: "Prompt Optimizer",
      "x-order": 5,
      description: "Use prompt optimizer",
      default: true
    }
  },
  required: ["prompt"]
};

// Seedance 1-Pro schema for video generation
export const seedanceProSchema = {
  type: "object",
  title: "Input",
  required: ["prompt"],
  properties: {
    fps: {
      enum: [24],
      type: "integer",
      title: "fps",
      description: "Frame rate (frames per second)",
      default: 24,
      "x-order": 5
    },
    seed: {
      type: "integer",
      title: "Seed",
      "x-order": 7,
      nullable: true,
      description: "Random seed. Set for reproducible generation"
    },
    image: {
      type: "string",
      title: "Image",
      format: "uri",
      "x-order": 1,
      nullable: true,
      description: "Input image for image-to-video generation"
    },
    prompt: {
      type: "string",
      title: "Prompt",
      "x-order": 0,
      description: "Text prompt for video generation"
    },
    duration: {
      type: "integer",
      title: "Duration",
      default: 5,
      maximum: 12,
      minimum: 3,
      "x-order": 2,
      description: "Video duration in seconds"
    },
    resolution: {
      enum: ["480p", "720p", "1080p"],
      type: "string",
      title: "resolution",
      description: "Video resolution",
      default: "1080p",
      "x-order": 3
    },
    aspect_ratio: {
      enum: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "9:21"],
      type: "string",
      title: "aspect_ratio",
      description: "Video aspect ratio. Ignored if an image is used.",
      default: "16:9",
      "x-order": 4
    },
    camera_fixed: {
      type: "boolean",
      title: "Camera Fixed",
      default: false,
      "x-order": 6,
      description: "Whether to fix camera position"
    }
  }
};

// Kling v2.1 Master schema for video generation
export const klingV21Schema = {
  type: "object",
  title: "Input",
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      "x-order": 0,
      description: "Text prompt for video generation"
    },
    negative_prompt: {
      type: "string",
      title: "Negative Prompt",
      "x-order": 1,
      description: "Things you do not want to see in the video",
      default: ""
    },
    start_image: {
      type: "string",
      title: "Start Image",
      format: "uri",
      "x-order": 2,
      description: "First frame of the video (optional)"
    },
    aspect_ratio: {
      type: "string",
      enum: ["16:9", "9:16", "1:1"],
      title: "aspect_ratio",
      "x-order": 3,
      description: "Aspect ratio of the video. Ignored if start_image is provided.",
      default: "16:9"
    },
    duration: {
      type: "integer",
      enum: [5, 10],
      title: "duration",
      "x-order": 4,
      description: "Duration of the video in seconds",
      default: 5
    }
  },
  required: ["prompt"]
};

// Nano Banana (Gemini 2.5 Flash Image) schema
export const nanoBananaSchema = {
  type: "object",
  title: "Input",
  required: ["prompt"],
  properties: {
    prompt: {
      type: "string",
      title: "Prompt", 
      "x-order": 0,
      description: "A text description of the image you want to generate"
    },
    image_input: {
      type: "array",
      items: {
        type: "string",
        anyOf: [],
        format: "uri"
      },
      title: "Image Input",
      "x-order": 1,
      nullable: true,
      description: "Input images to transform or use as reference (supports multiple images)"
    },
    output_format: {
      enum: ["jpg", "png"],
      type: "string",
      title: "output_format",
      description: "Format of the output image",
      default: "jpg",
      "x-order": 2
    }
  }
};

export const models: ModelConfig[] = [
  {
    key: "google/nano-banana",
    provider: "replicate",
    slug: "google/nano-banana",
    schema: nanoBananaSchema,
    defaults: {
      output_format: "png"
    },
    visible: ["prompt", "image_input"],
    description: "Nano Banana (Gemini 2.5 Flash Image) – faster, better edits, supports multiple reference images."
  },
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
  },
  {
    key: "wan-2.2",
    provider: "replicate",
    slug: "prunaai/wan-2.2-image",
    schema: wan22Schema,
    defaults: {
      megapixels: 2,
      output_format: "png",
      output_quality: 80
    },
    visible: ["prompt", "aspect_ratio", "seed", "juiced"],
    description: "This model generates beautiful cinematic 2 megapixel images in 3-4 seconds"
  },
  // Video Models
  {
    key: "hailuo-02",
    provider: "replicate", 
    slug: "minimax/hailuo-02",
    schema: minimaxHailuoSchema,
    defaults: {
      duration: 6,
      resolution: "1080p",
      prompt_optimizer: true
    },
    visible: ["prompt", "duration", "resolution", "prompt_optimizer", "first_frame_image", "last_frame_image"],
    description: "Hailuo-02 – High-quality video generation from Minimax with fast generation times."
  },
  {
    key: "kling-v2.1",
    provider: "replicate", 
    slug: "kwaivgi/kling-v2.1-master",
    schema: klingV21Schema,
    defaults: {
      duration: 5,
      aspect_ratio: "16:9",
      negative_prompt: ""
    },
    visible: ["prompt", "negative_prompt", "start_image", "aspect_ratio", "duration"],
    description: "Kling v2.1 Master – Premium video generation with superb dynamics and prompt adherence. Generate 1080p videos from text or image."
  },
  {
    key: "seedance-1-pro",
    provider: "replicate", 
    slug: "bytedance/seedance-1-pro",
    schema: seedanceProSchema,
    defaults: {
      duration: 5,
      resolution: "1080p",
      aspect_ratio: "16:9",
      camera_fixed: false,
      fps: 24
    },
    visible: ["prompt", "image", "duration", "resolution", "aspect_ratio", "camera_fixed", "seed"],
    description: "Seedance 1-Pro – Multi-shot video generation with creative flexibility and narrative coherence. Supports both text-to-video and image-to-video generation."
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

