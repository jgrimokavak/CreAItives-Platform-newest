import React from "react";
import { cn } from "@/lib/utils";
import { getModelColors } from "@/lib/modelColors";

interface ModelBadgeProps {
  modelKey: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  withLabel?: boolean;
}

/**
 * Badge component that shows the model with appropriate color coding
 * based on the provider (OpenAI, Google, Black Forest Labs, etc.)
 */
export default function ModelBadge({ 
  modelKey, 
  className, 
  size = "md",
  withLabel = true
}: ModelBadgeProps) {
  // Get provider-specific colors
  const colors = getModelColors(modelKey);
  
  // Maps model keys to display names and provider info
  const modelInfo: Record<string, { name: string, provider: string }> = {
    "gpt-image-1": { name: "GPT-Image-1", provider: "OpenAI" },
    "imagen-4": { name: "Imagen-4", provider: "Google" },
    "imagen-3": { name: "Imagen-3", provider: "Google" },
    "flux-pro": { name: "Flux-Pro", provider: "Black Forest Labs" }
  };
  
  const info = modelInfo[modelKey] || { 
    name: modelKey, 
    provider: "AI Provider" 
  };
  
  // Size-based styling
  const sizeStyles = {
    sm: "text-xs py-0.5 px-2",
    md: "text-sm py-1 px-2.5",
    lg: "text-base py-1.5 px-3",
  };
  
  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-md font-medium",
        sizeStyles[size],
        "transition-colors",
        className
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.light}`,
      }}
    >
      <span className="font-semibold">{info.name}</span>
      {withLabel && (
        <span className="ml-1.5 opacity-75 text-[0.85em]">
          by {info.provider}
        </span>
      )}
    </div>
  );
}