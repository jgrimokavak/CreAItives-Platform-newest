import React from "react";
import { Check, Brain, Zap, Cpu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { modelCatalog, type ModelKey } from "@/lib/modelCatalog";
import { getModelColors } from "@/lib/modelColors";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Model icon component based on provider
const ModelIcon = ({ modelKey }: { modelKey: ModelKey }) => {
  const colors = getModelColors(modelKey);
  let Icon;
  
  if (modelKey === "gpt-image-1") {
    Icon = Brain;
  } else if (modelKey.startsWith("imagen-")) {
    Icon = Zap;
  } else {
    Icon = Cpu;
  }
  
  return (
    <div 
      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" 
      style={{ backgroundColor: colors.light }}
    >
      <Icon className="h-3.5 w-3.5 text-white" />
    </div>
  );
};

// Version badge component
const VersionBadge = ({ modelKey }: { modelKey: ModelKey }) => {
  let version = "";
  
  // Assign appropriate version based on model
  if (modelKey === "imagen-4") version = "4";
  else if (modelKey === "imagen-3") version = "3";
  else if (modelKey === "flux-pro") version = "1.1";
  else if (modelKey === "gpt-image-1") version = "1";
  
  // Only show if we have a version
  if (!version) return null;
  
  return (
    <Badge variant="outline" className="text-[10px] h-4 px-1 border-muted-foreground/30 text-muted-foreground font-normal">
      v{version}
    </Badge>
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
  const [open, setOpen] = React.useState(false);
  
  // Get selected model data
  const selectedModel = modelCatalog[value];
  const modelColors = getModelColors(value);
  const provider = getProviderName(value);
  const displayName = getCleanModelName(selectedModel.label);
  
  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between transition-all rounded-lg group"
            style={{
              borderColor: modelColors.light,
              backgroundColor: `${modelColors.bg}80`, // 50% opacity
            }}
          >
            <div className="flex items-center gap-2.5 w-full py-0.5">
              {/* Model icon */}
              <ModelIcon modelKey={value} />
              
              {/* Model info */}
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm">{displayName}</span>
                  <VersionBadge modelKey={value} />
                </div>
                <span className="text-xs text-muted-foreground">{provider}</span>
              </div>
              
              {/* Description for larger screens */}
              <p className="text-xs text-muted-foreground ml-4 line-clamp-1 flex-grow hidden sm:block">
                {selectedModel.description}
              </p>
              
              {/* Dropdown indicator */}
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-auto" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="p-0 w-[min(calc(100vw-1rem),350px)]" align="start">
          <Command>
            <CommandInput placeholder="Search AI models..." />
            <CommandList>
              <CommandEmpty>No models found.</CommandEmpty>
              <CommandGroup>
                {Object.entries(modelCatalog).map(([key, model]) => {
                  const modelKey = key as ModelKey;
                  const colors = getModelColors(modelKey);
                  const modelProvider = getProviderName(modelKey);
                  const name = getCleanModelName(model.label);
                  
                  return (
                    <CommandItem
                      key={modelKey}
                      value={modelKey}
                      onSelect={() => {
                        onChange(modelKey);
                        setOpen(false);
                      }}
                      className="flex items-start gap-3 py-2.5 cursor-pointer"
                    >
                      {/* Model icon with proper color */}
                      <ModelIcon modelKey={modelKey} />
                      
                      <div className="flex flex-col gap-0.5 flex-grow min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          {/* Model name with version */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-sm truncate">{name}</span>
                            <VersionBadge modelKey={modelKey} />
                          </div>
                          
                          {/* Selection indicator */}
                          {value === modelKey && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        
                        {/* Provider */}
                        <span className="text-xs text-muted-foreground">{modelProvider}</span>
                        
                        {/* Description */}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{model.description}</p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}