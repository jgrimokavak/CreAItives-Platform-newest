/**
 * Color coding for AI model providers
 * Each provider has a specific color theme that will be used to identify models
 */

// Provider color mapping
export const providerColors = {
  // OpenAI - Teal/Green color
  openai: {
    light: "#10a37f", // Primary brand color
    medium: "#0f8a6c",
    dark: "#0c6b55",
    bg: "#e5f5f1", // Light background
    bgHover: "#d0ebe5",
    text: "#10a37f"
  },
  // Google Imagen-4 - Deeper Blue color
  "google-imagen-4": {
    light: "#1a73e8", // Google Blue (deeper)
    medium: "#1967d2",
    dark: "#174ea6",
    bg: "#e8f0fe",
    bgHover: "#d2e3fc",
    text: "#1a73e8"
  },
  // Google Imagen-3 - Standard Blue color
  "google-imagen-3": {
    light: "#4285f4", // Google Blue (standard)
    medium: "#3b78e7",
    dark: "#2a56c6",
    bg: "#e8f0fe",
    bgHover: "#d2e3fc",
    text: "#4285f4"
  },
  // Black Forest Labs (Flux) - Purple color
  "black-forest-labs": {
    light: "#7e57c2", // Purple
    medium: "#673ab7",
    dark: "#5e35b1",
    bg: "#f3e5f5",
    bgHover: "#e1bee7",
    text: "#7e57c2"
  },
  // PrunaAI - Cinematic Blue/Teal color
  "pruna-ai": {
    light: "#0ea5e9", // Sky Blue
    medium: "#0284c7",
    dark: "#0369a1",
    bg: "#e0f2fe",
    bgHover: "#bae6fd",
    text: "#0ea5e9"
  },
  // Google Nano Banana - Deep Banana Yellow
  "google-nano-banana": {
    light: "#f59e0b", // Deep banana yellow
    medium: "#d97706",
    dark: "#b45309",
    bg: "#fef3c7",
    bgHover: "#fde68a",
    text: "#f59e0b"
  },
  // ByteDance Seedream - Deep Rose/Crimson
  "bytedance": {
    light: "#e11d48", // Rose red
    medium: "#be123c",
    dark: "#9f1239",
    bg: "#ffe4e6",
    bgHover: "#fecdd3",
    text: "#e11d48"
  },
  // Default colors (fallback)
  default: {
    light: "#6b7280", // Gray
    medium: "#4b5563",
    dark: "#374151",
    bg: "#f3f4f6",
    bgHover: "#e5e7eb",
    text: "#6b7280"
  }
};

// Map model keys to provider colors
export const getModelColors = (modelKey: string) => {
  if (modelKey.includes("gpt-") || modelKey === "gpt-image-1") {
    return providerColors.openai;
  } else if (modelKey === "google/nano-banana") {
    return providerColors["google-nano-banana"];
  } else if (modelKey === "imagen-4") {
    return providerColors["google-imagen-4"];
  } else if (modelKey === "imagen-3") {
    return providerColors["google-imagen-3"];
  } else if (modelKey === "flux-pro" || modelKey === "flux-kontext-max" || modelKey === "flux-krea-dev") {
    return providerColors["black-forest-labs"];
  } else if (modelKey === "wan-2.2") {
    return providerColors["pruna-ai"];
  } else if (modelKey === "bytedance/seedream-4") {
    return providerColors["bytedance"];
  }
  
  return providerColors.default;
};

// Style generators for components
export const getModelSelectStyles = (modelKey: string) => {
  const colors = getModelColors(modelKey);
  
  return {
    trigger: {
      borderColor: colors.light,
      backgroundColor: colors.bg,
    },
    badge: {
      color: colors.text,
      backgroundColor: colors.bg,
    },
    item: {
      hoverBg: colors.bgHover
    }
  };
};