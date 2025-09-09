import React, { useState } from 'react';
import { Check, ChevronDown, Sparkles, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VIDEO_MODELS } from '@/config/models';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

// Get provider name from model id
const getProviderName = (modelId: string): string => {
  if (modelId === 'hailuo-02') return 'Minimax';
  if (modelId === 'kling-v2.1') return 'Kling';
  return 'Unknown';
};

// Get model version label (only show if actually relevant)
const getVersionLabel = (modelId: string): string => {
  // Only show versions that are actually meaningful
  switch (modelId) {
    case 'hailuo-02': return 'v2'; // This is part of the actual model name
    case 'kling-v2.1': return 'v2.1'; // Kling model version
    default: return '';
  }
};

// Get feature highlight
const getFeatureHighlight = (modelId: string): string => {
  const model = VIDEO_MODELS.find(m => m.id === modelId);
  if (!model?.badges || model.badges.length === 0) return '';
  return model.badges[0]; // Use first badge as feature highlight
};

// Get model colors based on provider
const getModelColors = (modelId: string) => {
  const provider = getProviderName(modelId);
  switch (provider) {
    case 'Minimax':
      return {
        primary: 'bg-gradient-to-r from-purple-500 to-blue-500',
        light: 'bg-purple-50 border-purple-200 text-purple-700',
        text: 'text-purple-600'
      };
    case 'Kling':
      return {
        primary: 'bg-gradient-to-r from-orange-500 to-red-500',
        light: 'bg-orange-50 border-orange-200 text-orange-700',
        text: 'text-orange-600'
      };
    default:
      return {
        primary: 'bg-gradient-to-r from-gray-500 to-gray-600',
        light: 'bg-gray-50 border-gray-200 text-gray-700',
        text: 'text-gray-600'
      };
  }
};

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  
  // Get selected model data
  const selectedModel = VIDEO_MODELS.find(m => m.id === value);
  if (!selectedModel) return null;

  const colors = getModelColors(value);
  const modelName = selectedModel.name;
  const version = getVersionLabel(value);
  const provider = getProviderName(value);
  const featureHighlight = getFeatureHighlight(value);

  return (
    <div className="w-full">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabled}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-200 text-left",
              "hover:shadow-md focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none",
              disabled ? "opacity-50 cursor-not-allowed bg-muted" : "bg-background hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Model Icon */}
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium", colors.primary)}>
                <Sparkles className="w-4 h-4" />
              </div>
              
              {/* Model Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {modelName}
                  </span>
                  {version && (
                    <span className={cn("px-2 py-0.5 text-xs rounded-md font-medium", colors.light)}>
                      {version}
                    </span>
                  )}

                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{provider}</span>
                  {featureHighlight && (
                    <>
                      <span>•</span>
                      <span className={colors.text}>{featureHighlight}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Dropdown Arrow */}
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-full min-w-[500px] max-w-[700px] p-3" align="start">
          {VIDEO_MODELS.map((model) => {
            const isSelected = model.id === value;
            const modelColors = getModelColors(model.id);
            const modelVersion = getVersionLabel(model.id);
            const modelProvider = getProviderName(model.id);
            const modelFeature = getFeatureHighlight(model.id);

            return (
              <DropdownMenuItem
                key={model.id}
                onClick={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-start gap-4 px-4 py-4 cursor-pointer rounded-lg transition-colors",
                  "hover:bg-muted/70 focus:bg-muted/70",
                  isSelected && "bg-primary/10 hover:bg-primary/15 focus:bg-primary/15"
                )}
              >
                {/* Model Icon */}
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0", modelColors.primary)}>
                  <Sparkles className="w-5 h-5" />
                </div>

                {/* Model Details */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-base text-foreground">
                      {model.name}
                    </span>
                    {modelVersion && (
                      <span className={cn("px-2 py-1 text-xs rounded-md font-medium", modelColors.light)}>
                        {modelVersion}
                      </span>
                    )}
                  </div>
                  
                  {/* Provider and feature */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>{modelProvider}</span>
                    {modelFeature && (
                      <>
                        <span>•</span>
                        <span className={modelColors.text}>{modelFeature}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {model.summary}
                  </p>
                  
                </div>

                {/* Selection Check */}
                {isSelected && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}