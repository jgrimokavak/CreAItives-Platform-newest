import React from "react";
import { Check, Brain, Zap, Cpu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { modelCatalog, type ModelKey } from "@/lib/modelCatalog";
import { getModelColors } from "@/lib/modelColors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Get provider name from model key - simplified to reduce duplication
const getProviderName = (modelKey: ModelKey): string => {
  if (modelKey === "gpt-image-1") return "OpenAI";
  if (modelKey.startsWith("imagen-")) return "Google";
  if (modelKey === "flux-pro") return "Black Forest Labs";
  return "AI";
};

// Get model version label
const getVersionLabel = (modelKey: ModelKey): string => {
  switch(modelKey) {
    case "imagen-4": return "v4";
    case "imagen-3": return "v3";
    case "flux-pro": return "v1.1";
    case "gpt-image-1": return "v1";
    default: return "";
  }
};

// Clean model name - removes the provider in parentheses
const getModelName = (modelKey: ModelKey): string => {
  const fullName = modelCatalog[modelKey].label;
  return fullName.split(" (")[0];
};

// Model-specific feature highlight
const getFeatureHighlight = (modelKey: ModelKey): string => {
  switch(modelKey) {
    case "gpt-image-1": return "Most accurate";
    case "imagen-4": return "Best quality";
    case "imagen-3": return "Balanced";
    case "flux-pro": return "Fast, creative";
    default: return "";
  }
};

interface AIModelSelectorProps {
  value: ModelKey;
  onChange: (value: ModelKey) => void;
  className?: string;
}

export default function AIModelSelector({ value, onChange, className }: AIModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  
  // Get selected model data
  const colors = getModelColors(value);
  const modelName = getModelName(value);
  const version = getVersionLabel(value);
  const provider = getProviderName(value);
  const description = modelCatalog[value].description;
  
  return (
    <div className={className}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div 
            className="rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-sm focus:outline-none focus:ring-[3px] focus:ring-offset-2"
            style={{ 
              borderColor: open ? colors.light : "rgba(var(--border))",
              borderWidth: open ? "1.5px" : "1px",
              boxShadow: open ? `0 0 0 3px ${colors.light}40` : "none"
            }}
          >
            {/* Card header with model info */}
            <div 
              className="p-3 flex items-center justify-between gap-2 transition-colors"
              style={{ 
                backgroundColor: open ? `${colors.bg}80` : `${colors.bg}20`
              }}
            >
              {/* Left side: Model icon and name */}
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: colors.light }}
                >
                  {value === "gpt-image-1" ? (
                    <Brain className="h-4 w-4 text-white" />
                  ) : value.startsWith("imagen") ? (
                    <Zap className="h-4 w-4 text-white" />
                  ) : (
                    <Cpu className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{modelName}</span>
                    {version && (
                      <span 
                        className="px-1.5 py-0.5 text-[10px] rounded-sm font-medium"
                        style={{ 
                          backgroundColor: `${colors.bg}80`,
                          color: colors.medium 
                        }}
                      >
                        {version}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{provider}</span>
                </div>
              </div>
              
              {/* Right side: Feature highlight and dropdown indicator */}
              <div className="flex items-center gap-2">
                <span 
                  className="text-xs hidden sm:block"
                  style={{ color: colors.medium }}
                >
                  {getFeatureHighlight(value)}
                </span>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    open && "transform rotate-180"
                  )}
                />
              </div>
            </div>
            
            {/* Description */}
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {description}
            </div>
          </div>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="start" 
          className="w-[min(300px,calc(100vw-2rem))]"
        >
          {Object.entries(modelCatalog).map(([key, info]) => {
            const modelKey = key as ModelKey;
            const isSelected = value === modelKey;
            const modelColors = getModelColors(modelKey);
            const modelVersion = getVersionLabel(modelKey);
            
            return (
              <DropdownMenuItem
                key={modelKey}
                className={cn(
                  "p-2.5 cursor-pointer focus:bg-muted",
                  isSelected && "bg-muted"
                )}
                onClick={() => onChange(modelKey)}
              >
                <div className="flex items-center w-full gap-2">
                  {/* Model color indicator */}
                  <div 
                    className="w-1 h-full min-h-[2rem] rounded-full"
                    style={{ backgroundColor: modelColors.light }}
                  />
                  
                  {/* Icon and name */}
                  <div 
                    className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: modelColors.light }}
                  >
                    {modelKey === "gpt-image-1" ? (
                      <Brain className="h-3.5 w-3.5 text-white" />
                    ) : modelKey.startsWith("imagen") ? (
                      <Zap className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Cpu className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">
                          {getModelName(modelKey)}
                        </span>
                        {modelVersion && (
                          <span 
                            className="px-1 py-0.5 text-[10px] rounded-sm font-medium"
                            style={{ 
                              backgroundColor: `${modelColors.bg}80`,
                              color: modelColors.medium 
                            }}
                          >
                            {modelVersion}
                          </span>
                        )}
                      </div>
                      
                      {isSelected && (
                        <Check 
                          className="h-4 w-4 mr-1"
                          style={{ color: modelColors.medium }}
                        />
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {getProviderName(modelKey)}
                      </span>
                      <span 
                        className="text-xs"
                        style={{ color: modelColors.medium }}
                      >
                        {getFeatureHighlight(modelKey)}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}