import React from "react";
import { Check, Brain, Zap, Cpu } from "lucide-react";
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

// Provider component with icons and provider names
const ProviderInfo = ({ provider, version }: { provider: string; version?: string }) => {
  const getIcon = () => {
    switch(provider.toLowerCase()) {
      case 'openai':
        return <Brain className="h-4 w-4" />;
      case 'google':
        return <Zap className="h-4 w-4" />;
      case 'black forest labs':
      case 'black-forest-labs':
        return <Cpu className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      {getIcon()}
      <span>{provider}</span>
      {version && <span className="opacity-70">• {version}</span>}
    </div>
  );
};

// Get provider name from model key
const getProviderFromModelKey = (modelKey: ModelKey): string => {
  if (modelKey === 'gpt-image-1') return 'OpenAI';
  if (modelKey === 'imagen-4') return 'Google';
  if (modelKey === 'imagen-3') return 'Google';
  if (modelKey === 'flux-pro') return 'Black Forest Labs';
  return 'AI Provider';
};

// Get model version from the model key
const getModelVersion = (modelKey: ModelKey): string => {
  if (modelKey === 'imagen-4') return '4.0';
  if (modelKey === 'imagen-3') return '3.0';
  if (modelKey === 'flux-pro') return '1.1';
  if (modelKey === 'gpt-image-1') return '1.0';
  return '';
};

interface AIModelSelectorProps {
  value: ModelKey;
  onChange: (value: ModelKey) => void;
  className?: string;
}

export default function AIModelSelector({ value, onChange, className }: AIModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  
  // Get current model data
  const selectedModel = modelCatalog[value];
  const modelColors = getModelColors(value);
  const provider = getProviderFromModelKey(value);
  const version = getModelVersion(value);

  // Extract just the model name without provider
  const displayName = selectedModel.label.split(' (')[0];

  return (
    <div className={cn("space-y-4", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between px-3 py-6 border-2 transition-all rounded-xl relative group"
            style={{
              borderColor: modelColors.light,
              backgroundColor: modelColors.bg + '60',
            }}
          >
            <div className="flex flex-col items-start text-left gap-1 w-full">
              <div className="flex items-center gap-2 w-full">
                {/* Model badge */}
                <Badge 
                  className="rounded-md px-2 py-0.5 text-xs font-semibold" 
                  style={{
                    backgroundColor: modelColors.light,
                    color: "white"
                  }}
                >
                  {displayName}
                </Badge>
                
                {/* Provider info */}
                <ProviderInfo provider={provider} version={version} />
                
                {/* Select indicator - show on far right */}
                <div className="ml-auto opacity-60">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 8.5L2 4.5H10L6 8.5Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {selectedModel.description}
              </p>
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
                  const modelProvider = getProviderFromModelKey(modelKey);
                  const modelVersion = getModelVersion(modelKey);
                  // Get just the model name without the provider in parentheses
                  const name = model.label.split(' (')[0];
                  
                  return (
                    <CommandItem
                      key={modelKey}
                      value={modelKey}
                      onSelect={() => {
                        onChange(modelKey);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-start gap-2 py-3 px-3 cursor-pointer hover:bg-muted/80 transition-colors",
                        value === modelKey && "bg-muted/50"
                      )}
                    >
                      {/* Color accent bar */}
                      <div 
                        className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" 
                        style={{ backgroundColor: colors.light }}
                      />
                      
                      <div className="flex flex-col gap-1 flex-grow">
                        <div className="flex items-center justify-between">
                          {/* Model name */}
                          <div className="font-medium text-sm">{name}</div>
                          
                          {/* Selection indicator */}
                          {value === modelKey && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        
                        {/* Provider and version info */}
                        <ProviderInfo provider={modelProvider} version={modelVersion} />
                        
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