export const modelCatalog = {
  "gpt-image-1": {
    label: "GPT-Image-1 (OpenAI)",
    description: "Most accurate, but slow.",
    visible: ["prompt", "size", "quality", "n", "kavakStyle"] as string[]
  },
  "imagen-4": {
    label: "Imagen-4 (Google)",
    description: "Latest Google model with improved quality and accuracy.",
    visible: ["prompt", "aspect_ratio", "kavakStyle"] as string[]
  },
  "imagen-3": {
    label: "Imagen-3 (Google)",
    description: "Accurate, fast, consistent, but not very creative.",
    visible: ["prompt", "aspect_ratio", "negative_prompt", "kavakStyle"] as string[]
  },
  "flux-pro": {
    label: "Flux-Pro (Black-forest-labs)",
    description: "Fast, creative, high-quality; less prompt-accurate.",
    visible: ["prompt", "aspect_ratio", "seed", "kavakStyle"] as string[]
  },
  "flux-kontext-max": {
    label: "Flux-Kontext-Max (Black-forest-labs)",
    description: "Advanced image editing with contextual understanding.",
    visible: ["prompt", "aspect_ratio", "seed", "prompt_upsampling"] as string[]
  },
  "flux-dev": {
    label: "Flux Dev (fal.ai)",
    description: "High-quality open model from Black Forest Labs via fal.ai",
    visible: ["prompt", "aspect_ratio", "steps", "guidance_scale", "seed"] as string[]
  },
  "stable-diffusion-xl": {
    label: "SDXL (fal.ai)",
    description: "Stable Diffusion XL for high-quality generation via fal.ai",
    visible: ["prompt", "aspect_ratio", "steps", "guidance_scale", "seed"] as string[]
  },
  "fast-sdxl": {
    label: "Fast SDXL (fal.ai)",
    description: "Lightning-fast image generation via fal.ai",
    visible: ["prompt", "aspect_ratio", "steps", "guidance_scale", "seed"] as string[]
  }
};

// Edit-specific model catalog with restricted models
export const editModelCatalog = {
  "gpt-image-1": modelCatalog["gpt-image-1"],
  "flux-kontext-max": modelCatalog["flux-kontext-max"]
};

export type ModelKey = keyof typeof modelCatalog;

// Aspect ratio options for Flux-Pro (no custom options)
export const fluxAspectRatios = ["1:1", "16:9", "9:16", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3"];

// Aspect ratio options for Flux-Kontext-Max
export const fluxKontextAspectRatios = ["match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9", "9:21", "2:1", "1:2"];

// Aspect ratio options for Imagen-3 and Imagen-4 (includes custom options)
export const imagenAspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];