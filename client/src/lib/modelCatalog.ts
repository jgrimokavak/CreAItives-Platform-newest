export const modelCatalog = {
  "gpt-image-1": {
    label: "GPT-Image-1 (OpenAI)",
    description: "Most accurate, but slow.",
    visible: ["prompt", "size", "quality", "n", "kavakStyle"]
  },
  "imagen-3": {
    label: "Imagen-3 (Google)",
    description: "Accurate, fast, consistent, but not very creative.",
    visible: ["prompt", "aspect_ratio", "negative_prompt", "kavakStyle"]
  },
  "flux-pro": {
    label: "Flux-Pro (Black-forest-labs)",
    description: "Fast, creative, high-quality; less prompt-accurate.",
    visible: ["prompt", "aspect_ratio", "seed", "kavakStyle"]
  }
} as const;

export type ModelKey = keyof typeof modelCatalog;

// Aspect ratio options for Flux-Pro (no custom options)
export const fluxAspectRatios = ["1:1", "16:9", "9:16", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3"];

// Aspect ratio options for Imagen-3 (includes custom options)
export const imagenAspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];