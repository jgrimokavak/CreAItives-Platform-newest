import React from "react";
import { modelCatalog, type ModelKey } from "@/lib/modelCatalog";
import { getModelColors } from "@/lib/modelColors";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { IconBrain, IconBolt, IconCpu } from "lucide-react";

// Icons for different AI model providers
const ProviderIcon = ({ provider }: { provider: string }) => {
  switch(provider.toLowerCase()) {
    case 'openai':
      return <IconBrain className="h-5 w-5" />;
    case 'google':
      return <IconBolt className="h-5 w-5" />;
    case 'black forest labs':
    case 'black-forest-labs':
      return <IconCpu className="h-5 w-5" />;
    default:
      return <IconBrain className="h-5 w-5" />;
  }
};

// Get the provider name from the model key
const getProviderFromModelKey = (modelKey: ModelKey): string => {
  if (modelKey === 'gpt-image-1') return 'OpenAI';
  if (modelKey === 'imagen-3') return 'Google';
  if (modelKey === 'flux-pro') return 'Black Forest Labs';
  return 'AI Provider';
};

interface ModelInfoCardProps {
  modelKey: ModelKey;
  className?: string;
}

export default function ModelInfoCard({ modelKey, className }: ModelInfoCardProps) {
  // Get model metadata
  const model = modelCatalog[modelKey];
  
  // Get color theme for the model provider
  const colors = getModelColors(modelKey);
  
  // Get provider name
  const provider = getProviderFromModelKey(modelKey);
  
  if (!model) return null;
  
  // Extract model name (without provider)
  const modelName = model.label.split(' (')[0];

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all mb-5",
        className
      )}
      style={{
        borderColor: colors.light,
        borderWidth: '1px',
      }}
    >
      <div 
        className="py-2 px-4 flex items-center justify-between"
        style={{ 
          backgroundColor: colors.bg,
          borderBottom: `1px solid ${colors.light}` 
        }}
      >
        <div className="flex items-center">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
            style={{ 
              backgroundColor: colors.light,
              color: 'white' 
            }}
          >
            <ProviderIcon provider={provider} />
          </div>
          <div>
            <h3 
              className="font-semibold text-sm leading-tight"
              style={{ color: colors.medium }}
            >
              {modelName}
            </h3>
            <p className="text-xs opacity-80">{provider}</p>
          </div>
        </div>
      </div>
      
      <CardContent className="pt-3 pb-4">
        <p className="text-xs text-muted-foreground">{model.description}</p>
      </CardContent>
    </Card>
  );
}