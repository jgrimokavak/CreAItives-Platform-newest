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

// Helper functions
const getProvider = (modelKey: ModelKey): string => {
  if (modelKey === "gpt-image-1") return "OpenAI";
  if (modelKey.startsWith("imagen-")) return "Google";
  if (modelKey === "flux-pro") return "Black Forest Labs";
  return "AI";
};

const getModelName = (modelKey: ModelKey): string => {
  return modelCatalog[modelKey].label.split(" (")[0];
};

const getVersionBadge = (modelKey: ModelKey): string => {
  switch(modelKey) {
    case "imagen-4": return "v4";
    case "imagen-3": return "v3"; 
    case "flux-pro": return "v1.1";
    case "gpt-image-1": return "v1";
    default: return "";
  }
};

const getFeature = (modelKey: ModelKey): string => {
  switch(modelKey) {
    case "gpt-image-1": return "Most accurate";
    case "imagen-4": return "Best quality";
    case "imagen-3": return "Balanced";
    case "flux-pro": return "Fast, creative";
    default: return "";
  }
};

// Model icon component
const ModelIcon = ({ modelKey }: { modelKey: ModelKey }) => {
  const colors = getModelColors(modelKey);
  
  return (
    <div 
      className="w-8 h-8 rounded-md flex items-center justify-center"
      style={{ backgroundColor: colors.light }}
    >
      {modelKey === "gpt-image-1" ? (
        <Brain className="h-4 w-4 text-white" />
      ) : modelKey.startsWith("imagen") ? (
        <Zap className="h-4 w-4 text-white" />
      ) : (
        <Cpu className="h-4 w-4 text-white" />
      )}
    </div>
  );
};

interface AIModelSelectorProps {
  value: ModelKey;
  onChange: (value: ModelKey) => void;
  className?: string;
}

export default function AIModelSelector({ value, onChange, className }: AIModelSelectorProps) {
  const colors = getModelColors(value);
  const description = modelCatalog[value].description;
  
  return (
    <div className={className}>
      <div className="rounded-lg border overflow-hidden bg-card">
        {/* Model info header */}
        <div 
          className="p-3 flex items-center gap-3 border-b transition-colors"
          style={{ 
            backgroundColor: `${colors.bg}50`,
            borderColor: colors.light + "50"
          }}
        >
          <ModelIcon modelKey={value} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">{getModelName(value)}</span>
                <span 
                  className="px-1.5 py-0.5 text-[10px] rounded-sm font-medium"
                  style={{ 
                    backgroundColor: `${colors.bg}80`,
                    color: colors.medium 
                  }}
                >
                  {getVersionBadge(value)}
                </span>
              </div>
              
              <Select 
                value={value} 
                onValueChange={(val: ModelKey) => onChange(val)}
              >
                <SelectTrigger
                  className="h-7 px-2 min-w-0 w-auto text-xs bg-transparent border-muted hover:bg-muted/50 rounded focus:ring-0 focus:ring-offset-0"
                >
                  <SelectValue placeholder="Change">
                    <span className="flex items-center gap-1.5">
                      <span>Change</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </span>
                  </SelectValue>
                </SelectTrigger>
                
                <SelectContent>
                  {Object.entries(modelCatalog).map(([key, model]) => {
                    const modelKey = key as ModelKey;
                    const modelColors = getModelColors(modelKey);
                    
                    return (
                      <SelectItem 
                        key={modelKey} 
                        value={modelKey}
                        className="py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          {/* Color bar indicator */}
                          <div 
                            className="w-1 h-full self-stretch rounded-full"
                            style={{ backgroundColor: modelColors.light }}
                          />
                          
                          {/* Icon */}
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ backgroundColor: modelColors.light }}
                          >
                            {modelKey === "gpt-image-1" ? (
                              <Brain className="h-3 w-3 text-white" />
                            ) : modelKey.startsWith("imagen") ? (
                              <Zap className="h-3 w-3 text-white" />
                            ) : (
                              <Cpu className="h-3 w-3 text-white" />
                            )}
                          </div>
                          
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm">
                              {getModelName(modelKey)}
                            </span>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{getProvider(modelKey)}</span>
                              <span 
                                className="ml-2"
                                style={{ color: modelColors.medium }}
                              >
                                {getFeature(modelKey)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {getProvider(value)}
              </span>
              <span 
                className="text-xs"
                style={{ color: colors.medium }}
              >
                {getFeature(value)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Description */}
        <div className="p-3 text-xs text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  );
}