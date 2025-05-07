import { Combobox } from "@/components/ui/combobox";

// Interface for prompt suggestions
export interface PromptSuggestions {
  imageTypes: string[];
  cameraPositions: string[];
  lightingStyles: string[];
  colorPalettes: string[];
}

// Default empty suggestions
export const emptySuggestions: PromptSuggestions = {
  imageTypes: [],
  cameraPositions: [],
  lightingStyles: [],
  colorPalettes: []
};

interface PromptDropdownsProps {
  suggestions: PromptSuggestions;
  onChange: (field: keyof PromptSuggestions, value: string) => void;
  isLoading?: boolean;
}

export function PromptDropdowns({ 
  suggestions, 
  onChange, 
  isLoading = false 
}: PromptDropdownsProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4 mt-4">
      <Combobox 
        label="Image Type" 
        options={suggestions.imageTypes} 
        onSelect={v => onChange("imageTypes", v)} 
        isLoading={isLoading}
      />
      <Combobox 
        label="Camera Position" 
        options={suggestions.cameraPositions} 
        onSelect={v => onChange("cameraPositions", v)} 
        isLoading={isLoading}
      />
      <Combobox 
        label="Lighting Style" 
        options={suggestions.lightingStyles} 
        onSelect={v => onChange("lightingStyles", v)} 
        isLoading={isLoading}
      />
      <Combobox 
        label="Color Palette" 
        options={suggestions.colorPalettes} 
        onSelect={v => onChange("colorPalettes", v)}
        isLoading={isLoading} 
      />
    </div>
  );
}