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
  // Google (Imagen) - Blue color
  google: {
    light: "#4285f4", // Google Blue
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
  } else if (modelKey === "imagen-3") {
    return providerColors.google;
  } else if (modelKey === "flux-pro") {
    return providerColors["black-forest-labs"];
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