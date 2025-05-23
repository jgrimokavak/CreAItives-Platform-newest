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
  // Get selected model data
  const selectedModel = modelCatalog[value];
  const colors = getModelColors(value);
  
  return (
    <div className={className}>
      {/* Model selection as a single unified card with dropdown */}
      <Card className="overflow-hidden">
        <div 
          className="p-3 flex items-center justify-between border-b transition-colors"
          style={{ 
            backgroundColor: `${colors.bg}60`, 
            borderColor: `${colors.light}30`
          }}
        >
          <div className="flex items-center gap-3">
            <ModelIcon modelKey={value} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {getCleanModelName(selectedModel.label)}
                </span>
                <ModelVersionBadge modelKey={value} />
              </div>
              <div className="text-xs text-muted-foreground">
                {getProviderName(value)} • {getModelFeatureDescription(value)}
              </div>
            </div>
          </div>
          
          <Select value={value} onValueChange={(val: ModelKey) => onChange(val)}>
            <SelectTrigger className="h-8 w-auto bg-background/80 border-muted px-2 focus:ring-0">
              <div className="flex items-center">
                <span className="text-xs mr-1">Change</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </div>
            </SelectTrigger>
            <SelectContent align="end" className="w-[220px]">
              {Object.entries(modelCatalog).map(([key, model]) => {
                const modelKey = key as ModelKey;
                const isSelected = value === modelKey;
                const modelColors = getModelColors(modelKey);
                
                return (
                  <SelectItem 
                    key={modelKey} 
                    value={modelKey}
                    className={cn("py-1.5 px-2 cursor-pointer", 
                      isSelected && "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <ModelIcon modelKey={modelKey} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm truncate">
                            {getCleanModelName(model.label)}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {getProviderName(modelKey)}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        
        <CardContent className="p-3 text-xs text-muted-foreground">
          {selectedModel.description}
        </CardContent>
      </Card>
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