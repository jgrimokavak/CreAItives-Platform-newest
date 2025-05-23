import React from "react";
import { Check, Brain, Zap, Cpu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { modelCatalog, type ModelKey } from "@/lib/modelCatalog";
import { getModelColors } from "@/lib/modelColors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Model provider icons with colored backgrounds
const ModelIcon = ({ modelKey, size = "md" }: { modelKey: ModelKey, size?: "sm" | "md" }) => {
  const colors = getModelColors(modelKey);
  let Icon;
  
  if (modelKey === "gpt-image-1") {
    Icon = Brain;
  } else if (modelKey.startsWith("imagen-")) {
    Icon = Zap;
  } else {
    Icon = Cpu;
  }
  
  const sizeClasses = size === "sm" 
    ? "w-5 h-5 rounded" 
    : "w-7 h-7 rounded-md";
  
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  
  return (
    <div 
      className={cn(sizeClasses, "flex items-center justify-center shrink-0")} 
      style={{ backgroundColor: colors.light }}
    >
      <Icon className={cn(iconSize, "text-white")} />
    </div>
  );
};

// Get provider name from model key - simplified to reduce duplication
const getProviderName = (modelKey: ModelKey): string => {
  if (modelKey === "gpt-image-1") return "OpenAI";
  if (modelKey.startsWith("imagen-")) return "Google";
  if (modelKey === "flux-pro") return "Black Forest Labs";
  return "AI";
};

// Clean model name - removes the provider in parentheses
const getCleanModelName = (fullName: string): string => {
  return fullName.split(" (")[0];
};

interface AIModelSelectorProps {
  value: ModelKey;
  onChange: (value: ModelKey) => void;
  className?: string;
}

export default function AIModelSelector({ value, onChange, className }: AIModelSelectorProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Get selected model data
  const selectedModel = modelCatalog[value];
  const colors = getModelColors(value);
  
  return (
    <div className={className}>
      {/* Interactive model card that acts as a dropdown */}
      <div 
        className={cn(
          "rounded-lg border overflow-hidden cursor-pointer transition-all",
          isHovered && "shadow-md"
        )}
        style={{ 
          borderColor: isHovered ? colors.light : `${colors.light}50` 
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Select value={value} onValueChange={(val: ModelKey) => onChange(val)}>
          <SelectTrigger className="h-auto p-0 border-0 w-full shadow-none focus:ring-0 bg-transparent">
            <div className="w-full">
              {/* Card header with model info */}
              <div 
                className="p-3 flex items-center gap-3 transition-colors border-b"
                style={{ 
                  backgroundColor: `${colors.bg}60`, 
                  borderColor: `${colors.light}30` 
                }}
              >
                <ModelIcon modelKey={value} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">
                        {getCleanModelName(selectedModel.label)}
                      </span>
                      <ModelVersionBadge modelKey={value} />
                    </div>
                    
                    {/* Subtle dropdown indicator */}
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isHovered ? "text-foreground" : "text-muted-foreground opacity-70"
                      )}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getProviderName(value)} • {getModelFeatureDescription(value)}
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {selectedModel.description}
              </div>
            </div>
          </SelectTrigger>
          
          <SelectContent className="w-[min(320px,calc(100vw-2rem))]">
            {Object.entries(modelCatalog).map(([key, model]) => {
              const modelKey = key as ModelKey;
              const modelColors = getModelColors(modelKey);
              const provider = getProviderName(modelKey);
              const name = getCleanModelName(model.label);
              
              return (
                <SelectItem 
                  key={modelKey} 
                  value={modelKey}
                  className="py-2 px-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ModelIcon modelKey={modelKey} size="sm" />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{name}</span>
                        <ModelVersionBadge modelKey={modelKey} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {provider}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Version badge component - now shows actual version number
function ModelVersionBadge({ modelKey }: { modelKey: ModelKey }) {
  let version = "";
  let label = "";
  
  // Assign appropriate version based on model
  if (modelKey === "imagen-4") {
    version = "4";
    label = "Imagen";
  } else if (modelKey === "imagen-3") {
    version = "3";
    label = "Imagen";
  } else if (modelKey === "flux-pro") {
    version = "1.1";
    label = "Flux";
  } else if (modelKey === "gpt-image-1") {
    version = "1";
    label = "GPT Image";
  }
  
  // Only show if we have a version
  if (!version) return null;
  
  const colors = getModelColors(modelKey);
  
  return (
    <Badge 
      className="h-6 px-2 font-semibold text-xs" 
      style={{ 
        backgroundColor: colors.bg,
        color: colors.medium,
        borderColor: colors.light
      }}
      variant="outline"
    >
      {label} v{version}
    </Badge>
  );
}

// Model info card component - shows details about the selected model
function ModelInfoCard({ modelKey }: { modelKey: ModelKey }) {
  const model = modelCatalog[modelKey];
  const colors = getModelColors(modelKey);
  const provider = getProviderName(modelKey);
  
  return (
    <Card className="overflow-hidden border">
      <div 
        className="p-3 flex items-center gap-3"
        style={{ 
          backgroundColor: `${colors.bg}60`,
          borderBottom: `1px solid ${colors.light}40` 
        }}
      >
        <ModelIcon modelKey={modelKey} />
        <div>
          <div className="text-sm font-medium">
            {getCleanModelName(model.label)}
          </div>
          <div className="text-xs text-muted-foreground">
            {provider} • {getModelFeatureDescription(modelKey)}
          </div>
        </div>
      </div>
      <CardContent className="p-3 pt-2 text-xs text-muted-foreground">
        {model.description}
      </CardContent>
    </Card>
  );
}

// Helper function to get feature description based on model
function getModelFeatureDescription(modelKey: ModelKey): string {
  switch(modelKey) {
    case "gpt-image-1":
      return "High accuracy, slower";
    case "imagen-4":
      return "Latest version, best quality";
    case "imagen-3":
      return "Balanced speed & accuracy";
    case "flux-pro":
      return "Fast, creative outputs";
    default:
      return "";
  }
}