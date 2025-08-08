import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Sparkles, Star } from 'lucide-react';
import { VIDEO_MODELS, type ModelDef } from '@/config/models';

interface ModelSelectorProps {
  value: string;                         // current selected model id
  onChange: (modelId: string) => void;   // call when selection changes
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled = false }: ModelSelectorProps) {
  const [focusedModelId, setFocusedModelId] = useState<string | null>(null);
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current || disabled) return;
      
      const modelIds = VIDEO_MODELS.map(m => m.id);
      const currentIndex = focusedModelId ? modelIds.indexOf(focusedModelId) : -1;
      
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex = currentIndex < modelIds.length - 1 ? currentIndex + 1 : 0;
          setFocusedModelId(modelIds[nextIndex]);
          break;
          
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : modelIds.length - 1;
          setFocusedModelId(modelIds[prevIndex]);
          break;
          
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedModelId) {
            onChange(focusedModelId);
          }
          break;
          
        case 'Escape':
          e.preventDefault();
          setFocusedModelId(null);
          break;
      }
    };
    
    if (focusedModelId) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [focusedModelId, onChange, disabled]);

  const toggleDetails = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedModels(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
  };

  const handleModelSelect = (model: ModelDef) => {
    if (disabled) return;
    onChange(model.id);
    setFocusedModelId(null);
  };

  return (
    <div 
      ref={containerRef}
      className="space-y-3"
      role="radiogroup"
      aria-label="Select AI Model"
    >
      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
        {VIDEO_MODELS.map((model) => {
          const isSelected = value === model.id;
          const isFocused = focusedModelId === model.id;
          const isExpanded = expandedModels[model.id];
          
          return (
            <Card
              key={model.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-lg bg-primary/5' 
                  : 'hover:ring-1 hover:ring-border'
              } ${
                isFocused ? 'ring-2 ring-primary/50' : ''
              } ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handleModelSelect(model)}
              onFocus={() => setFocusedModelId(model.id)}
              onBlur={(e) => {
                // Only remove focus if not clicking within the card
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setFocusedModelId(null);
                }
              }}
              tabIndex={disabled ? -1 : 0}
              role="radio"
              aria-checked={isSelected}
              aria-describedby={`model-${model.id}-description`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header with name and badges */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{model.name}</h4>
                      {model.recommended && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Recommended</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {isSelected && (
                        <Sparkles className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    
                    <p 
                      id={`model-${model.id}-description`}
                      className="text-xs text-muted-foreground leading-relaxed"
                    >
                      {model.summary}
                    </p>
                  </div>
                  
                  {model.sampleThumbUrl && (
                    <div className="w-12 h-12 rounded-md bg-muted/50 flex items-center justify-center ml-3">
                      <img 
                        src={model.sampleThumbUrl} 
                        alt={`${model.name} sample`}
                        className="w-10 h-10 rounded object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Badges */}
                {model.badges && model.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {model.badges.map((badge, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs px-2 py-0.5"
                      >
                        {badge}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Expandable details */}
                {model.details && model.details.length > 0 && (
                  <Collapsible open={isExpanded} onOpenChange={(open) => {
                    setExpandedModels(prev => ({
                      ...prev,
                      [model.id]: open
                    }));
                  }}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-xs h-6 px-0 hover:bg-transparent"
                        onClick={(e) => toggleDetails(model.id, e)}
                      >
                        <span className="text-muted-foreground">
                          {isExpanded ? 'Less details' : 'More details'}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pt-2">
                      <ul className="space-y-1">
                        {model.details.map((detail, index) => (
                          <li 
                            key={index}
                            className="text-xs text-muted-foreground flex items-start gap-1"
                          >
                            <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/50 mt-1.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Accessibility hint - only show with multiple models */}
      {VIDEO_MODELS.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Use arrow keys to navigate, Enter or Space to select
        </p>
      )}
    </div>
  );
}